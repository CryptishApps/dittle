import type { QueryClient } from "@tanstack/react-query";
import { collectionsQuery, writes } from "@/features/notes/api";
import type { Collection, StoredValue } from "@/features/notes/fact";
import { createSettling } from "./settling";

const renaming = createSettling();
const SETTLE_LIMIT_MS = 8000;

export const columnsSettled = (limitMs = SETTLE_LIMIT_MS): Promise<void> => renaming.settled(limitMs);

export function tidyColumnNames(queryClient: QueryClient, uid: string, collection: Pick<Collection, "id" | "name" | "key" | "fields">, examples: Pick<StoredValue, "text" | "field" | "name">[] = []): Promise<void> {
  return renaming.track(rename(queryClient, uid, collection, examples));
}

async function rename(queryClient: QueryClient, uid: string, collection: Pick<Collection, "id" | "name" | "key" | "fields">, examples: Pick<StoredValue, "text" | "field" | "name">[]): Promise<void> {
  if (collection.fields.length === 0) return;
  const { nameColumns } = await import("@/features/ai/columns");
  const example = (fieldId: string) => examples.find((value) => value.field === fieldId || value.name === fieldId)?.text;
  const names = await nameColumns(
    collection.name,
    collection.key.by === "when" ? "day" : "name",
    collection.fields.map((field) => ({ name: field.name, kind: field.kind, example: example(field.id) })),
  ).catch(() => undefined);
  if (!names) return;
  const fields = collection.fields.map((field, index) => ({ ...field, name: names[index]! }));
  queryClient.setQueryData(collectionsQuery(uid).queryKey, (list) => list?.map((item) => (item.id === collection.id ? { ...item, fields } : item)));
  writes.renameFields(uid, collection.id, fields);
}
