import type { Collection, CollectionField, Row, StoredValue } from "@/features/notes/fact";
import { formatAmount } from "@/features/formulas/apply";
import { rowLabel } from "./format";

export type FieldTotal = { field: CollectionField; text: string; counted: number; otherUnits: number };

export type CollectionSummary = {
  collection: Collection;
  count: number;
  scope: "this month" | "in total";
  totals: FieldTotal[];
  latest?: { label: string; cells: string[] };
};

const SUMMABLE = new Set(["money", "count", "number"]);
const unitOf = (value: StoredValue) => `${(value.before ?? "").trim()}|${(value.after ?? "").trim()}`;

function totalFor(field: CollectionField, cells: StoredValue[]): FieldTotal | undefined {
  const amounts = cells.filter((cell) => cell.amount !== undefined && SUMMABLE.has(cell.kind ?? field.kind));
  if (amounts.length === 0) return undefined;
  const tally = new Map<string, StoredValue[]>();
  for (const cell of amounts) tally.set(unitOf(cell), [...(tally.get(unitOf(cell)) ?? []), cell]);
  const [main] = [...tally.values()].sort((a, b) => b.length - a.length);
  if (!main) return undefined;
  const sum = main.reduce((total, cell) => total + cell.amount!, 0);
  return { field, text: formatAmount(main[0]!, sum), counted: main.length, otherUnits: amounts.length - main.length };
}

const monthOf = (today: Date) => `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
const dayOf = (today: Date) => `${monthOf(today)}-${String(today.getDate()).padStart(2, "0")}`;

export function summariseCollection(collection: Collection, rows: Row[], values: StoredValue[], today = new Date()): CollectionSummary {
  const mine = rows.filter((row) => row.collectionId === collection.id);
  const byDay = collection.key.by === "when";
  const thisMonth = byDay ? mine.filter((row) => row.period?.startsWith(monthOf(today))) : [];
  const counted = byDay && thisMonth.length > 0 ? thisMonth : mine;
  const newest = byDay ? [...mine].sort((a, b) => b.id.localeCompare(a.id))[0] : [...mine].sort((a, b) => b.createdAt - a.createdAt)[0];
  const columns = collection.fields.filter((field) => !(byDay && field.kind === "date"));
  const cells = newest
    ? columns.flatMap((field) => values.find((value) => value.subject?.entityId === newest.id && value.field === field.id)?.text ?? [])
    : [];
  const countedIds = new Set(counted.map((row) => row.id));
  const totals = columns.flatMap((field) => totalFor(field, values.filter((value) => value.field === field.id && countedIds.has(value.subject?.entityId ?? ""))) ?? []);
  return {
    collection,
    count: counted.length,
    scope: byDay && thisMonth.length > 0 ? "this month" : "in total",
    totals,
    latest: newest ? { label: rowLabel(newest), cells } : undefined,
  };
}

export type Upcoming = { value: StoredValue; on: string };

export function upcomingDates(values: StoredValue[], today = new Date(), limit = 3): Upcoming[] {
  const from = dayOf(today);
  return values
    .flatMap((value) => {
      const on = value.when && (value.when.grain === "day" || value.when.grain === "time") ? value.when.on.slice(0, 10) : undefined;
      return value.kind === "date" && on && on >= from ? [{ value, on }] : [];
    })
    .sort((a, b) => a.on.localeCompare(b.on))
    .slice(0, limit);
}

export function daysUntil(on: string, today = new Date()): number {
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((Date.parse(`${on}T00:00:00Z`) - start) / 86_400_000);
}
