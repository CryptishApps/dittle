import { InferenceMode } from "firebase/ai";
import type { TagKind } from "./describe";
import { createHybrid, type InferenceWhere } from "./hybrid";

export const PLACE_PROMPT_VERSION = "v1";

const MAX_COLLECTIONS = 6;
const MAX_FIELDS = 8;
const COLLECTION_KEYS = Array.from({ length: MAX_COLLECTIONS }, (_, index) => `k${index + 1}`);
const FIELD_KEYS = Array.from({ length: MAX_FIELDS }, (_, index) => `f${index + 1}`);

export type PlaceItem = { text: string; kind?: TagKind; name?: string; about?: string };
export type PlaceCollection = { name: string; rowLabel: string; per: "day" | "name"; fields: { name: string; kind: TagKind }[] };
export type PlaceResult = { collection: number | null; field: number | null; where: InferenceWhere; ms: number };

const INSTRUCTIONS = `Someone tracks collections in their notes, such as a table of runs or of bills. Decide whether a new value belongs in one of the collections, and in which field.

Pick a collection only when the value is clearly one of its rows' details, about the same kind of thing as the collection's rows. Otherwise answer none. A field must match what the value measures. If no field fits, answer none for the field.

Example
Sentence: Swam 40 lengths this morning in 35 minutes.
Item: 35 minutes · duration · swim_time · about swim
Collections:
k1: Swims, one row per day. f1 date (date), f2 lengths (count), f3 time (duration)
k2: Bills, one row per day. f1 date (date), f2 amount (money)
Answer: {"collection":"k1","field":"f3"}`;

const SCHEMA = {
  type: "object",
  properties: {
    collection: { type: "string", enum: [...COLLECTION_KEYS, "none"] },
    field: { type: "string", enum: [...FIELD_KEYS, "none"] },
  },
  required: ["collection", "field"],
};

const placer = createHybrid("Place a value", InferenceMode.PREFER_ON_DEVICE, INSTRUCTIONS, SCHEMA);

export async function placeValue({ sentence, item, collections }: { sentence: string; item: PlaceItem; collections: PlaceCollection[] }): Promise<PlaceResult> {
  const shown = collections.slice(0, MAX_COLLECTIONS);
  const prompt = [
    `Sentence: ${sentence}`,
    `Item: ${[item.text, item.kind, item.name, item.about && `about ${item.about}`].filter(Boolean).join(" · ")}`,
    "Collections:",
    ...shown.map(
      (collection, index) =>
        `k${index + 1}: ${collection.name}, one row per ${collection.per === "day" ? "day" : collection.rowLabel}. ${collection.fields
          .slice(0, MAX_FIELDS)
          .map((field, fieldIndex) => `f${fieldIndex + 1} ${field.name} (${field.kind})`)
          .join(", ")}`,
    ),
  ].join("\n");
  const { text, where, ms } = await placer.ask(prompt);
  const data = JSON.parse(text) as { collection?: unknown; field?: unknown };
  const collection = typeof data.collection === "string" ? COLLECTION_KEYS.indexOf(data.collection) : -1;
  const field = typeof data.field === "string" ? FIELD_KEYS.indexOf(data.field) : -1;
  const chosen = collection >= 0 && collection < shown.length ? collection : null;
  const fieldOk = chosen !== null && field >= 0 && field < Math.min(MAX_FIELDS, shown[chosen]!.fields.length);
  return { collection: chosen, field: fieldOk ? field : null, where, ms };
}
