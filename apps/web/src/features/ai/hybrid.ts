import { AIError, getGenerativeModel, InferenceMode, type GenerativeModel, type HybridParams, type LanguageModelPromptOptions } from "firebase/ai";
import { ai, CLOUD_MODEL } from "@/lib/ai";
import { recordCall } from "./usage";

export type InferenceWhere = "on_device" | "in_cloud";

export type HybridAnswer = { text: string; where: InferenceWhere; ms: number; fallbackReason?: string };

export type Hybrid = {
  model: GenerativeModel;
  ask: (prompt: string) => Promise<HybridAnswer>;
};

type ChromePromptOptions = LanguageModelPromptOptions & { omitResponseConstraintInput: boolean };

const TEXT_EN = [{ type: "text" as const, languages: ["en"] }];

function params(mode: InferenceMode, instructions: string, schema: Record<string, unknown>): HybridParams {
  const promptOptions: ChromePromptOptions = { responseConstraint: schema, omitResponseConstraintInput: true };
  return {
    mode,
    onDeviceParams: {
      createOptions: {
        expectedInputs: TEXT_EN,
        expectedOutputs: TEXT_EN,
        initialPrompts: [{ role: "system", content: [{ type: "text", value: instructions }] }],
      },
      promptOptions,
    },
    inCloudParams: {
      model: CLOUD_MODEL,
      systemInstruction: instructions,
      generationConfig: { responseMimeType: "application/json", responseJsonSchema: schema, temperature: 0 },
    },
  };
}

const CALL_TIMEOUT_MS = 30_000;

export function createHybrid(task: string, mode: InferenceMode, instructions: string, schema: Record<string, unknown>): Hybrid {
  const model = getGenerativeModel(ai, params(mode, instructions, schema));
  const cloud = mode === InferenceMode.ONLY_IN_CLOUD ? model : getGenerativeModel(ai, params(InferenceMode.ONLY_IN_CLOUD, instructions, schema));
  let queue: Promise<unknown> = Promise.resolve();

  const run = async (target: GenerativeModel, prompt: string): Promise<HybridAnswer> => {
    const started = performance.now();
    let timer: number | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = window.setTimeout(() => reject(new Error(`${task} took longer than ${CALL_TIMEOUT_MS / 1000} s`)), CALL_TIMEOUT_MS);
    });
    const result = await Promise.race([target.generateContent(prompt), timeout]).finally(() => window.clearTimeout(timer));
    return { text: result.response.text(), where: result.response.inferenceSource ?? "in_cloud", ms: Math.round(performance.now() - started) };
  };

  const attempt = async (prompt: string): Promise<HybridAnswer> => {
    try {
      return await run(model, prompt);
    } catch (error) {
      if (mode !== InferenceMode.PREFER_ON_DEVICE || error instanceof AIError) throw error;
      const fallback = await run(cloud, prompt);
      return { ...fallback, fallbackReason: error instanceof Error ? error.message : String(error) };
    }
  };

  const answer = async (prompt: string): Promise<HybridAnswer> => {
    const result = await attempt(prompt);
    recordCall({ task, where: result.where, ms: result.ms, at: Date.now() });
    return result;
  };

  return {
    model,
    ask: (prompt) => {
      const next = queue.then(() => answer(prompt));
      queue = next.catch(() => undefined);
      return next;
    },
  };
}

const TEMPORARY_STATUS = new Set([429, 500, 503]);

export function isTemporary(error: unknown): boolean {
  return error instanceof AIError && TEMPORARY_STATUS.has(error.customErrorData?.status ?? 0);
}
