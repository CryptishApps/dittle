import type { Collection, Row, StoredValue } from "@/features/notes/fact";
import { rowLabel } from "./format";

export type CollectionSummary = {
  collection: Collection;
  count: number;
  scope: "this month" | "in total";
  latest?: { label: string; cells: string[] };
};

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
