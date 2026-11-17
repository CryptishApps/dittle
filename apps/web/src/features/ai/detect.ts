import type { GenerativeModel, InferenceMode } from "firebase/ai";
import { createHybrid, type InferenceWhere } from "./hybrid";
import { VALUE_KINDS, type ValueKind } from "./value-shapes";

export { VALUE_KINDS, type ValueKind } from "./value-shapes";

export type DetectedValue = { quote: string; kind: ValueKind; name: string; existing: string };

export type DetectResult = {
  values: DetectedValue[];
  requests: string[];
  where: InferenceWhere;
  ms: number;
  fallbackReason?: string;
};

export const DETECT_PROMPT_VERSION = "v4";

export type KnownVariable = { name: string; value: string; note: string };

const INSTRUCTIONS = `You read one paragraph from someone's notes and list the concrete values in it: amounts of money, counts, other numbers and measurements, dates and times, durations, percentages, and the names of people and places.

For each value give:
- "quote": only the value itself, copied exactly from the paragraph. Always keep the currency sign, % sign or unit (£189, 60%, 250g, 7 nights, 45 minutes, 14 June). Leave out the thing being counted and the words around it: "80 guests" gives "80", "£38 a head" gives "£38", "£182 return" gives "£182".
- "kind": money, count, number, date, duration, percent, person or place. Times of day (10am, 9:30) are dates. A length of time (7 nights, two weeks) is a duration.
- "name": a short snake_case name for what the value means.
- "existing": the name of a known variable only if this value is about that same thing in the same context: the same value, or the paragraph says the value has changed ("now 95 guests, not 80" for the wedding guest count). A value from a different topic, or a different date, price or count, is "none".

"requests": sentences that ask you to write or add content into the note at that spot, such as "add a list of meals here", copied exactly. Reminders and to-dos for the person, such as "call the florist" or "ask about the menu", are not requests. A request is never also a value.

Ordinary words are never values. If there are no values, return an empty list.

Examples
Known variables:
- guest_count = 80 (Wedding: catering)
- wedding_date = 14 June (Wedding: venue)
Paragraph: Dinner for 12 people on 3 May with Ana at Casa Lola, about £30 each. Add a shopping list here.
Answer: {"values":[{"quote":"12","kind":"count","name":"dinner_guests","existing":"none"},{"quote":"3 May","kind":"date","name":"dinner_date","existing":"none"},{"quote":"Ana","kind":"person","name":"host","existing":"none"},{"quote":"Casa Lola","kind":"place","name":"restaurant","existing":"none"},{"quote":"£30","kind":"money","name":"price_per_person","existing":"none"}],"requests":["Add a shopping list here."]}
Paragraph: Still 80 guests for the wedding, so 10 tables. Remember to ask Sam about the cake.
Answer: {"values":[{"quote":"80","kind":"count","name":"guest_count","existing":"guest_count"},{"quote":"10","kind":"count","name":"table_count","existing":"none"},{"quote":"Sam","kind":"person","name":"cake_contact","existing":"none"}],"requests":[]}`;

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

export type Detector = {
  model: GenerativeModel;
  detect: (paragraph: string) => Promise<DetectResult>;
};

export function createDetector(mode: InferenceMode, known: KnownVariable[]): Detector {
  const hybrid = createHybrid("Find values", mode, INSTRUCTIONS, schema(known.map((variable) => variable.name)));
  const listed = known.length ? known.map((variable) => `- ${variable.name} = ${variable.value} (${variable.note})`).join("\n") : "none";

  return {
    model: hybrid.model,
    detect: async (paragraph) => {
      const { text, ...meta } = await hybrid.ask(`Known variables:\n${listed}\n\nParagraph:\n${paragraph}`);
      return { ...parse(text), ...meta };
    },
  };
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
