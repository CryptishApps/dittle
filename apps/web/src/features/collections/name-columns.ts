import { writes } from "@/features/notes/api";
import type { Collection, StoredValue } from "@/features/notes/fact";
import { createSettling } from "./settling";

const renaming = createSettling();
const SETTLE_LIMIT_MS = 8000;

export const columnsSettled = (limitMs = SETTLE_LIMIT_MS): Promise<void> => renaming.settled(limitMs);

export function tidyColumnNames(uid: string, collection: Pick<Collection, "id" | "name" | "key" | "fields">, examples: Pick<StoredValue, "text" | "field" | "name">[] = []): Promise<void> {
  return renaming.track(rename(uid, collection, examples));
}

async function rename(uid: string, collection: Pick<Collection, "id" | "name" | "key" | "fields">, examples: Pick<StoredValue, "text" | "field" | "name">[]): Promise<void> {
  if (collection.fields.length === 0) return;
  const { nameColumns } = await import("@/features/ai/columns");
  const example = (fieldId: string) => examples.find((value) => value.field === fieldId || value.name === fieldId)?.text;
  const names = await nameColumns(
    collection.name,
    collection.key.by === "when" ? "day" : "name",
    collection.fields.map((field) => ({ name: field.name, kind: field.kind, example: example(field.id) })),
  ).catch(() => undefined);
  if (!names) return;
  writes.renameFields(
    uid,
    collection.id,
    collection.fields.map((field, index) => ({ ...field, name: names[index]! })),
  );
}
