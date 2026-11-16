import { InferenceMode } from "firebase/ai";
import { VALUE_KINDS } from "./detect";
import { createHybrid, type InferenceWhere } from "./hybrid";

export const TAG_KINDS = [...VALUE_KINDS, "text"] as const;
export type TagKind = (typeof TAG_KINDS)[number];

export type ValueName = { kind: TagKind; name: string; where: InferenceWhere; ms: number };

const INSTRUCTIONS = `Someone tagged a value in their notes. Say what kind of value it is and give it a short snake_case name for what it means in that sentence.

"kind": money, count, number, date, duration, percent, person, place, or text for anything else. Times of day (10am, 9:30) are dates. A length of time (7 nights, two weeks) is a duration.

Examples
Sentence: Rosa's Kitchen can do a buffet for 80 guests at £38 a head.
Value: £38
Answer: {"kind":"money","name":"price_per_head"}
Sentence: Booked Hartley Barn for 14 June.
Value: Hartley Barn
Answer: {"kind":"place","name":"venue"}`;

const SCHEMA = {
  type: "object",
  properties: {
    kind: { type: "string", enum: [...TAG_KINDS] },
    name: { type: "string" },
  },
  required: ["kind", "name"],
};

const namer = createHybrid(InferenceMode.PREFER_ON_DEVICE, INSTRUCTIONS, SCHEMA);

export async function nameValue(sentence: string, value: string): Promise<ValueName> {
  const { text, where, ms } = await namer.ask(`Sentence: ${sentence}\nValue: ${value}`);
  const data = JSON.parse(text) as { kind?: unknown; name?: unknown };
  const kind = TAG_KINDS.find((candidate) => candidate === data.kind) ?? "text";
  const name = typeof data.name === "string" && data.name.trim() ? data.name.trim() : "value";
  return { kind, name, where, ms };
}
