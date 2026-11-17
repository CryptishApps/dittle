import { InferenceMode } from "firebase/ai";
import { createHybrid } from "./hybrid";

export const FORMULA_PROMPT_VERSION = "v2";
export const MAX_INPUTS = 8;

export type FormulaInput = { name: string; text: string; number: number; seconds: boolean };

const INSTRUCTIONS = `You decide whether a value in someone's notes is calculated from other values they track, and if so, how.

Write the calculation with the item names v1 to v8, numbers, + - * / and brackets, such as "v1 * v2" or "(v1 + v2) / 3". Only use an item if the sentence or the numbers show the value really comes from it. If the value is not calculated from the items, answer an empty formula.

Lengths of time are given in seconds. When the value is per hour or per minute, convert, such as "v1 / (v2 / 3600)" for kilometres per hour.

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

const shown = (input: FormulaInput) => `${input.text} (${input.number}${input.seconds ? " seconds" : ""})`;

export async function suggestFormula({ sentence, value, inputs }: { sentence: string; value: FormulaInput; inputs: FormulaInput[] }): Promise<string> {
  const prompt = [
    `Sentence: ${sentence}`,
    `Value: ${shown(value)}`,
    "Items:",
    ...inputs.slice(0, MAX_INPUTS).map((input, index) => `v${index + 1}: ${input.name} = ${shown(input)}`),
  ].join("\n");
  const { text } = await finder.ask(prompt);
  const formula = (JSON.parse(text) as { formula?: unknown }).formula;
  return typeof formula === "string" ? formula.trim() : "";
}

const COLUMN_INSTRUCTIONS = `You suggest calculated columns for a table someone keeps in their notes. Each column combines two of the table's fields, written with the field names f1 to f8, + - * / and brackets, such as "f2 / f1".

Suggest a column whenever two fields have a natural ratio worth comparing between rows, such as a price per person, a pace (time ÷ distance) or a speed (distance ÷ time). Never suggest one that only repeats a field. Keep units as they are: lengths of time are in seconds, and the app shows paces and speeds itself. Give each column a short name. Suggest at most 3, or none.

Example
Table: Dinners, one row per day
f1: guests (count), such as 12
f2: bill (money), such as £340
Answer: {"columns":[{"name":"Per guest","formula":"f2 / f1"}]}`;

const COLUMN_SCHEMA = {
  type: "object",
  properties: {
    columns: {
      type: "array",
      maxItems: 3,
      items: { type: "object", properties: { name: { type: "string" }, formula: { type: "string" } }, required: ["name", "formula"] },
    },
  },
  required: ["columns"],
};

const columnFinder = createHybrid("Suggest columns", InferenceMode.PREFER_ON_DEVICE, COLUMN_INSTRUCTIONS, COLUMN_SCHEMA);

export type ColumnField = { name: string; kind: string; example?: string };
export type SuggestedColumn = { name: string; formula: string };

export async function suggestColumns({ table, per, fields }: { table: string; per: "day" | "name"; fields: ColumnField[] }): Promise<SuggestedColumn[]> {
  const prompt = [
    `Table: ${table}, one row per ${per}`,
    ...fields.slice(0, MAX_INPUTS).map((field, index) => `f${index + 1}: ${field.name} (${field.kind})${field.example ? `, such as ${field.example}` : ""}`),
  ].join("\n");
  const { text } = await columnFinder.ask(prompt);
  const columns = (JSON.parse(text) as { columns?: unknown }).columns;
  if (!Array.isArray(columns)) return [];
  return columns.flatMap((column: unknown) => {
    const { name, formula } = (column ?? {}) as Record<string, unknown>;
    return typeof name === "string" && typeof formula === "string" && name.trim() && formula.trim() ? [{ name: name.trim(), formula: formula.trim() }] : [];
  });
}
