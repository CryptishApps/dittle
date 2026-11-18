import type { Collection, Glance, Row, StoredValue } from "@/features/notes/fact";
import { columnAverage, columnValue, type ColumnValue } from "./columns";
import { dayLabel, rowLabel } from "./format";
import { scaleOf, scalesOf, sizeIn, withUnits } from "./scale";
import { daysUntil, summariseCollection, summariseRows } from "./summary";

export type GlanceChart =
  | { kind: "month"; length: number; current: number[]; previous?: number[] }
  | { kind: "bars"; heights: number[]; highlight?: number }
  | { kind: "days"; weeks: [boolean[], boolean[]] }
  | { kind: "line"; points: number[]; mean: number }
  | { kind: "timeline"; at: number[] };

export type GlanceView = {
  glance: Glance;
  figure: string;
  caption: string;
  context?: string;
  chart?: GlanceChart;
};

export const GLANCES: { glance: Glance; label: string }[] = [
  { glance: "total", label: "Total" },
  { glance: "count", label: "Count" },
  { glance: "average", label: "Average" },
  { glance: "countdown", label: "Countdown" },
];

export function glanceHint(glance: Glance, byDay: boolean): string {
  if (glance === "total") return byDay ? "Sum this month" : "Sum of every row";
  if (glance === "count") return byDay ? "Entries this week" : "Rows added this week";
  if (glance === "average") return byDay ? "Average per entry" : "Average per row";
  return "Days to the next date";
}

const MAX_MARKS = 12;
const MAX_STOPS = 8;
const MIN_WINDOW = 7;

const MONTH = new Intl.DateTimeFormat("en-GB", { month: "long" });

const pad = (number: number) => String(number).padStart(2, "0");
const localDay = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const shifted = (today: Date, days: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
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

export function relativeDay(on: string, today = new Date()): string {
  const ago = -daysUntil(on, today);
  if (ago === 0) return "today";
  if (ago === 1) return "yesterday";
  return dayLabel(on);
}

const lastEntry = (collection: Collection, rows: Row[], today: Date) => {
  const latest = rows.at(-1);
  return latest ? `Last ${collection.rowLabel} ${relativeDay(dayOfRow(latest), today)}` : undefined;
};

export function activityWeeks(rows: Row[], today = new Date()): [boolean[], boolean[]] {
  const taken = new Set(rows.map(dayOfRow));
  const week = (end: number) => Array.from({ length: 7 }, (_, index) => taken.has(localDay(shifted(today, end - 6 + index))));
  return [week(-7), week(0)];
}

function cumulative(daily: number[]): number[] {
  let running = 0;
  return daily.map((size) => (running += size));
}

function monthChart(fieldId: string, rows: Row[], values: StoredValue[], today: Date) {
  const thisMonth = localDay(today).slice(0, 7);
  const before = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonth = localDay(before).slice(0, 7);
  const inMonth = (month: string) => rows.filter((row) => row.period?.startsWith(month));
  const current = inMonth(thisMonth);
  const previous = inMonth(lastMonth);
  const both = [...current, ...previous];
  const sizes = new Map(sizesOf(fieldId, both, values).map((size, index) => [both[index]!.id, size]));
  const daily = (month: Row[], length: number) =>
    Array.from({ length }, (_, index) => month.filter((row) => Number(row.period!.slice(8, 10)) === index + 1).reduce((total, row) => total + (sizes.get(row.id) ?? 0), 0));
  const length = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const now = cumulative(daily(current, today.getDate()));
  const then = previous.length > 0 ? cumulative(daily(previous, new Date(before.getFullYear(), before.getMonth() + 1, 0).getDate())) : undefined;
  const top = Math.max(now.at(-1) ?? 0, then?.at(-1) ?? 0);
  const fit = (series: number[]) => series.map((size) => (top > 0 ? size / top : 0));
  const chart: GlanceChart = { kind: "month", length, current: fit(now), ...(then && { previous: fit(then) }) };
  return { chart, previousRows: previous, previousMonth: MONTH.format(before) };
}

const spread = (numbers: number[]) => {
  const low = Math.min(...numbers);
  const high = Math.max(...numbers);
  return (number: number) => (high > low ? (number - low) / (high - low) : 0.5);
};

function averageView(collection: Collection, counted: Row[], values: StoredValue[], fallback: () => GlanceView | undefined): GlanceView | undefined {
  const column = collection.columns?.[0];
  if (!column) return fallback();
  const cells = withUnits(values.filter((value) => value.field && counted.some((row) => row.id === value.subject?.entityId)));
  const scales = scalesOf(collection.fields, cells);
  const series = counted.flatMap((row): ColumnValue[] => {
    const value = columnValue(column, (fieldId) => cells.find((cell) => cell.subject?.entityId === row.id && cell.field === fieldId), scales);
    return value ? [value] : [];
  });
  const latest = series.at(-1);
  if (!latest) return fallback();
  const figure = series.length === 1 ? latest.text : (columnAverage(series)?.text ?? latest.text);
  const shown = series.slice(-MAX_MARKS);
  const numbers = shown.map((value) => value.number);
  const at = spread(numbers);
  const mean = numbers.reduce((total, number) => total + number, 0) / numbers.length;
  return {
    glance: "average",
    figure,
    caption: "average",
    context: `Latest ${latest.text}`,
    ...(shown.length > 1 && { chart: { kind: "line", points: numbers.map(at), mean: at(mean) } }),
  };
}

export function timelineOf(daysAway: number[]): GlanceChart {
  const stops = daysAway.slice(0, MAX_STOPS);
  const span = Math.max(MIN_WINDOW, ...stops);
  return { kind: "timeline", at: stops.map((stop) => stop / span) };
}

export function glanceOf(collection: Collection, rows: Row[], values: StoredValue[], today = new Date()): GlanceView {
  const glance = collection.glance ?? "total";
  const mine = rows.filter((row) => row.collectionId === collection.id).sort(byDayOrder);
  const summary = summariseCollection(collection, rows, values, today);
  const [headline] = summary.totals;
  const byDay = collection.key.by === "when";
  const scope = summary.scope;
  const inScope = scope === "this month" ? mine.filter((row) => row.period?.startsWith(localDay(today).slice(0, 7))) : mine;

  if (glance === "count") {
    const weeks = activityWeeks(mine, today);
    const window = (end: number) => {
      const from = localDay(shifted(today, end - 6));
      const to = localDay(shifted(today, end));
      return mine.filter((row) => dayOfRow(row) >= from && dayOfRow(row) <= to).length;
    };
    const earlier = window(-7);
    return {
      glance,
      figure: String(window(0)),
      caption: "this week",
      context: earlier > 0 ? `${earlier} the week before` : lastEntry(collection, mine, today),
      chart: { kind: "days", weeks },
    };
  }

  if (glance === "countdown") {
    const from = localDay(today);
    const dated = mine.flatMap((row) => {
      if (row.period) return [{ on: row.period.slice(0, 10), label: collection.rowLabel }];
      const date = values.find((value) => value.subject?.entityId === row.id && value.kind === "date" && value.when)?.when?.on.slice(0, 10);
      return date ? [{ on: date, label: rowLabel(row) }] : [];
    });
    const upcoming = dated.filter((item) => item.on >= from).sort((a, b) => a.on.localeCompare(b.on));
    const [next] = upcoming;
    if (!next) return { glance, figure: "–", caption: "nothing coming up" };
    const away = daysUntil(next.on, today);
    const after = upcoming.length - 1;
    return {
      glance,
      figure: away === 0 ? "Today" : days(away),
      caption: next.label,
      context: after > 0 ? `${dayLabel(next.on)}, then ${after} more` : dayLabel(next.on),
      chart: timelineOf(upcoming.map((item) => daysUntil(item.on, today))),
    };
  }

  if (glance === "average") {
    const countOnly: GlanceView = { glance, figure: String(mine.length), caption: mine.length === 1 ? "entry" : "entries", context: lastEntry(collection, mine, today), chart: { kind: "days", weeks: activityWeeks(mine, today) } };
    const counted = byDay && inScope.length > 0 ? inScope : mine;
    const fromHeadline = (): GlanceView | undefined => {
      if (!headline) return undefined;
      const shown = counted.slice(-MAX_MARKS);
      const sizes = sizesOf(headline.field.id, shown, values);
      const at = spread(sizes);
      const mean = sizes.reduce((total, size) => total + size, 0) / sizes.length;
      const latest = values.find((value) => value.field === headline.field.id && value.subject?.entityId === shown.at(-1)?.id)?.text;
      return {
        glance,
        figure: headline.average ?? headline.text,
        caption: "average",
        ...(latest && { context: `Latest ${latest}` }),
        ...(shown.length > 1 && { chart: { kind: "line", points: sizes.map(at), mean: at(mean) } }),
      };
    };
    return averageView(collection, counted, values, fromHeadline) ?? countOnly;
  }

  if (!headline) {
    return {
      glance,
      figure: String(summary.count),
      caption: `${summary.count === 1 ? "entry" : "entries"} ${scope}`,
      context: lastEntry(collection, mine, today),
      chart: { kind: "days", weeks: activityWeeks(mine, today) },
    };
  }

  if (scope === "this month") {
    const { chart, previousRows, previousMonth } = monthChart(headline.field.id, mine, values, today);
    const before = summariseRows(collection, new Set(previousRows.map((row) => row.id)), values).totals.find((total) => total.field.id === headline.field.id);
    return { glance, figure: headline.text, caption: scope, context: before ? `${before.text} in ${previousMonth}` : lastEntry(collection, mine, today), chart };
  }

  const sizes = sizesOf(headline.field.id, inScope, values);
  const top = Math.max(...sizes);
  const biggest = inScope[sizes.indexOf(top)];
  const biggestText = values.find((value) => value.field === headline.field.id && value.subject?.entityId === biggest?.id)?.text;
  const context = inScope.length > 1 && biggest && biggestText ? `Largest ${rowLabel(biggest)}, ${biggestText}` : biggest ? rowLabel(biggest) : undefined;
  const offset = Math.max(0, inScope.length - MAX_MARKS);
  const highlight = sizes.indexOf(top) - offset;
  return {
    glance,
    figure: headline.text,
    caption: scope,
    ...(context && { context }),
    chart: { kind: "bars", heights: scaled(sizes.slice(offset)), ...(top > 0 && highlight >= 0 && { highlight }) },
  };
}
