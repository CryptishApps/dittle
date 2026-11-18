import { InferenceMode } from "firebase/ai";
import { datesLine } from "@/features/ai/describe";
import { TAG_KINDS, type TagKind } from "@/features/ai/value-shapes";
import { createHybrid } from "@/features/ai/hybrid";
import { MEASURE_UNITS } from "@/features/formulas/units";
import type { CollectionField } from "@/features/notes/fact";
import { fieldKey, sampleFromReading, type ReadEntry } from "./reading";
import type { Recipe, Sample } from "./recipes";
import { glancesFor } from "./seed";

const MAX_FIELDS = 4;
const FIELD_KEYS = Array.from({ length: MAX_FIELDS + 1 }, (_, index) => fieldKey(index));

const VALUE_RULES = `For each entry give:
- "day": the date the entry happened or is planned for, looked up in the Dates line, as YYYY-MM-DD. Empty when the sentence names none.
- "label": a short name for the entry when the table names its rows, such as the supplier, the book or the client. Empty otherwise.
- "values": one item per column the sentence gives a value for:
  - "field": the column key, such as f1.
  - "quote": the value copied exactly from the sentence, keeping the currency sign or unit (£180, 5 km, 27:40, this morning, chilli).
  - "amount": for money, counts and numbers, the number in digits only, such as "3040". Empty otherwise.
  - "before" and "after": the exact text before and after the number inside the quote, such as "£" and "" for "£3,040", or "" and " km" for "5 km". Empty otherwise.
  - "unit": for money, the ISO 4217 code such as "GBP". For a measurement, one of ${MEASURE_UNITS.join(", ")}. Empty otherwise.
  - "duration": for durations only, an ISO 8601 duration such as "PT27M40S". A run time like 27:40 is minutes and seconds.
A date column takes the words that say when, such as "this morning" or "Saturday".`;

const ENTRY_ITEM = {
  type: "object",
  properties: {
    day: { type: "string" },
    label: { type: "string" },
    values: {
      type: "array",
      items: {
        type: "object",
        properties: {
          field: { type: "string", enum: FIELD_KEYS },
          quote: { type: "string" },
          amount: { type: "string" },
          before: { type: "string" },
          after: { type: "string" },
          unit: { type: "string" },
          duration: { type: "string" },
        },
        required: ["field", "quote", "amount", "before", "after", "unit", "duration"],
      },
    },
  },
  required: ["day", "label", "values"],
};

const ENTRIES = { type: "array", items: ENTRY_ITEM };

const READ_INSTRUCTIONS = `You read one sentence someone wrote and file it into a table. You get the table's columns with their keys and kinds. Split the sentence into entries, one per row: usually one, but a list such as "Monday chilli, Tuesday salmon" has one entry per day.

${VALUE_RULES}`;

const reader = createHybrid("Read an onboarding entry", InferenceMode.ONLY_IN_CLOUD, READ_INSTRUCTIONS, {
  type: "object",
  properties: { entries: ENTRIES },
  required: ["entries"],
});

const columnsLine = (fields: CollectionField[]) => `Columns: ${fields.map((field, index) => `${fieldKey(index)} ${field.name} (${field.kind})`).join(", ")}`;

export async function readEntry(sentence: string, recipe: Recipe, today = new Date()): Promise<Sample | undefined> {
  const prompt = [datesLine(today), `Table: ${recipe.collection.name}, one row per ${recipe.collection.key.by === "when" ? "day" : recipe.collection.rowLabel}`, columnsLine(recipe.collection.fields), `Sentence: ${sentence}`].join("\n");
  const { text } = await reader.ask(prompt);
  const entries = ((JSON.parse(text) as { entries?: ReadEntry[] }).entries ?? []).filter((entry) => Array.isArray(entry.values));
  return sampleFromReading(sentence, entries, recipe.collection);
}

const PROPOSE_INSTRUCTIONS = `Someone new to a notes app says what they keep track of. Set up a table for it and write one realistic example sentence they might write in a note.

Give:
- "name": the table's short plural name in sentence case, such as "Plant waterings".
- "rowLabel": one row as a short singular noun, such as "watering".
- "per": "day" when each row is something that happened on a date, "name" when each row is a named thing such as a supplier or a book.
- "columns": up to ${MAX_FIELDS} columns besides the date, each with a short "name" and a "kind": money, count, number, date, duration, percent, person, place, or text. Prefer numbers that add up.
- "prompt": a short invitation such as "Tell Dittle about a recent watering."
- "sentence": one example sentence in British English with a value for every column, written with units, and a day when "per" is "day". Say the day the way people do, such as "this morning", "yesterday" or "on Saturday", never a full date.`;

const proposer = createHybrid("Propose an onboarding table", InferenceMode.ONLY_IN_CLOUD, PROPOSE_INSTRUCTIONS, {
  type: "object",
  properties: {
    name: { type: "string" },
    rowLabel: { type: "string" },
    per: { type: "string", enum: ["day", "name"] },
    columns: {
      type: "array",
      maxItems: MAX_FIELDS,
      items: { type: "object", properties: { name: { type: "string" }, kind: { type: "string", enum: [...TAG_KINDS] } }, required: ["name", "kind"] },
    },
    prompt: { type: "string" },
    sentence: { type: "string" },
  },
  required: ["name", "rowLabel", "per", "columns", "prompt", "sentence"],
});

type Proposed = { name?: string; rowLabel?: string; per?: string; columns?: { name?: string; kind?: string }[]; prompt?: string; sentence?: string };

const idOf = (name: string, taken: Set<string>) => {
  const base = name.trim().toLowerCase().replaceAll(/[^a-z0-9]+/g, "_") || "value";
  let id = base;
  for (let index = 2; taken.has(id); index += 1) id = `${base}_${index}`;
  taken.add(id);
  return id;
};

export async function proposeRecipe(topic: string, today = new Date()): Promise<Recipe | undefined> {
  const { text } = await proposer.ask([datesLine(today), `They keep track of: ${topic}`].join("\n"));
  const raw = JSON.parse(text) as Proposed;
  const byDay = raw.per !== "name";
  const taken = new Set<string>(byDay ? ["date"] : []);
  const columns = (raw.columns ?? []).flatMap((column): CollectionField[] => {
    const kind = TAG_KINDS.find((candidate) => candidate === column.kind) as TagKind | undefined;
    const name = column.name?.trim();
    return kind && name ? [{ id: idOf(name, taken), name, kind }] : [];
  });
  const name = raw.name?.trim();
  if (!name || columns.length === 0 || !raw.sentence) return undefined;
  const recipe: Recipe = {
    id: `custom:${topic}`,
    label: topic,
    icon: "sparkle",
    folder: topic,
    noteTitle: topic,
    prompt: raw.prompt?.trim() || `Tell Dittle about ${topic.toLowerCase()}.`,
    collection: {
      name,
      rowLabel: raw.rowLabel?.trim() || name,
      fields: [...(byDay ? [{ id: "date", name: "date", kind: "date" as const }] : []), ...columns.slice(0, MAX_FIELDS)],
      key: byDay ? { by: "when", grain: "day" } : { by: "name" },
    },
    glances: [],
    samples: [],
    extras: [],
  };
  const sample = await readEntry(raw.sentence, recipe, today);
  return sample ? { ...recipe, glances: glancesFor(recipe), samples: [sample] } : undefined;
}
