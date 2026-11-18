import type { Collection, Glance, Row, StoredValue } from "@/features/notes/fact";
import { dayLabel, rowLabel } from "./format";
import { scaleOf, sizeIn, withUnits } from "./scale";
import { daysUntil, summariseCollection } from "./summary";

export type GlanceView = {
  glance: Glance;
  figure: string;
  caption: string;
  aside?: string;
  bars?: number[];
  dots?: boolean[];
  line?: number[];
};

export const GLANCES: { glance: Glance; label: string; hint: string }[] = [
  { glance: "total", label: "Total", hint: "Sum this month" },
  { glance: "count", label: "Count", hint: "Entries this week" },
  { glance: "average", label: "Average", hint: "Average per entry" },
  { glance: "countdown", label: "Countdown", hint: "Days to the next date" },
];

const MAX_MARKS = 12;

const pad = (number: number) => String(number).padStart(2, "0");
const localDay = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const dayOfRow = (row: Row) => (row.period ? row.period.slice(0, 10) : localDay(new Date(row.createdAt)));
const byDayOrder = (a: Row, b: Row) => dayOfRow(a).localeCompare(dayOfRow(b)) || a.createdAt - b.createdAt;

const scaled = (sizes: number[]) => {
  const top = Math.max(...sizes, 0);
  return top > 0 ? sizes.map((size) => size / top) : sizes.map(() => 0);
};

function sizesOf(fieldId: string, rows: Row[], values: StoredValue[]): number[] {
  const cells = withUnits(values.filter((value) => value.field === fieldId && rows.some((row) => row.id === value.subject?.entityId)));
  const scale = scaleOf(cells);
  return rows.map((row) => {
    const cell = cells.find((value) => value.subject?.entityId === row.id);
    if (!cell) return 0;
    if (cell.seconds !== undefined) return cell.seconds;
    return scale ? (sizeIn(cell, scale) ?? 0) : 0;
  });
}

const days = (count: number) => `${count} ${count === 1 ? "day" : "days"}`;

export function glanceOf(collection: Collection, rows: Row[], values: StoredValue[], today = new Date()): GlanceView {
  const glance = collection.glance ?? "total";
  const mine = rows.filter((row) => row.collectionId === collection.id).sort(byDayOrder);
  const summary = summariseCollection(collection, rows, values, today);
  const [headline] = summary.totals;

  if (glance === "count") {
    const week = Array.from({ length: 7 }, (_, index) => localDay(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6 + index)));
    const recent = mine.filter((row) => week.includes(dayOfRow(row)));
    return { glance, figure: String(recent.length), caption: "this week", dots: week.map((day) => recent.some((row) => dayOfRow(row) === day)) };
  }

  if (glance === "countdown") {
    const from = localDay(today);
    const dated = mine.flatMap((row) => {
      if (row.period) return [{ on: row.period.slice(0, 10), label: collection.rowLabel }];
      const date = values.find((value) => value.subject?.entityId === row.id && value.kind === "date" && value.when)?.when?.on.slice(0, 10);
      return date ? [{ on: date, label: rowLabel(row) }] : [];
    });
    const next = dated.filter((item) => item.on >= from).sort((a, b) => a.on.localeCompare(b.on))[0];
    if (!next) return { glance, figure: "–", caption: "nothing coming up" };
    const away = daysUntil(next.on, today);
    return { glance, figure: away === 0 ? "Today" : days(away), caption: next.label, aside: dayLabel(next.on) };
  }

  if (glance === "average") {
    if (!headline) return { glance, figure: String(mine.length), caption: mine.length === 1 ? "entry" : "entries" };
    const counted = mine.slice(-MAX_MARKS);
    return { glance, figure: headline.average ?? headline.text, caption: "average", line: scaled(sizesOf(headline.field.id, counted, values)) };
  }

  const scope = summary.scope;
  const inScope = scope === "this month" ? mine.filter((row) => row.period?.startsWith(localDay(today).slice(0, 7))) : mine;
  if (!headline) return { glance, figure: String(summary.count), caption: `${summary.count === 1 ? "entry" : "entries"} ${scope}` };
  return { glance, figure: headline.text, caption: scope, bars: scaled(sizesOf(headline.field.id, inScope.slice(-MAX_MARKS), values)) };
}
