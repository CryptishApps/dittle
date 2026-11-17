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
  const rowLabel = value.event ? value.subject?.label || name : name;
  const row: Omit<Row, "createdAt"> = value.event
    ? { id: `${id}.${periodOf(value)}`, collectionId: id, label: periodOf(value), period: periodOf(value) }
    : { id: `${id}.${crypto.randomUUID()}`, collectionId: id, label: value.subject?.label || name };
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

export type NewRow = Omit<Row, "createdAt">;
export type RowPick = { row: number } | { label: string };
export type Placement = { row: NewRow; newRow: boolean; occupant?: StoredValue; another?: { row: NewRow; newRow: boolean } };

const occupantOf = (rowId: string, fieldId: string, value: StoredValue, values: StoredValue[]) =>
  values.find((other) => other.id !== value.id && other.subject?.entityId === rowId && other.field === fieldId);

const dayRow = (collection: Collection, id: string, period: string, rows: Row[]) => {
  const existing = rows.find((row) => row.id === id);
  return { row: existing ?? { id, collectionId: collection.id, label: period, period }, newRow: !existing };
};

export function placeByDay(collection: Collection, value: StoredValue, fieldId: string, values: StoredValue[], rows: Row[]): Placement {
  const period = periodOf(value);
  const base = `${collection.id}.${period}`;
  const occupant = occupantOf(base, fieldId, value, values);
  if (!occupant) return dayRow(collection, base, period, rows);
  const anotherId = freeRowId(base, (rowId) => Boolean(occupantOf(rowId, fieldId, value, values)));
  return { ...dayRow(collection, base, period, rows), occupant, another: dayRow(collection, anotherId, period, rows) };
}

export function rowOptions(collection: Collection, rows: Row[]): Row[] {
  return rows.filter((row) => row.collectionId === collection.id).sort((a, b) => b.createdAt - a.createdAt);
}

export function placeByName(collection: Collection, pick: RowPick, options: Row[], value: StoredValue, fieldId: string, values: StoredValue[]): Placement | null {
  if ("label" in pick) return { row: { id: `${collection.id}.${crypto.randomUUID()}`, collectionId: collection.id, label: pick.label }, newRow: true };
  const row = options[pick.row];
  if (!row) return null;
  const occupant = occupantOf(row.id, fieldId, value, values);
  return occupant ? { row, newRow: false, occupant } : { row, newRow: false };
}

export type FactGroup = { key: string; about: string; period?: string; facts: StoredValue[] };

export function groupsOf(values: StoredValue[]): FactGroup[] {
  const groups = new Map<string, FactGroup>();
  for (const value of values) {
    const about = value.subject?.label;
    const noteId = value.origin?.noteId;
    if (value.field || !value.kind || !about || !noteId) continue;
    const period = value.event ? periodOf(value) : undefined;
    const key = value.event ? `${noteId}|${period}` : `${noteId}|${about}`;
    const group = groups.get(key) ?? { key, about, period, facts: [] };
    group.facts.push(value);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => (b.period ?? "").localeCompare(a.period ?? ""));
}

type ProposalShape = { name: string; rowLabel: string; per: "day" | "name"; fields: { name: string; kind: CollectionField["kind"]; sources: string[] }[]; groups: number[] };

const fieldId = (name: string) => name.trim().toLowerCase().replaceAll(/\s+/g, "_");

export function planFromProposal(proposal: ProposalShape, groups: FactGroup[]): CollectionPlan {
  const id = crypto.randomUUID();
  const fields: CollectionField[] = [
    ...(proposal.per === "day" ? [{ id: "date", name: "date", kind: "date" as const }] : []),
    ...proposal.fields.map((field) => ({ id: fieldId(field.name), name: field.name, kind: field.kind })),
  ];
  const rows: Omit<Row, "createdAt">[] = [];
  const cells: CellPlan[] = [];
  for (const index of proposal.groups) {
    const group = groups[index];
    if (!group) continue;
    const row: Omit<Row, "createdAt"> =
      proposal.per === "day" && group.period
        ? { id: freeRowId(`${id}.${group.period}`, (rowId) => rows.some((taken) => taken.id === rowId)), collectionId: id, label: group.period, period: group.period }
        : { id: `${id}.${crypto.randomUUID()}`, collectionId: id, label: group.about };
    rows.push(row);
    const filled = new Set<string>();
    for (const fact of group.facts) {
      const field = proposal.fields.find((candidate) => fact.name && candidate.sources.includes(fact.name));
      if (!field || filled.has(fieldId(field.name))) continue;
      filled.add(fieldId(field.name));
      cells.push({ valueId: fact.id, rowId: row.id, fieldId: fieldId(field.name) });
    }
  }
  return {
    collection: { id, name: proposal.name, rowLabel: proposal.rowLabel, fields, key: proposal.per === "day" ? { by: "when", grain: "day" } : { by: "name" } },
    rows,
    cells,
  };
}
