import type { Collection, CollectionField, Row, StoredValue } from "@/features/notes/fact";

export type CellPlan = { valueId: string; rowId: string; fieldId: string };

const localDay = (date: Date) => {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 10);
};

export function periodOf(value: Pick<StoredValue, "when" | "updatedAt">, today = new Date()): string {
  if (value.when && (value.when.grain === "day" || value.when.grain === "time")) return value.when.on.slice(0, 10);
  return localDay(value.updatedAt ? new Date(value.updatedAt) : today);
}

export function freeRowId(base: string, taken: (rowId: string) => boolean): string {
  if (!taken(base)) return base;
  for (let index = 2; ; index += 1) {
    const candidate = `${base}.${index}`;
    if (!taken(candidate)) return candidate;
  }
}

const fieldFor = (value: StoredValue): CollectionField => ({ id: value.name ?? "value", name: (value.name ?? "value").replaceAll("_", " "), kind: value.kind ?? "text" });

export function siblingsOf(value: StoredValue, values: StoredValue[]): StoredValue[] {
  return values.filter((other) => {
    if (other.id === value.id || other.field || !value.origin?.noteId || other.origin?.noteId !== value.origin.noteId) return false;
    if (value.event) return Boolean(other.event) && periodOf(other) === periodOf(value);
    return !other.event && other.origin?.sentence === value.origin.sentence;
  });
}

export type CollectionPlan = { collection: Omit<Collection, "createdAt">; rows: Omit<Row, "createdAt">[]; cells: CellPlan[] };

export function planCollection(value: StoredValue, values: StoredValue[], name: string): CollectionPlan {
  const id = crypto.randomUUID();
  const members = [value, ...siblingsOf(value, values)];
  const fields = new Map<string, CollectionField>();
  if (value.event) fields.set("date", { id: "date", name: "date", kind: "date" });
  for (const member of members) {
    const field = fieldFor(member);
    if (!fields.has(field.id)) fields.set(field.id, field);
  }
  const rowLabel = value.subject?.label || name;
  const row: Omit<Row, "createdAt"> = value.event
    ? { id: `${id}.${periodOf(value)}`, collectionId: id, label: periodOf(value), period: periodOf(value) }
    : { id: `${id}.${crypto.randomUUID()}`, collectionId: id, label: rowLabel };
  const used = new Set<string>();
  const cells = members.flatMap((member) => {
    const fieldId = fieldFor(member).id;
    if (used.has(fieldId)) return [];
    used.add(fieldId);
    return [{ valueId: member.id, rowId: row.id, fieldId }];
  });
  return {
    collection: { id, name, rowLabel, fields: [...fields.values()], key: value.event ? { by: "when", grain: "day" } : { by: "name" } },
    rows: [row],
    cells,
  };
}

export function rowForPlacement(collection: Collection, value: StoredValue, fieldId: string, values: StoredValue[], rows: Row[]): Omit<Row, "createdAt"> | null {
  if (collection.key.by !== "when") return null;
  const period = periodOf(value);
  const occupied = (rowId: string) => values.some((other) => other.id !== value.id && other.subject?.entityId === rowId && other.field === fieldId);
  const id = freeRowId(`${collection.id}.${period}`, occupied);
  const existing = rows.find((row) => row.id === id);
  return existing ?? { id, collectionId: collection.id, label: period, period };
}
