import { InferenceMode } from "firebase/ai";
import { VALUE_KINDS } from "./detect";
import { createHybrid, type InferenceWhere } from "./hybrid";

export const DESCRIBE_PROMPT_VERSION = "v5";

export const TAG_KINDS = [...VALUE_KINDS, "text"] as const;
export type TagKind = (typeof TAG_KINDS)[number];

export const GRAINS = ["time", "day", "month", "year"] as const;
export type Grain = (typeof GRAINS)[number];

export type ValueContext = {
  about: string;
  event: boolean;
  when?: { on: string; grain: Grain };
  conditions: string[];
  remarks: string[];
};

export type DescribedValue = { quote: string; kind: TagKind; name: string } & ValueContext;

export type DescribeResult = {
  values: DescribedValue[];
  requests: string[];
  where: InferenceWhere;
  ms: number;
};

const INSTRUCTIONS = `You read one paragraph from someone's notes and list the concrete values in it: amounts of money, counts, other numbers and measurements, dates and times, durations, percentages, and the names of people and places.

For each value give:
- "quote": only the value, copied exactly from the paragraph. Keep its currency sign, % sign or unit (£189, 60%, 250g, 7 nights, 14 June). Leave out the thing being counted: "80 guests" gives "80".
- "kind": money, count, number, date, duration, percent, person or place. Times of day are dates. A length of time is a duration.
- "name": a short snake_case name for what the value measures.
- "about": the thing the value belongs to, in one to three words, such as "run", "Rosa's Kitchen" or "wedding". For a person or place, the role it plays, such as "caterer" or "venue".
- "event": true if the value records one occasion that happened or will happen, such as a run, a payment or a delivery. false if it stays true until it changes, such as a price, a capacity or a team size.
- "when": the single occasion the value applies to, looked up in the Dates line, written as YYYY-MM-DD, YYYY-MM-DDTHH:MM, YYYY-MM or YYYY. Empty when the paragraph names no single occasion.
- "grain": day, time, month or year to match "when", or none when "when" is empty.
- "conditions": phrases copied from the paragraph that limit when or for whom the value is true, such as "on Saturdays" or "for members". A repeating time is a condition, never "when". Empty if none.
- "remarks": single words or short phrases copied from the paragraph that say something notable about the value without limiting it, such as "fastest", "roughly" or "quoted". Empty if none.

"requests": sentences that ask you to write or add content into the note at that spot, copied exactly. Reminders and to-dos for the person are not requests. A request is never also a value.

Ordinary words are never values. If there are no values, return an empty list.

If the input has a "Tagged" line, return exactly one value: the tagged text, with "quote" copied exactly as tagged. Its kind may also be text when it is none of the others. Return no requests.

Examples
Dates: today Mon 2026-03-09. Fri 2026-03-06, Sat 2026-03-07, Sun 2026-03-08, Tue 2026-03-10.
Note: Garden
Paragraph: Paid Tom £45 on Friday for mowing, roughly an hour. He charges £50 on weekends. Add a planting plan here.
Answer: {"values":[{"quote":"Tom","kind":"person","name":"gardener","about":"gardener","event":false,"when":"","grain":"none","conditions":[],"remarks":[]},{"quote":"£45","kind":"money","name":"mowing_payment","about":"mowing","event":true,"when":"2026-03-06","grain":"day","conditions":[],"remarks":[]},{"quote":"Friday","kind":"date","name":"mowing_date","about":"mowing","event":true,"when":"2026-03-06","grain":"day","conditions":[],"remarks":[]},{"quote":"an hour","kind":"duration","name":"mowing_time","about":"mowing","event":true,"when":"2026-03-06","grain":"day","conditions":[],"remarks":["roughly"]},{"quote":"£50","kind":"money","name":"mowing_price","about":"Tom","event":false,"when":"","grain":"none","conditions":["on weekends"],"remarks":[]}],"requests":["Add a planting plan here."]}

Dates: today Thu 2026-07-02. Tue 2026-06-30, Wed 2026-07-01, Fri 2026-07-03.
Note: Book club
Paragraph: Book club meets at 7pm every second Tuesday. Twelve members so far.
Tagged: 7pm
Answer: {"values":[{"quote":"7pm","kind":"date","name":"meeting_time","about":"book club","event":false,"when":"","grain":"none","conditions":["every second Tuesday"],"remarks":[]}],"requests":[]}`;

function schema(kinds: readonly string[]) {
  const phrases = { type: "array", items: { type: "string" } };
  return {
    type: "object",
    properties: {
      values: {
        type: "array",
        items: {
          type: "object",
          properties: {
            quote: { type: "string" },
            kind: { type: "string", enum: [...kinds] },
            name: { type: "string" },
            about: { type: "string" },
            event: { type: "boolean" },
            when: { type: "string" },
            grain: { type: "string", enum: [...GRAINS, "none"] },
            conditions: phrases,
            remarks: phrases,
          },
          required: ["quote", "kind", "name", "about", "event", "when", "grain", "conditions", "remarks"],
        },
      },
      requests: phrases,
    },
    required: ["values", "requests"],
  };
}

type DescribeInput = { paragraph: string; noteTitle: string; today?: Date };

const prompt = ({ paragraph, noteTitle, today = new Date() }: DescribeInput, tagged?: string) =>
  [datesLine(today), `Note: ${noteTitle || "Untitled"}`, `Paragraph: ${paragraph}`, ...(tagged ? [`Tagged: ${tagged}`] : [])].join("\n");

export function createDescriber(mode: InferenceMode) {
  const paragraphs = createHybrid("Find values", mode, INSTRUCTIONS, schema(VALUE_KINDS));
  const tags = createHybrid("Describe a tag", mode, INSTRUCTIONS, schema(TAG_KINDS));
  return {
    model: paragraphs.model,
    paragraph: async (input: DescribeInput): Promise<DescribeResult> => {
      const { text, where, ms } = await paragraphs.ask(prompt(input));
      return { ...parse(text, input.paragraph), where, ms };
    },
    tag: async (input: DescribeInput & { tagged: string }): Promise<DescribedValue & { where: InferenceWhere; ms: number }> => {
      const { text, where, ms } = await tags.ask(prompt(input, input.tagged));
      const [first] = parse(text, input.paragraph).values;
      const fallback: DescribedValue = { quote: input.tagged, kind: "text", name: "value", about: "", event: false, conditions: [], remarks: [] };
      return { ...(first ?? fallback), quote: input.tagged, where, ms };
    },
  };
}

const describer = createDescriber(InferenceMode.PREFER_ON_DEVICE);

export const deviceModel = describer.model;
export const describeParagraph = describer.paragraph;
export const describeTag = describer.tag;

const WEEKDAY = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });

const isoDay = (date: Date) => date.toISOString().slice(0, 10);

export function datesLine(today: Date, span = 7): string {
  const at = (offset: number) => {
    const day = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() + offset));
    return `${WEEKDAY.format(day)} ${isoDay(day)}`;
  };
  const around = Array.from({ length: span * 2 + 1 }, (_, index) => index - span)
    .filter((offset) => offset !== 0)
    .map(at);
  return `Dates: today ${at(0)}. ${around.join(", ")}.`;
}

const WHEN_SHAPE: Record<Grain, RegExp> = {
  time: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
  day: /^\d{4}-\d{2}-\d{2}$/,
  month: /^\d{4}-\d{2}$/,
  year: /^\d{4}$/,
};

function validWhen(on: unknown, grain: unknown): ValueContext["when"] {
  const found = GRAINS.find((candidate) => candidate === grain);
  if (!found || typeof on !== "string" || !WHEN_SHAPE[found].test(on)) return undefined;
  const probe = found === "year" ? `${on}-01-01` : found === "month" ? `${on}-01` : on;
  return Number.isNaN(Date.parse(probe)) ? undefined : { on, grain: found };
}

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean) : [];

function parse(text: string, paragraph: string): Pick<DescribeResult, "values" | "requests"> {
  const data = JSON.parse(text) as { values?: unknown; requests?: unknown };
  const values = (Array.isArray(data.values) ? data.values : []).flatMap((item): DescribedValue[] => {
    if (typeof item !== "object" || item === null) return [];
    const raw = item as Record<string, unknown>;
    const quote = typeof raw.quote === "string" ? raw.quote.trim() : "";
    const kind = TAG_KINDS.find((candidate) => candidate === raw.kind);
    if (!quote || !kind) return [];
    return [
      {
        quote,
        kind,
        name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "value",
        about: typeof raw.about === "string" ? raw.about.trim() : "",
        event: raw.event === true,
        when: validWhen(raw.when, raw.grain),
        conditions: strings(raw.conditions),
        remarks: strings(raw.remarks),
      },
    ];
  });
  const requests = strings(data.requests).filter((request) => paragraph.includes(request));
  return { values, requests };
}
