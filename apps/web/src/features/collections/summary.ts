import type { CalculatedColumn, Collection, CollectionField, Row, StoredValue } from "@/features/notes/fact";
import { formatAmount } from "@/features/formulas/apply";
import { formatDuration } from "@/features/formulas/duration";
import { isMeasure } from "@/features/formulas/units";
import { columnAverage, columnValue, type ColumnAverage } from "./columns";
import { rowLabel } from "./format";
import { scaleOf, scalesOf, sizeIn, withUnits } from "./scale";

export type FieldTotal = { field: CollectionField; text: string; average?: string; counted: number; otherUnits: number };

export type CollectionSummary = {
  collection: Collection;
  count: number;
  scope: "this month" | "in total";
  totals: FieldTotal[];
  latest?: { label: string; cells: string[] };
};

const SUMMABLE = new Set(["money", "count", "number"]);

const mean = (numbers: number[]) => numbers.reduce((total, number) => total + number, 0) / numbers.length;

function durationTotal(field: CollectionField, cells: StoredValue[]): FieldTotal | undefined {
  const timed = cells.filter((cell) => cell.seconds !== undefined);
  const lengths = timed.flatMap((cell) => (isMeasure(cell.unit) ? [] : [cell.seconds!]));
  if (lengths.length === 0) return undefined;
  const sum = lengths.reduce((total, seconds) => total + seconds, 0);
  return {
    field,
    text: formatDuration(sum),
    ...(lengths.length > 1 && { average: formatDuration(mean(lengths)) }),
    counted: lengths.length,
    otherUnits: timed.length - lengths.length,
  };
}

function totalFor(field: CollectionField, cells: StoredValue[]): FieldTotal | undefined {
  if (field.kind === "duration") return durationTotal(field, cells);
  const amounts = cells.filter((cell) => cell.amount !== undefined && SUMMABLE.has(cell.kind ?? field.kind));
  const scale = scaleOf(amounts);
  if (!scale) return undefined;
  const sizes = amounts.flatMap((cell) => sizeIn(cell, scale) ?? []);
  const sum = sizes.reduce((total, size) => total + size, 0);
  return {
    field,
    text: formatAmount(scale, sum, 1),
    ...(sizes.length > 1 && { average: formatAmount(scale, sum / sizes.length, 1) }),
    counted: sizes.length,
    otherUnits: amounts.length - sizes.length,
  };
}

export type RowsSummary = { totals: FieldTotal[]; columns: { column: CalculatedColumn; average?: ColumnAverage }[] };

export function summariseRows(collection: Collection, rowIds: Set<string>, values: StoredValue[]): RowsSummary {
  const mine = withUnits(values.filter((value) => value.field && rowIds.has(value.subject?.entityId ?? "")));
  const shown = collection.fields.filter((field) => !(collection.key.by === "when" && field.kind === "date"));
  const scales = scalesOf(collection.fields, mine);
  const cellsOf = (rowId: string) => (fieldId: string) => mine.find((value) => value.subject?.entityId === rowId && value.field === fieldId);
  return {
    totals: shown.flatMap((field) => totalFor(field, mine.filter((value) => value.field === field.id)) ?? []),
    columns: (collection.columns ?? []).map((column) => ({
      column,
      average: columnAverage([...rowIds].flatMap((rowId) => columnValue(column, cellsOf(rowId), scales) ?? [])),
    })),
  };
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
  return {
    collection,
    count: counted.length,
    scope: byDay && thisMonth.length > 0 ? "this month" : "in total",
    totals: summariseRows(collection, new Set(counted.map((row) => row.id)), values).totals,
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
