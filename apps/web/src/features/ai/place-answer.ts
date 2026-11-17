import type { TagKind } from "./describe";

export const MAX_COLLECTIONS = 6;
export const MAX_FIELDS = 8;
export const MAX_ROWS = 30;
const MAX_LABEL = 80;

export const COLLECTION_KEYS = Array.from({ length: MAX_COLLECTIONS }, (_, index) => `k${index + 1}`);
export const FIELD_KEYS = Array.from({ length: MAX_FIELDS }, (_, index) => `f${index + 1}`);
export const ROW_KEYS = Array.from({ length: MAX_ROWS }, (_, index) => `r${index + 1}`);

export type PlaceItem = { text: string; kind?: TagKind; name?: string; about?: string };
export type PlaceCollection = { name: string; per: "day" | "name"; fields: { name: string; kind: TagKind }[]; rows: string[] };
export type PlaceRow = { row: number } | { label: string };
export type PlaceAnswer = { collection: number | null; field: number | null; row: PlaceRow | null };

const indexIn = (keys: string[], key: unknown, limit: number) => {
  const index = typeof key === "string" ? keys.indexOf(key) : -1;
  return index >= 0 && index < limit ? index : null;
};

function rowFrom(data: { row?: unknown; label?: unknown }, collection: PlaceCollection, sentence: string): PlaceRow | null {
  if (collection.per === "day") return null;
  const existing = indexIn(ROW_KEYS, data.row, Math.min(MAX_ROWS, collection.rows.length));
  if (existing !== null) return { row: existing };
  const label = typeof data.label === "string" ? data.label.trim() : "";
  const quoted = label && label.length <= MAX_LABEL ? quoteIn(sentence, label) : undefined;
  return data.row === "new" && quoted ? { label: quoted } : null;
}

function quoteIn(sentence: string, label: string): string | undefined {
  if (sentence.includes(label)) return label;
  const wanted = label.toLocaleLowerCase();
  const at = sentence.toLocaleLowerCase().indexOf(wanted);
  const found = at >= 0 ? sentence.slice(at, at + label.length) : undefined;
  return found?.toLocaleLowerCase() === wanted ? found : undefined;
}

export function readPlaceAnswer(text: string, shown: PlaceCollection[], sentence: string): PlaceAnswer {
  const data = JSON.parse(text) as { collection?: unknown; field?: unknown; row?: unknown; label?: unknown };
  const collection = indexIn(COLLECTION_KEYS, data.collection, shown.length);
  if (collection === null) return { collection: null, field: null, row: null };
  const chosen = shown[collection]!;
  return { collection, field: indexIn(FIELD_KEYS, data.field, Math.min(MAX_FIELDS, chosen.fields.length)), row: rowFrom(data, chosen, sentence) };
}

export function placePrompt(sentence: string, item: PlaceItem, shown: PlaceCollection[]): string {
  return [
    `Sentence: ${sentence}`,
    `Item: ${[item.text, item.kind, item.name, item.about && `about ${item.about}`].filter(Boolean).join(" · ")}`,
    "Collections:",
    ...shown.map((collection, index) => {
      const fields = collection.fields
        .slice(0, MAX_FIELDS)
        .map((field, fieldIndex) => `f${fieldIndex + 1} ${field.name} (${field.kind})`)
        .join(", ");
      const head = `k${index + 1}: ${collection.name}, one row per ${collection.per === "day" ? "day" : "named thing"}. ${fields}`;
      if (collection.per === "day") return head;
      const rows = collection.rows.slice(0, MAX_ROWS).map((label, rowIndex) => `r${rowIndex + 1} ${label}`);
      return `${head}. Rows: ${rows.length > 0 ? rows.join(", ") : "none yet"}`;
    }),
  ].join("\n");
}
