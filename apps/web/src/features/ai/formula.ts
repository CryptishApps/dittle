import { InferenceMode } from "firebase/ai";
import { createHybrid } from "./hybrid";

export const FORMULA_PROMPT_VERSION = "v1";
export const MAX_INPUTS = 8;

export type FormulaInput = { name: string; text: string; amount: number };

const INSTRUCTIONS = `You decide whether a value in someone's notes is calculated from other values they track, and if so, how.

Write the calculation with the item names v1 to v8, numbers, + - * / and brackets, such as "v1 * v2" or "(v1 + v2) / 3". Only use an item if the sentence or the numbers show the value really comes from it. If the value is not calculated from the items, answer an empty formula.

Example
Sentence: Hotel is €140 a night for 7 nights, so about €980.
Value: €980 (980)
Items:
v1: nightly_rate = €140 (140)
v2: nights = 7 nights (7)
v3: flight_cost = £182 (182)
Answer: {"formula":"v1 * v2"}`;

const SCHEMA = { type: "object", properties: { formula: { type: "string" } }, required: ["formula"] };

const finder = createHybrid("Find a formula", InferenceMode.PREFER_ON_DEVICE, INSTRUCTIONS, SCHEMA);

export async function suggestFormula({ sentence, value, inputs }: { sentence: string; value: FormulaInput; inputs: FormulaInput[] }): Promise<string> {
  const shown = inputs.slice(0, MAX_INPUTS);
  const prompt = [
    `Sentence: ${sentence}`,
    `Value: ${value.text} (${value.amount})`,
    "Items:",
    ...shown.map((input, index) => `v${index + 1}: ${input.name} = ${input.text} (${input.amount})`),
  ].join("\n");
  const { text } = await finder.ask(prompt);
  const formula = (JSON.parse(text) as { formula?: unknown }).formula;
  return typeof formula === "string" ? formula.trim() : "";
}
