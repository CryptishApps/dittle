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

export const DETECT_PROMPT_VERSION = "v3";

export type KnownVariable = { name: string; value: string; note: string };

const INSTRUCTIONS = `You read one paragraph from someone's notes and list the concrete values in it: amounts of money, counts, other numbers and measurements, dates and times, durations, percentages, and the names of people and places.

For each value give:
- "quote": only the value itself, copied exactly from the paragraph. Keep a currency sign or unit attached to it (£38, 250g, 45 minutes, 14 June). Leave out the thing being counted and the words around it: "80 guests" gives "80", "£38 a head" gives "£38", "£182 return" gives "£182".
- "kind": money, count, number, date, duration, percent, person or place.
- "name": a short snake_case name for what the value means.
- "existing": the name of a known variable only if this value is about that same thing in the same context: the same value, or the paragraph says the value has changed ("now 95 guests, not 80" for the wedding guest count). A value from a different topic, or a different date, price or count, is "none".

"requests": sentences that ask you to write or add content into the note at that spot, such as "add a list of meals here", copied exactly. Reminders and to-dos for the person, such as "call the florist" or "ask about the menu", are not requests. A request is never also a value.

Ordinary words are never values. If there are no values, return an empty list.

Example
Known variables:
- guest_count = 80 (Wedding: catering)
- wedding_date = 14 June (Wedding: venue)
Paragraph: Dinner for 12 people on 3 May with Ana at Casa Lola, about £30 each. Add a shopping list here.
Answer: {"values":[{"quote":"12","kind":"count","name":"dinner_guests","existing":"none"},{"quote":"3 May","kind":"date","name":"dinner_date","existing":"none"},{"quote":"Ana","kind":"person","name":"host","existing":"none"},{"quote":"Casa Lola","kind":"place","name":"restaurant","existing":"none"},{"quote":"£30","kind":"money","name":"price_per_person","existing":"none"}],"requests":["Add a shopping list here."]}`;

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

export function createDetector(mode: InferenceMode, known: KnownVariable[]): Detector {
  const names = known.map((variable) => variable.name);
  const model = getGenerativeModel(ai, params(mode, names));
  const cloud = mode === InferenceMode.ONLY_IN_CLOUD ? model : getGenerativeModel(ai, params(InferenceMode.ONLY_IN_CLOUD, names));
  const listed = known.length ? known.map((variable) => `- ${variable.name} = ${variable.value} (${variable.note})`).join("\n") : "none";
  const prompt = (paragraph: string) => `Known variables:\n${listed}\n\nParagraph:\n${paragraph}`;

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
  const values = Array.isArray(record.values)
    ? record.values.filter(isValue).map((value) => ({ ...value, quote: value.quote.trim() })).filter((value) => value.quote.length > 0)
    : [];
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
