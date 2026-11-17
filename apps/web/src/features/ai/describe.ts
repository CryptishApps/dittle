import { InferenceMode } from "firebase/ai";
import { parseIsoDuration } from "@/features/formulas/duration";
import { isCurrency, isMeasure, MEASURE_UNITS } from "@/features/formulas/units";
import { createHybrid, type InferenceWhere } from "./hybrid";
import { GRAINS, TAG_KINDS, validWhen, VALUE_KINDS, type Grain, type TagKind, type ValueKind } from "./value-shapes";

export { DESCRIBE_PROMPT_VERSION } from "./prompt-versions";

export { GRAINS, TAG_KINDS, type Grain, type TagKind } from "./value-shapes";

export type ValueContext = {
  about: string;
  event: boolean;
  when?: { on: string; grain: Grain };
  conditions: string[];
  remarks: string[];
  amount?: number;
  before?: string;
  after?: string;
  seconds?: number;
  unit?: string;
};

export type SpottedValue = { quote: string; kind: TagKind; name: string };
export type DescribedValue = SpottedValue & ValueContext;

type Timed = { where: InferenceWhere; ms: number; fallbackReason?: string };
export type FindResult = { values: SpottedValue[]; requests: string[] } & Timed;
export type DescribeResult = { values: DescribedValue[] } & Timed;

const FIND_INSTRUCTIONS = `You read one paragraph from someone's notes and list the concrete values in it: amounts of money, counts, other numbers and measurements, dates and times, durations, percentages, and the names of people and places.

For each value give:
- "quote": only the value itself, copied exactly from the paragraph. Always keep the currency sign, % sign or unit (£189, 60%, 250g, 7 nights, 45 minutes, 14 June). Leave out the thing being counted and the words around it: "80 guests" gives "80", "£38 a head" gives "£38".
- "kind": money, count, number, date, duration, percent, person or place. Times of day (10am, 9:30) are dates. A length of time (7 nights, two weeks) is a duration.
- "name": a short snake_case name for what the value means.

"requests": sentences that ask you to write or add content into the note at that spot, such as "add a list of meals here", copied exactly. Reminders and to-dos for the person, such as "book the plumber" or "check the opening times", are not requests. A request is never also a value.

Ordinary words are never values. If there are no values, return an empty list.

Examples
Paragraph: Dinner for 12 people on 3 May with Ana at Casa Lola, about £30 each. Add a shopping list here.
Answer: {"values":[{"quote":"12","kind":"count","name":"dinner_guests"},{"quote":"3 May","kind":"date","name":"dinner_date"},{"quote":"Ana","kind":"person","name":"host"},{"quote":"Casa Lola","kind":"place","name":"restaurant"},{"quote":"£30","kind":"money","name":"price_per_person"}],"requests":["Add a shopping list here."]}
Paragraph: Still 80 guests, so 10 tables. Remember to ask Sam about the cake.
Answer: {"values":[{"quote":"80","kind":"count","name":"guest_count"},{"quote":"10","kind":"count","name":"table_count"},{"quote":"Sam","kind":"person","name":"cake_contact"}],"requests":[]}`;

const DESCRIBE_INSTRUCTIONS = `You get one paragraph from someone's notes and a list of values that appear in it. Describe each listed value, in the same order. Never add values that are not listed.

For each value give:
- "quote": the value exactly as listed.
- "kind": money, count, number, date, duration, percent, person, place, or text when it is none of these.
- "name": a short snake_case name for what the value measures.
- "about": the thing the value belongs to, as a noun of one to three words, such as "run", "Rosa's Kitchen" or "tomato seedlings". Prefer the thing named in the paragraph over the note's title. For a person or place, the role it plays, such as "caterer" or "venue".
- "event": true if the value records one occasion that happened or will happen, such as a run, a payment or a delivery. false if it stays true until it changes, such as a price, a capacity or a team size.
- "when": the single occasion the value applies to, looked up in the Dates line, as YYYY-MM-DD, YYYY-MM-DDTHH:MM, YYYY-MM or YYYY. A month named without a year is the most recent one. Empty when the paragraph names no single occasion.
- "grain": day, time, month or year to match "when", or none when "when" is empty.
- "conditions": phrases copied from the paragraph that limit when or for whom the value is true, such as "on Saturdays" or "for members". A repeating time is a condition, never "when". Empty if none.
- "remarks": words copied from the paragraph that say something notable about the value without limiting it, such as "fastest", "roughly" or "quoted". A unit is never a remark. Empty if none.

- "amount": for money, counts, numbers and percentages, the number written in digits only, with no separators or units, such as "3040", "2.5", or "2" for "two". Empty for durations, dates, people, places and anything else.
- "before" and "after": the exact text before and after the number inside the quote, such as "£" and "" for "£3,040", or "" and " km" for "5 km". Empty when there is none or for durations.
- "unit": for money, the ISO 4217 code of the currency, such as "GBP" for £ or "EUR" for €. For a measurement, one of ${MEASURE_UNITS.join(", ")}, such as "mi" for "3 miles" or "kg" for "2 kilos". For a duration per distance, such as a pace of 4:50/km, the distance unit. Empty for everything else.
- "duration": for durations only, the length of time as an ISO 8601 duration, such as "PT45M", "PT1H30M", "PT12M5S" or "P3D". When the quote has no unit, take it from the words next to it. Read a clock-style length such as 1:15 from what it measures: minutes and seconds for something that takes minutes, such as a lap or a song, and hours and minutes for something that takes hours, such as a drive or a shift. Empty for every other kind.

Words that say when, such as "today", "yesterday" or "on Friday", only ever set "when". They are never conditions or remarks.

Examples
Dates: today Mon 2026-03-09. Fri 2026-03-06, Sat 2026-03-07, Sun 2026-03-08, Tue 2026-03-10.
Note: Garden
Paragraph: Paid Tom £45 on Friday for mowing, roughly an hour. He charges £50 on weekends, up from £40 in January.
Values: £45 | an hour | £50 | £40
Answer: {"values":[{"quote":"£45","kind":"money","name":"mowing_payment","about":"mowing","event":true,"when":"2026-03-06","grain":"day","conditions":[],"remarks":[],"amount":"45","before":"£","after":"","unit":"GBP","duration":""},{"quote":"an hour","kind":"duration","name":"mowing_time","about":"mowing","event":true,"when":"2026-03-06","grain":"day","conditions":[],"remarks":["roughly"],"amount":"","before":"","after":"","unit":"","duration":"PT1H"},{"quote":"£50","kind":"money","name":"mowing_price","about":"Tom","event":false,"when":"","grain":"none","conditions":["on weekends"],"remarks":[],"amount":"50","before":"£","after":"","unit":"GBP","duration":""},{"quote":"£40","kind":"money","name":"mowing_price","about":"Tom","event":false,"when":"2026-01","grain":"month","conditions":[],"remarks":[],"amount":"40","before":"£","after":"","unit":"GBP","duration":""}]}

Dates: today Thu 2026-07-02. Tue 2026-06-30, Wed 2026-07-01, Fri 2026-07-03.
Note: Book club
Paragraph: Book club meets at 7pm every second Tuesday.
Values: 7pm
Answer: {"values":[{"quote":"7pm","kind":"date","name":"meeting_time","about":"book club","event":false,"when":"","grain":"none","conditions":["every second Tuesday"],"remarks":[],"amount":"","before":"","after":"","unit":"","duration":""}]}

Dates: today Wed 2026-05-13. Sun 2026-05-10, Mon 2026-05-11, Tue 2026-05-12, Thu 2026-05-14.
Note: Hiking
Paragraph: Walked 8 miles on Sunday at 18:40 a mile.
Values: 8 miles | 18:40
Answer: {"values":[{"quote":"8 miles","kind":"number","name":"walk_distance","about":"walk","event":true,"when":"2026-05-10","grain":"day","conditions":[],"remarks":[],"amount":"8","before":"","after":" miles","unit":"mi","duration":""},{"quote":"18:40","kind":"duration","name":"walk_pace","about":"walk","event":true,"when":"2026-05-10","grain":"day","conditions":[],"remarks":[],"amount":"","before":"","after":"","unit":"mi","duration":"PT18M40S"}]}`;

const PHRASES = { type: "array", items: { type: "string" }, maxItems: 3 };
const MAX_VALUES = 12;

const FIND_SCHEMA = {
  type: "object",
  properties: {
    values: {
      type: "array",
      maxItems: MAX_VALUES,
      items: {
        type: "object",
        properties: { quote: { type: "string" }, kind: { type: "string", enum: [...VALUE_KINDS] }, name: { type: "string" } },
        required: ["quote", "kind", "name"],
      },
    },
    requests: PHRASES,
  },
  required: ["values", "requests"],
};

const DESCRIBE_SCHEMA = {
  type: "object",
  properties: {
    values: {
      type: "array",
      maxItems: MAX_VALUES,
      items: {
        type: "object",
        properties: {
          quote: { type: "string" },
          kind: { type: "string", enum: [...TAG_KINDS] },
          name: { type: "string" },
          about: { type: "string" },
          event: { type: "boolean" },
          when: { type: "string" },
          grain: { type: "string", enum: [...GRAINS, "none"] },
          conditions: PHRASES,
          remarks: PHRASES,
          amount: { type: "string" },
          before: { type: "string" },
          after: { type: "string" },
          unit: { type: "string" },
          duration: { type: "string" },
        },
        required: ["quote", "kind", "name", "about", "event", "when", "grain", "conditions", "remarks", "amount", "before", "after", "unit", "duration"],
      },
    },
  },
  required: ["values"],
};

type ParagraphInput = { paragraph: string; noteTitle: string; today?: Date };

export function createDescriber(mode: InferenceMode) {
  const finder = createHybrid("Find values", mode, FIND_INSTRUCTIONS, FIND_SCHEMA);
  const describer = createHybrid("Describe values", mode, DESCRIBE_INSTRUCTIONS, DESCRIBE_SCHEMA);

  const find = async ({ paragraph }: ParagraphInput): Promise<FindResult> => {
    const { text, ...timed } = await finder.ask(`Paragraph: ${paragraph}`);
    return { ...parseFound(text, paragraph), ...timed };
  };

  const describe = async ({ paragraph, noteTitle, today = new Date(), quotes }: ParagraphInput & { quotes: string[] }): Promise<DescribeResult> => {
    const prompt = [datesLine(today), `Note: ${noteTitle || "Untitled"}`, `Paragraph: ${paragraph}`, `Values: ${quotes.join(" | ")}`].join("\n");
    const { text, ...timed } = await describer.ask(prompt);
    return { values: parseDescribed(text, quotes), ...timed };
  };

  const tag = async (input: ParagraphInput & { tagged: string }): Promise<DescribedValue & Timed> => {
    const { values, ...timed } = await describe({ ...input, quotes: [input.tagged] });
    return { ...values[0]!, ...timed };
  };

  return { model: finder.model, find, describe, tag };
}

const shared = createDescriber(InferenceMode.PREFER_ON_DEVICE);

export const deviceModel = shared.model;
export const findValues = shared.find;
export const describeValues = shared.describe;
export const describeTag = shared.tag;

const WEEKDAY = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });

export function datesLine(today: Date, span = 7): string {
  const at = (offset: number) => {
    const day = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() + offset));
    return `${WEEKDAY.format(day)} ${day.toISOString().slice(0, 10)}`;
  };
  const around = Array.from({ length: span * 2 + 1 }, (_, index) => index - span)
    .filter((offset) => offset !== 0)
    .map(at);
  return `Dates: today ${at(0)}. ${around.join(", ")}.`;
}

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean) : [];

const records = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null) : [];

const nameOf = (raw: Record<string, unknown>) => (typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "value");

function parseFound(text: string, paragraph: string): { values: SpottedValue[]; requests: string[] } {
  const data = JSON.parse(text) as { values?: unknown; requests?: unknown };
  const values = records(data.values).flatMap((raw): SpottedValue[] => {
    const quote = typeof raw.quote === "string" ? raw.quote.trim() : "";
    const kind = VALUE_KINDS.find((candidate): candidate is ValueKind => candidate === raw.kind);
    return quote && kind && paragraph.includes(quote) ? [{ quote, kind, name: nameOf(raw) }] : [];
  });
  return { values, requests: strings(data.requests).filter((request) => paragraph.includes(request)) };
}

function parseDescribed(text: string, quotes: string[]): DescribedValue[] {
  const raws = records((JSON.parse(text) as { values?: unknown }).values);
  return quotes.map((quote, index): DescribedValue => {
    const raw = (raws[index]?.quote === quote ? raws[index] : raws.find((item) => item.quote === quote)) ?? raws[index] ?? {};
    const kind = TAG_KINDS.find((candidate) => candidate === raw.kind) ?? "text";
    return {
      quote,
      kind,
      name: nameOf(raw),
      about: typeof raw.about === "string" ? raw.about.trim() : "",
      event: raw.event === true,
      when: validWhen(raw.when, raw.grain),
      conditions: strings(raw.conditions),
      remarks: strings(raw.remarks),
      ...(kind === "duration" ? durationOf(raw) : amountOf(raw, quote)),
      ...unitOf(raw, kind),
    };
  });
}

function amountOf(raw: Record<string, unknown>, quote: string): Pick<ValueContext, "amount" | "before" | "after"> {
  const amount = typeof raw.amount === "string" && raw.amount.trim() !== "" ? Number(raw.amount) : Number.NaN;
  if (!Number.isFinite(amount)) return {};
  const before = typeof raw.before === "string" && quote.startsWith(raw.before) ? raw.before : "";
  const after = typeof raw.after === "string" && quote.endsWith(raw.after) && quote.length >= before.length + raw.after.length ? raw.after : "";
  return { amount, before, after };
}

function durationOf(raw: Record<string, unknown>): Pick<ValueContext, "seconds"> {
  const seconds = typeof raw.duration === "string" ? parseIsoDuration(raw.duration) : undefined;
  return seconds === undefined ? {} : { seconds };
}

function unitOf(raw: Record<string, unknown>, kind: TagKind): Pick<ValueContext, "unit"> {
  const unit = typeof raw.unit === "string" ? raw.unit : undefined;
  if (kind === "money") return isCurrency(unit) ? { unit } : {};
  if (kind === "number" || kind === "count" || kind === "duration") return isMeasure(unit) ? { unit } : {};
  return {};
}
