import { InferenceMode } from "firebase/ai";
import { createHybrid, type InferenceWhere } from "./hybrid";
import { COLLECTION_KEYS, FIELD_KEYS, MAX_COLLECTIONS, placePrompt, readPlaceAnswer, ROW_KEYS, type PlaceAnswer, type PlaceCollection, type PlaceItem } from "./place-answer";

export const PLACE_PROMPT_VERSION = "v3";

export type { PlaceCollection, PlaceItem, PlaceRow } from "./place-answer";
export type PlaceResult = PlaceAnswer & { where: InferenceWhere; ms: number };

const INSTRUCTIONS = `Someone tracks collections in their notes, such as a table of runs or of vendors. Decide whether a new value belongs in one of the collections, in which field, and for a collection with one row per named thing, in which row.

Pick a collection only when the value is clearly one of its rows' details. The collection's name says what its rows are. A log such as Runs or Swims holds one kind of thing. A plan's list such as Things to do, Bookings or Places can hold different kinds of things, as long as the value is the same detail its rows have, such as a price each or a date. Otherwise answer none.

A field must measure the same thing as the value. Field names were taken from the first row, so they can be narrower than the field: a "train ticket price" field in a list of things to do holds the price of each thing. If no field fits, answer none for the field.

For a collection with one row per day, answer none for the row and an empty label.
For a collection with one row per named thing, pick the row the value is about. If the value is about a thing that has no row yet, answer new and give its name as the label, copied exactly from the sentence. Otherwise give an empty label.

Example
Sentence: Swam 40 lengths this morning in 35 minutes.
Item: 35 minutes · duration · swim_time · about swim
Collections:
k1: Swims, one row per day. f1 date (date), f2 lengths (count), f3 time (duration)
k2: Vendors, one row per named thing. f1 price per head (money). Rows: r1 Rosa's Kitchen, r2 Hops & Co
Answer: {"collection":"k1","field":"f3","row":"none","label":""}

Example
Sentence: Hops & Co came back at £38 a head.
Item: £38 · money · price_per_head · about Hops & Co
Collections:
k1: Swims, one row per day. f1 date (date), f2 lengths (count), f3 time (duration)
k2: Vendors, one row per named thing. f1 price per head (money), f2 deposit (money). Rows: r1 Rosa's Kitchen, r2 Hops & Co
Answer: {"collection":"k2","field":"f1","row":"r2","label":""}

Example
Sentence: Green Fork wants a £200 deposit.
Item: £200 · money · deposit · about Green Fork
Collections:
k1: Vendors, one row per named thing. f1 price per head (money), f2 deposit (money). Rows: r1 Rosa's Kitchen, r2 Hops & Co
Answer: {"collection":"k1","field":"f2","row":"new","label":"Green Fork"}`;

const SCHEMA = {
  type: "object",
  properties: {
    collection: { type: "string", enum: [...COLLECTION_KEYS, "none"] },
    field: { type: "string", enum: [...FIELD_KEYS, "none"] },
    row: { type: "string", enum: [...ROW_KEYS, "new", "none"] },
    label: { type: "string" },
  },
  required: ["collection", "field", "row", "label"],
};

const placer = createHybrid("Place a value", InferenceMode.PREFER_ON_DEVICE, INSTRUCTIONS, SCHEMA);

export async function placeValue({ sentence, item, collections }: { sentence: string; item: PlaceItem; collections: PlaceCollection[] }): Promise<PlaceResult> {
  const shown = collections.slice(0, MAX_COLLECTIONS);
  const { text, where, ms } = await placer.ask(placePrompt(sentence, item, shown));
  return { ...readPlaceAnswer(text, shown, sentence), where, ms };
}
