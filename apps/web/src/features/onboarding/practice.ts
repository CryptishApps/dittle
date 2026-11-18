import type { PlaceAnswer, PlaceCollection } from "@/features/ai/place-answer";
import type { TagKind } from "@/features/ai/value-shapes";
import { dayLabel } from "@/features/collections/format";
import { rowOptions } from "@/features/collections/logic";
import type { Collection, Row } from "@/features/notes/fact";
import { sentenceOf, type Recipe } from "./recipes";

export type Where = { at: "note" } | { at: "collection"; collection: string; field?: string; row?: string; sure: boolean };

export type Shelf = { collections: Collection[]; options: Row[][] };

export function shelfOf(collections: Collection[], rows: Row[]): Shelf {
  return { collections, options: collections.map((collection) => (collection.key.by === "name" ? rowOptions(collection, rows) : [])) };
}

export function placeCollections({ collections, options }: Shelf): PlaceCollection[] {
  return collections.map((collection, index) => ({
    name: collection.name,
    per: collection.key.by === "when" ? "day" : "name",
    fields: collection.fields,
    rows: options[index]!.map((row) => row.label),
  }));
}

const isoDay = (date: Date) => new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString().slice(0, 10);

export function whereFrom(answer: PlaceAnswer, { collections, options }: Shelf, value: { kind?: TagKind; when?: { on: string } }, today: Date): Where {
  const collection = answer.collection === null ? undefined : collections[answer.collection];
  if (!collection) return { at: "note" };
  const byDay = collection.key.by === "when";
  const picked = answer.field === null ? undefined : collection.fields[answer.field];
  const fits = picked && !(byDay && picked.kind === "date") && (!value.kind || picked.kind === "text" || picked.kind === value.kind);
  const existing = answer.row && "row" in answer.row ? options[answer.collection!]?.[answer.row.row]?.label : undefined;
  const row = byDay ? dayLabel(value.when?.on ?? isoDay(today)) : answer.row && "label" in answer.row ? answer.row.label : existing;
  const field = fits ? picked.name : byDay && value.kind === "date" ? "Date" : undefined;
  return { at: "collection", collection: collection.name, ...(field && { field }), ...(row && { row }), sure: answer.sure && Boolean(field) };
}

const FALLBACK = "Ran 5 km before work in 28 minutes. Lunch with Sam came to £14.50, and the dentist is on Thursday at 3pm.";

export function practiceExample(recipes: Recipe[]): string {
  const clauses = recipes.slice(0, 2).flatMap((recipe) => {
    const sample = recipe.extras.at(-1) ?? recipe.samples.at(-1);
    return sample ? [sentenceOf(sample.parts)] : [];
  });
  if (clauses.length === 0) return FALLBACK;
  return [...clauses, "Lunch came to £8.50."].join(" ");
}
