import { parseIsoDuration } from "@/features/formulas/duration";
import { isCurrency, isMeasure, MEASURE_UNITS } from "@/features/formulas/units";
import type { Grain, TagKind } from "./describe";
import { nameOf, records } from "./find-answer";
import { VALUE_KINDS } from "./kinds";

export const MAX_COLLECTIONS = 8;
export const MAX_FIELDS = 8;
export const MAX_ROWS = 12;
export const MAX_CANDIDATES = 40;
export const MAX_NOTES = 12;
const MAX_PARAGRAPHS = 8;
const MAX_VALUES = 16;
const MAX_TITLE = 80;
const MAX_LIST = 40;

const keys = (prefix: string, count: number) => Array.from({ length: count }, (_, index) => `${prefix}${index + 1}`);
export const COLLECTION_KEYS = keys("k", MAX_COLLECTIONS);
export const FIELD_KEYS = keys("f", MAX_FIELDS);
export const ROW_KEYS = keys("r", MAX_ROWS);
export const CANDIDATE_KEYS = keys("c", MAX_CANDIDATES);
export const NOTE_KEYS = keys("n", MAX_NOTES);

const TAG_KINDS = [...VALUE_KINDS, "text"] as const;
const GRAINS = ["time", "day", "month", "year"] as const;
export const CAPTURE_ACTIONS = ["file", "update", "add", "note", "open"] as const;

export type DraftValue = {
  quote: string;
  kind: TagKind;
  name: string;
  about: string;
  event: boolean;
  when?: { on: string; grain: Grain };
  amount?: number;
  before?: string;
  after?: string;
  seconds?: number;
  unit?: string;
  formula: string;
  field: number | null;
};
export type DraftParagraph = { text: string; values: DraftValue[] };
export type NoteDraft = { title: string; paragraphs: DraftParagraph[] };

export type CaptureRoute =
  | { action: "file"; collection: number | "new"; list: string; row: number | { label: string } | null; paragraph: DraftParagraph }
  | { action: "update"; target: number; amount?: number; seconds?: number; text: string }
  | { action: "add"; note: number; paragraphs: DraftParagraph[] }
  | { action: "note"; draft: NoteDraft }
  | { action: "open"; title: string };

export type ShownCollection = { name: string; per: "day" | "name"; fields: { name: string; kind: TagKind }[]; rows: string[] };
export type ShownValue = { text: string; kind?: TagKind; name?: string; about?: string; noteTitle?: string };
export type CaptureShown = { collections: ShownCollection[]; values: ShownValue[]; notes: string[] };

const VALUE_PROPERTIES = {
  quote: { type: "string" },
  kind: { type: "string" },
  name: { type: "string" },
  about: { type: "string" },
  event: { type: "boolean" },
  when: { type: "string" },
  grain: { type: "string" },
  amount: { type: "string" },
  before: { type: "string" },
  after: { type: "string" },
  unit: { type: "string" },
  duration: { type: "string" },
  formula: { type: "string" },
};

function paragraphsSchema(withField: boolean) {
  const properties = withField ? { ...VALUE_PROPERTIES, field: { type: "string" } } : VALUE_PROPERTIES;
  return {
    type: "array",
    items: {
      type: "object",
      properties: {
        text: { type: "string" },
        values: { type: "array", items: { type: "object", properties, required: Object.keys(properties) } },
      },
      required: ["text", "values"],
    },
  };
}

export const ROUTE_SCHEMA = {
  type: "object",
  properties: {
    action: { type: "string", enum: [...CAPTURE_ACTIONS] },
    collection: { type: "string" },
    list: { type: "string" },
    row: { type: "string" },
    label: { type: "string" },
    target: { type: "string" },
    amount: { type: "string" },
    duration: { type: "string" },
    text: { type: "string" },
    note: { type: "string" },
    title: { type: "string" },
    paragraphs: paragraphsSchema(true),
  },
  required: ["action", "collection", "list", "row", "label", "target", "amount", "duration", "text", "note", "title", "paragraphs"],
};

export const TIDY_SCHEMA = {
  type: "object",
  properties: { title: { type: "string" }, paragraphs: paragraphsSchema(false) },
  required: ["title", "paragraphs"],
};

const WHEN_SHAPE: Record<Grain, RegExp> = {
  time: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
  day: /^\d{4}-\d{2}-\d{2}$/,
  month: /^\d{4}-\d{2}$/,
  year: /^\d{4}$/,
};

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

function whenOf(on: unknown, grain: unknown): DraftValue["when"] {
  const found = GRAINS.find((candidate) => candidate === grain);
  if (!found || typeof on !== "string" || !WHEN_SHAPE[found].test(on)) return undefined;
  const probe = found === "year" ? `${on}-01-01` : found === "month" ? `${on}-01` : on;
  return Number.isNaN(Date.parse(probe)) ? undefined : { on, grain: found };
}

function numberOf(raw: unknown): number | undefined {
  const value = typeof raw === "string" && raw.trim() !== "" ? Number(raw) : Number.NaN;
  return Number.isFinite(value) ? value : undefined;
}

const indexIn = (keyList: string[], key: unknown, limit: number) => {
  const index = typeof key === "string" ? keyList.indexOf(key) : -1;
  return index >= 0 && index < limit ? index : null;
};

function readValue(raw: Record<string, unknown>, paragraph: string, fields: number): DraftValue | undefined {
  const quote = text(raw.quote);
  if (!quote || !paragraph.includes(quote)) return undefined;
  const kind = TAG_KINDS.find((candidate) => candidate === raw.kind) ?? "text";
  const value: DraftValue = {
    quote,
    kind,
    name: nameOf(raw),
    about: text(raw.about),
    event: raw.event === true,
    when: whenOf(raw.when, raw.grain),
    formula: text(raw.formula),
    field: indexIn(FIELD_KEYS, raw.field, Math.min(fields, MAX_FIELDS)),
  };
  if (kind === "duration") {
    const seconds = typeof raw.duration === "string" ? parseIsoDuration(raw.duration.trim()) : undefined;
    if (seconds !== undefined) value.seconds = seconds;
  } else {
    const amount = numberOf(raw.amount);
    if (amount !== undefined) {
      const before = typeof raw.before === "string" && quote.startsWith(raw.before) ? raw.before : "";
      const after = typeof raw.after === "string" && quote.endsWith(raw.after) && quote.length >= before.length + raw.after.length ? raw.after : "";
      Object.assign(value, { amount, before, after });
    }
  }
  const unit = typeof raw.unit === "string" ? raw.unit.trim() : undefined;
  if (kind === "money" ? isCurrency(unit) : (kind === "number" || kind === "count" || kind === "duration") && isMeasure(unit)) value.unit = unit;
  return value;
}

function readParagraphs(raw: unknown, fields = 0): DraftParagraph[] {
  return records(raw)
    .slice(0, MAX_PARAGRAPHS)
    .flatMap((item) => {
      const paragraph = text(item.text);
      if (!paragraph) return [];
      const seen = new Set<string>();
      const values = records(item.values).slice(0, MAX_VALUES).flatMap((entry) => {
        const value = readValue(entry, paragraph, fields);
        if (!value || seen.has(value.quote)) return [];
        seen.add(value.quote);
        return [value];
      });
      return [{ text: paragraph, values }];
    });
}

export function readTidy(answer: string): NoteDraft {
  const data = JSON.parse(answer) as Record<string, unknown>;
  const paragraphs = readParagraphs(data.paragraphs);
  const title = text(data.title).slice(0, MAX_TITLE).trim();
  if (!title && paragraphs.length === 0) throw new Error("The tidy note came back empty");
  return { title, paragraphs };
}

export function readRoute(answer: string, shown: CaptureShown): CaptureRoute {
  const data = JSON.parse(answer) as Record<string, unknown>;
  const title = text(data.title).slice(0, MAX_TITLE).trim();
  const collectionIndex = indexIn(COLLECTION_KEYS, data.collection, shown.collections.length);
  const chosen = collectionIndex === null ? undefined : shown.collections[collectionIndex];
  const paragraphs = readParagraphs(data.paragraphs, chosen?.fields.length ?? 0);
  const asNote = (): CaptureRoute | undefined => (title || paragraphs.length > 0 ? { action: "note", draft: { title, paragraphs } } : undefined);

  const route = ((): CaptureRoute | undefined => {
    switch (data.action) {
      case "file": {
        const [paragraph] = paragraphs;
        if (!paragraph || paragraph.values.length === 0) return asNote();
        const list = text(data.list).slice(0, MAX_LIST).trim();
        if (data.collection === "new" && list) return { action: "file", collection: "new", list, row: null, paragraph };
        if (!chosen || collectionIndex === null) return asNote();
        const filled = paragraph.values.filter((value) => value.field !== null);
        if (filled.length === 0) return asNote();
        const rowIndex = chosen.per === "name" ? indexIn(ROW_KEYS, data.row, chosen.rows.length) : null;
        const label = text(data.label).slice(0, MAX_TITLE).trim();
        const row = rowIndex !== null ? rowIndex : chosen.per === "name" && label ? { label } : null;
        return { action: "file", collection: collectionIndex, list: chosen.name, row, paragraph: { ...paragraph, values: filled } };
      }
      case "update": {
        const target = indexIn(CANDIDATE_KEYS, data.target, shown.values.length);
        if (target === null) return asNote();
        const amount = numberOf(data.amount);
        const seconds = typeof data.duration === "string" ? parseIsoDuration(data.duration.trim()) : undefined;
        const newText = text(data.text);
        if (amount === undefined && seconds === undefined && !newText) return asNote();
        return { action: "update", target, text: newText, ...(amount !== undefined && { amount }), ...(seconds !== undefined && { seconds }) };
      }
      case "add": {
        const note = indexIn(NOTE_KEYS, data.note, shown.notes.length);
        return note !== null && paragraphs.length > 0 ? { action: "add", note, paragraphs } : asNote();
      }
      case "open":
        return title ? { action: "open", title } : asNote();
      default:
        return asNote();
    }
  })();
  if (!route) throw new Error("The capture answer had nothing to do");
  return route;
}

const VALUE_RULES = `For each value in a paragraph give:
- "quote": the value copied exactly from the paragraph, keeping its currency sign, % sign or unit, such as £45, 6 km, 31 minutes or 3 December. Leave out the thing counted: "5 of us" gives "5".
- "kind": money, count, number, date, duration, percent, person, place, or text.
- "name": a short snake_case name for what the value measures.
- "about": the thing it belongs to, in one to three words, such as "run", "flights" or "villa".
- "event": true if it records one occasion, such as a run or a payment; false if it stays true until it changes, such as a price or a head count.
- "when": the single occasion it applies to, looked up in the Dates line, as YYYY-MM-DD or YYYY-MM-DDTHH:MM; empty if none. "grain": day, time, month, year, or none when "when" is empty.
- "amount": for money, counts, numbers and percentages, the number in digits only, such as "1680". Empty otherwise.
- "before" and "after": the text before and after the number inside the quote, such as "£" and "" for "£45", or "" and " km" for "6 km".
- "unit": for money the ISO 4217 code, such as GBP or EUR. For a measurement one of ${MEASURE_UNITS.join(", ")}. For a pace such as 5:10/km, the distance unit. Empty otherwise.
- "duration": for durations only, an ISO 8601 duration such as PT31M or PT1H5M.
- "formula": only when the value is worked out from other values, the calculation with v1, v2 and so on standing for all the values in the answer counted in order across paragraphs, such as "v2 / v1". Otherwise empty.
Prices, counts, measurements, dates, times, durations, percentages, people and places are values. Ordinary words never are.`;

export const ROUTE_INSTRUCTIONS = `Someone types one thing into the box on the home page of their notes app. Decide the one thing to do with it.

Actions:
- "file": it records a new entry for one of their collections, such as a run for Runs or a purchase for Spending. Pick it in "collection". Use "new" only when they ask for a list that does not exist yet, such as "start a swims log, 40 lengths today", and give the list's name in "list", short, plural and in sentence case.
- "update": it says a value they already track has changed, such as "flights went up to £140". Pick the candidate in "target" and give the new value: "amount" in digits for money, counts, numbers and percentages; "duration" as ISO 8601 for lengths of time; "text" for anything else, written the way the candidate is written.
- "add": it adds a detail that clearly belongs in one of their notes, about that note's subject. Pick the note in "note".
- "note": anything else worth keeping, such as a plan, a reminder or an idea. Give a short title in sentence case.
- "open": it is only a title for a note they want to start writing, such as "Garden plans", with no details. Give it as "title".

For file, add and note, write "paragraphs": the entry as tidy sentences in the person's own voice. Fix typos, spell out shorthand ("6k" becomes "6 km", "31 mins" becomes "31 minutes", "3 dec" becomes "3 December"), keep clock-style times such as 27:40 as written, and never add facts. For a note, leave the title out of the paragraphs. For file, write one paragraph and give each value's "field" in the chosen collection, or none. For a collection with one row per named thing, pick the row in "row", or "new" with the thing's name in "label". For a collection with one row per day, answer none for row.

${VALUE_RULES}

Answer none, or an empty string, for every key the action does not use.

Example
Dates: today Wed 2026-11-18. Mon 2026-11-16, Tue 2026-11-17, Thu 2026-11-19.
Collections:
k1: Runs, one row per day. f1 date (date), f2 distance (number), f3 time (duration)
Values:
c1: £118 · money · flight_price · about flights · in "Lisbon long weekend"
Notes:
n1: Lisbon long weekend
Entry: ran 6k by the canal, 31 mins
Answer: {"action":"file","collection":"k1","list":"","row":"none","label":"","target":"none","amount":"","duration":"","text":"","note":"none","title":"","paragraphs":[{"text":"Ran 6 km by the canal in 31 minutes.","values":[{"quote":"6 km","kind":"number","name":"run_distance","about":"run","event":true,"when":"2026-11-18","grain":"day","amount":"6","before":"","after":" km","unit":"km","duration":"","formula":"","field":"f2"},{"quote":"31 minutes","kind":"duration","name":"run_time","about":"run","event":true,"when":"2026-11-18","grain":"day","amount":"","before":"","after":"","unit":"","duration":"PT31M","formula":"","field":"f3"}]}]}

Entry: flights went up to £140
Answer: {"action":"update","collection":"none","list":"","row":"none","label":"","target":"c1","amount":"140","duration":"","text":"","note":"none","title":"","paragraphs":[]}

Entry: mum's birthday 3 dec, get her the blue scarf ~£45
Answer: {"action":"note","collection":"none","list":"","row":"none","label":"","target":"none","amount":"","duration":"","text":"","note":"none","title":"Mum's birthday","paragraphs":[{"text":"Mum's birthday is on 3 December. Get her the blue scarf, about £45.","values":[{"quote":"3 December","kind":"date","name":"birthday","about":"Mum","event":true,"when":"2026-12-03","grain":"day","amount":"","before":"","after":"","unit":"","duration":"","formula":"","field":"none"},{"quote":"£45","kind":"money","name":"gift_price","about":"scarf","event":false,"when":"","grain":"none","amount":"45","before":"£","after":"","unit":"GBP","duration":"","formula":"","field":"none"}]}]}

Entry: villa has a pool, towels included
Answer: {"action":"add","collection":"none","list":"","row":"none","label":"","target":"none","amount":"","duration":"","text":"","note":"n1","title":"","paragraphs":[{"text":"The villa has a pool and towels are included.","values":[]}]}

Entry: Garden plans
Answer: {"action":"open","collection":"none","list":"","row":"none","label":"","target":"none","amount":"","duration":"","text":"","note":"none","title":"Garden plans","paragraphs":[]}`;

export const TIDY_INSTRUCTIONS = `Someone pastes something messy into their notes app: a group chat, an email, a receipt or a list. Write it up as a short, tidy note they would want to keep.

Give a short "title" in sentence case naming what it is about, such as "Lisbon long weekend" or "Richmond 10K".
Write "paragraphs": two to six short paragraphs of plain sentences with the facts that matter, latest decisions first, in the order a reader needs them. When the paste changes its mind, keep only the final answer. Leave out greetings, chatter and emoji. Never add facts. When a useful figure follows from the others, such as a share each, you may add it with its formula.

${VALUE_RULES}

Example
Dates: today Wed 2026-11-18. Thu 2026-11-19, Fri 2026-11-20.
Paste:
Tom: villa's confirmed!! €1,680 for the 4 nights
Ana: flights are £118 each, we land 9:40 fri 11th dec
Tom: so 6 of us right?
Mia: I'm out sorry, work thing
Ana: ok 5 then
Answer: {"title":"Lisbon long weekend","paragraphs":[{"text":"5 of us are going. Mia can't come.","values":[{"quote":"5","kind":"count","name":"people","about":"trip","event":false,"when":"","grain":"none","amount":"5","before":"","after":"","unit":"","duration":"","formula":""}]},{"text":"We land on Fri 11 December at 9:40. Flights are £118 each.","values":[{"quote":"Fri 11 December","kind":"date","name":"arrival_date","about":"flights","event":true,"when":"2026-12-11","grain":"day","amount":"","before":"","after":"","unit":"","duration":"","formula":""},{"quote":"9:40","kind":"date","name":"landing_time","about":"flights","event":true,"when":"2026-12-11T09:40","grain":"time","amount":"","before":"","after":"","unit":"","duration":"","formula":""},{"quote":"£118","kind":"money","name":"flight_price","about":"flights","event":false,"when":"","grain":"none","amount":"118","before":"£","after":"","unit":"GBP","duration":"","formula":""}]},{"text":"The villa is confirmed at €1,680 for 4 nights, so €336 each.","values":[{"quote":"€1,680","kind":"money","name":"villa_price","about":"villa","event":false,"when":"","grain":"none","amount":"1680","before":"€","after":"","unit":"EUR","duration":"","formula":""},{"quote":"4 nights","kind":"duration","name":"villa_stay","about":"villa","event":false,"when":"","grain":"none","amount":"","before":"","after":"","unit":"","duration":"P4D","formula":""},{"quote":"€336","kind":"money","name":"villa_share","about":"villa","event":false,"when":"","grain":"none","amount":"336","before":"€","after":"","unit":"EUR","duration":"","formula":"v5 / v1"}]}]}`;

function collectionLine(collection: ShownCollection, index: number): string {
  const fields = collection.fields
    .slice(0, MAX_FIELDS)
    .map((field, fieldIndex) => `f${fieldIndex + 1} ${field.name} (${field.kind})`)
    .join(", ");
  const head = `k${index + 1}: ${collection.name}, one row per ${collection.per === "day" ? "day" : "named thing"}. ${fields}`;
  if (collection.per === "day") return head;
  const rows = collection.rows.slice(0, MAX_ROWS).map((label, rowIndex) => `r${rowIndex + 1} ${label}`);
  return `${head}. Rows: ${rows.length > 0 ? rows.join(", ") : "none yet"}`;
}

const valueLine = (value: ShownValue, index: number) =>
  `c${index + 1}: ${[value.text, value.kind, value.name, value.about && `about ${value.about}`, value.noteTitle && `in "${value.noteTitle}"`].filter(Boolean).join(" · ")}`;

export function routePrompt(entry: string, dates: string, shown: CaptureShown): string {
  return [
    dates,
    "Collections:",
    ...(shown.collections.length > 0 ? shown.collections.slice(0, MAX_COLLECTIONS).map(collectionLine) : ["none yet"]),
    "Values:",
    ...(shown.values.length > 0 ? shown.values.slice(0, MAX_CANDIDATES).map(valueLine) : ["none yet"]),
    "Notes:",
    ...(shown.notes.length > 0 ? shown.notes.slice(0, MAX_NOTES).map((title, index) => `n${index + 1}: ${title || "Untitled"}`) : ["none yet"]),
    `Entry: ${entry}`,
  ].join("\n");
}

export const tidyPrompt = (paste: string, dates: string) => `${dates}\nPaste:\n${paste}`;
