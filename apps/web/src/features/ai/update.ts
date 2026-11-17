import { InferenceMode } from "firebase/ai";
import { MEASURE_UNITS } from "@/features/formulas/units";
import { datesLine } from "./describe";
import { createHybrid, type InferenceWhere } from "./hybrid";
import { MAX_ADDITIONS, MAX_TRACKED, MAX_UPDATES, readUpdateAnswer, TRACKED_KEYS, updatePrompt, type UpdateAnswer, type UpdateTracked } from "./update-answer";
import { VALUE_KINDS } from "./value-shapes";

export { UPDATE_PROMPT_VERSION } from "./prompt-versions";

export type { ProposedAddition, ProposedUpdate, UpdateAnswer, UpdateTracked } from "./update-answer";
export type UpdateResult = UpdateAnswer & { where: InferenceWhere; ms: number };
export type UpdateFile = { mimeType: string; data: string };

const RULES = `Someone keeps a plan in their notes and tracks values in it, listed under "Tracked values". They received a message, such as an email from a supplier, a quote or a receipt. Say which tracked values the message changes, and which new values in it are worth tracking.

"updates": one entry for each tracked value the message gives a value for. A message often changes several values at once, such as a price and a date; list every one.
- "value": the tracked value's key, such as "u3". Pick it only when the message is about the same thing: the same measure, for the same subject. A number about a different supplier, a different item or a past price is not an update.
- "text": the new value only, copied exactly from the message, with its currency sign or unit, such as "£42", "30 May" or "4 hours". Leave out the words around it.
- "quote": the words in the message that give the value, copied exactly, containing "text".
- "unit": for money, the ISO 4217 code of the currency the message uses, such as "GBP" for £, "EUR" for € or "USD" for $. For a measurement, one of ${MEASURE_UNITS.join(", ")}. Empty otherwise.
- "when": for a date or time, the day it names as YYYY-MM-DD, or YYYY-MM-DDTHH:MM for a time, looked up in the Dates line. A date without a year is the next one after today. Empty otherwise.
- "duration": for a length of time, an ISO 8601 duration such as "PT45M", "PT4H" or "P3D". Empty otherwise.
If the message repeats a tracked value without changing it, include it with the value as the message writes it. Leave out tracked values the message does not mention.

"additions": values in the message that none of the tracked values cover and that the plan would track, such as a new fee, a new date or a new count. Same "text" and "quote" rules, plus "kind" (money, count, number, date, duration, percent, person or place) and a short snake_case "name". Never phone numbers, street numbers, postcodes, order or reference numbers, or years on their own.

"title": a short title for a note holding the message, such as "Email from Bloom & Co".`;

const EXAMPLE = `Example
Dates: today Mon 2026-03-09. Sun 2026-03-08, Tue 2026-03-10.
Tracked values:
u1: £450 · money · flowers_total · about Bloom & Co · in "Flowers"
u2: 12 · count · table_count · about reception · in "Venue"
u3: 2 May · date · flower_delivery · about Bloom & Co · on 2026-05-02 · in "Flowers"
u4: Hartley Barn · place · venue · about wedding · in "Venue"
Message:
Hi Sam, good news: now that you've dropped two tables we can do the arrangements for £410, so 10 tables in all. Delivery stays 2 May, before 9am. Parking on site is £5. Call me on 07700 900123. Thanks, Jo
Answer: {"title":"Email from Bloom & Co","updates":[{"value":"u1","text":"£410","quote":"we can do the arrangements for £410","unit":"GBP","when":"","duration":""},{"value":"u2","text":"10","quote":"so 10 tables in all","unit":"","when":"","duration":""},{"value":"u3","text":"2 May","quote":"Delivery stays 2 May","unit":"","when":"2026-05-02","duration":""}],"additions":[{"text":"£5","kind":"money","name":"parking_fee","quote":"Parking on site is £5"}]}`;

const TEXT_INSTRUCTIONS = `${RULES}\n\n${EXAMPLE}`;

const FILE_INSTRUCTIONS = `${RULES}

The message is an attached image or PDF, such as a photo of a quote or a receipt. Copy "text" and "quote" exactly as printed. Also give "transcript": the readable text of the file in reading order, one line per line of the document, at most 2000 characters.

${EXAMPLE.replace('"additions"', '"transcript":"Hi Sam, good news: …","additions"')}`;

const UPDATE_ITEM = {
  type: "object",
  properties: {
    value: { type: "string", enum: TRACKED_KEYS },
    text: { type: "string" },
    quote: { type: "string" },
    unit: { type: "string" },
    when: { type: "string" },
    duration: { type: "string" },
  },
  required: ["value", "text", "quote", "unit", "when", "duration"],
};

const ADDITION_ITEM = {
  type: "object",
  properties: { text: { type: "string" }, kind: { type: "string", enum: [...VALUE_KINDS] }, name: { type: "string" }, quote: { type: "string" } },
  required: ["text", "kind", "name", "quote"],
};

const TEXT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    updates: { type: "array", maxItems: MAX_UPDATES, items: UPDATE_ITEM },
    additions: { type: "array", maxItems: MAX_ADDITIONS, items: ADDITION_ITEM },
  },
  required: ["title", "updates", "additions"],
};

const FILE_SCHEMA = {
  ...TEXT_SCHEMA,
  properties: { ...TEXT_SCHEMA.properties, transcript: { type: "string" } },
  required: [...TEXT_SCHEMA.required, "transcript"],
};

export function createUpdateReader(textMode: InferenceMode) {
  const textReader = createHybrid("Read a pasted update", textMode, TEXT_INSTRUCTIONS, TEXT_SCHEMA);
  const fileReader = createHybrid("Read an update from a file", InferenceMode.ONLY_IN_CLOUD, FILE_INSTRUCTIONS, FILE_SCHEMA);

  const readText = async ({ message, tracked, today = new Date() }: { message: string; tracked: UpdateTracked[]; today?: Date }): Promise<UpdateResult> => {
    const shown = tracked.slice(0, MAX_TRACKED);
    const { text, where, ms } = await textReader.ask(updatePrompt(datesLine(today), shown, message));
    return { ...readUpdateAnswer(text, shown, "text", message), where, ms };
  };

  const readFile = async ({ file, tracked, today = new Date() }: { file: UpdateFile; tracked: UpdateTracked[]; today?: Date }): Promise<UpdateResult> => {
    const shown = tracked.slice(0, MAX_TRACKED);
    const { text, where, ms } = await fileReader.ask([
      { type: "text", text: updatePrompt(datesLine(today), shown) },
      { type: "inlineData", inlineData: file },
    ]);
    return { ...readUpdateAnswer(text, shown, "file"), where, ms };
  };

  return { readText, readFile };
}

const shared = createUpdateReader(InferenceMode.PREFER_IN_CLOUD);

export const readPastedUpdate = shared.readText;
export const readFileUpdate = shared.readFile;
