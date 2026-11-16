import { AIError, getGenerativeModel, InferenceMode, type GenerativeModel, type HybridParams } from "firebase/ai";
import { ai, CLOUD_MODEL } from "@/lib/ai";

export const VALUE_KINDS = ["money", "count", "number", "date", "duration", "percent", "person", "place"] as const;
export type ValueKind = (typeof VALUE_KINDS)[number];

export type DetectedValue = { quote: string; kind: ValueKind; name: string; existing: string };
export type InferenceWhere = "on_device" | "in_cloud";

export type DetectResult = {
  values: DetectedValue[];
  requests: string[];
  where: InferenceWhere;
  ms: number;
  fallbackReason?: string;
};

const INSTRUCTIONS = `You read one paragraph from someone's personal notes and list the facts in it that could also appear in their other notes and might change later.

Return JSON with two lists.

"values": each fact in the paragraph.
- "quote": the value exactly as written in the paragraph, copied character for character. Include a currency sign or unit that is attached to it ("£38", "250g", "3 weeks"), but not the noun it counts ("80", not "80 guests").
- "kind": money, count (how many of something), number (other quantities and measurements), date (dates, days and times), duration, percent, person or place.
- "name": a short snake_case name for what the value means, such as guest_count or flight_cost.
- "existing": if the value means the same thing as one of the existing variable names you are given, that name. Otherwise "none".
Skip anything that isn't a concrete fact. If there are none, return an empty list.

"requests": sentences in the paragraph that ask for something to be written or added into the note, such as "add in a list of meals here". Copy them exactly. Usually there are none.`;

const TEXT_EN = [{ type: "text" as const, languages: ["en"] }];

function schema(existing: string[]) {
  return {
    type: "object",
    properties: {
      values: {
        type: "array",
        items: {
          type: "object",
          properties: {
            quote: { type: "string" },
            kind: { type: "string", enum: [...VALUE_KINDS] },
            name: { type: "string" },
            existing: { type: "string", enum: [...existing, "none"] },
          },
          required: ["quote", "kind", "name", "existing"],
        },
      },
      requests: { type: "array", items: { type: "string" } },
    },
    required: ["values", "requests"],
  };
}

function params(mode: InferenceMode, existing: string[]): HybridParams {
  const responseSchema = schema(existing);
  return {
    mode,
    onDeviceParams: {
      createOptions: {
        expectedInputs: TEXT_EN,
        expectedOutputs: TEXT_EN,
        initialPrompts: [{ role: "system", content: [{ type: "text", value: INSTRUCTIONS }] }],
      },
      promptOptions: { responseConstraint: responseSchema },
    },
    inCloudParams: {
      model: CLOUD_MODEL,
      systemInstruction: INSTRUCTIONS,
      generationConfig: { responseMimeType: "application/json", responseJsonSchema: responseSchema, temperature: 0 },
    },
  };
}

export type Detector = {
  model: GenerativeModel;
  detect: (paragraph: string) => Promise<DetectResult>;
};

export function createDetector(mode: InferenceMode, existing: string[]): Detector {
  const model = getGenerativeModel(ai, params(mode, existing));
  const cloud = mode === InferenceMode.ONLY_IN_CLOUD ? model : getGenerativeModel(ai, params(InferenceMode.ONLY_IN_CLOUD, existing));
  const prompt = (paragraph: string) => `Existing variable names: ${existing.join(", ") || "none"}\n\nParagraph:\n${paragraph}`;

  const run = async (target: GenerativeModel, paragraph: string): Promise<DetectResult> => {
    const started = performance.now();
    const result = await target.generateContent(prompt(paragraph));
    const ms = Math.round(performance.now() - started);
    const parsed = parse(result.response.text());
    return { ...parsed, where: result.response.inferenceSource ?? "in_cloud", ms };
  };

  return {
    model,
    detect: async (paragraph) => {
      try {
        return await run(model, paragraph);
      } catch (error) {
        if (mode !== InferenceMode.PREFER_ON_DEVICE || error instanceof AIError) throw error;
        const fallback = await run(cloud, paragraph);
        return { ...fallback, fallbackReason: error instanceof Error ? error.message : String(error) };
      }
    },
  };
}

export function isRateLimited(error: unknown): boolean {
  return error instanceof AIError && error.customErrorData?.status === 429;
}

function parse(text: string): Pick<DetectResult, "values" | "requests"> {
  const data: unknown = JSON.parse(text);
  if (typeof data !== "object" || data === null) throw new Error("Detect returned something other than an object.");
  const record = data as { values?: unknown; requests?: unknown };
  const values = Array.isArray(record.values) ? record.values.filter(isValue) : [];
  const requests = Array.isArray(record.requests) ? record.requests.filter((item): item is string => typeof item === "string") : [];
  return { values, requests };
}

function isValue(item: unknown): item is DetectedValue {
  if (typeof item !== "object" || item === null) return false;
  const value = item as Record<string, unknown>;
  return (
    typeof value.quote === "string" &&
    typeof value.name === "string" &&
    typeof value.existing === "string" &&
    VALUE_KINDS.includes(value.kind as ValueKind)
  );
}
