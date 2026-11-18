import { describe, expect, test } from "bun:test";
import type { Collection, Glance, Row, StoredValue } from "@/features/notes/fact";
import { glanceOf, relativeDay, timelineOf } from "./glance";

const runs = (glance?: Glance): Collection => ({
  id: "c",
  name: "Runs",
  rowLabel: "run",
  key: { by: "when", grain: "day" },
  createdAt: 0,
  fields: [{ id: "distance", name: "distance", kind: "number" }],
  ...(glance && { glance }),
});
const row = (period: string): Row => ({ id: `c.${period}`, collectionId: "c", label: period, period, createdAt: 0 });
const km = (period: string, amount: number): StoredValue => ({
  id: `${period}:distance`,
  text: `${amount} km`,
  field: "distance",
  subject: { label: "run", entityId: `c.${period}` },
  amount,
  before: "",
  after: " km",
  unit: "km",
});
const time = (period: string, seconds: number, text: string): StoredValue => ({ id: `${period}:time`, text, field: "time", subject: { label: "run", entityId: `c.${period}` }, seconds });
const today = new Date(2026, 10, 18);
const rows = [row("2026-10-30"), row("2026-11-12"), row("2026-11-15"), row("2026-11-18")];
const values = [km("2026-10-30", 9), km("2026-11-12", 4), km("2026-11-15", 8), km("2026-11-18", 2)];

const cumulativeAt = (series: number[], points: Record<number, number>) => series.map((_, index) => Object.entries(points).findLast(([day]) => index + 1 >= Number(day))?.[1] ?? 0);

describe("glanceOf", () => {
  test("total sums this month, compares with last month, and charts both months day by day", () => {
    const view = glanceOf(runs(), rows, values, today);
    expect(view).toMatchObject({ glance: "total", figure: "14 km", caption: "this month", context: "9 km in October" });
    expect(view.chart).toEqual({
      kind: "month",
      length: 30,
      current: cumulativeAt(Array.from({ length: 18 }), { 12: 4 / 14, 15: 12 / 14, 18: 1 }),
      previous: cumulativeAt(Array.from({ length: 31 }), { 30: 9 / 14 }),
    });
  });

  test("total without a previous month says when the last entry was", () => {
    const view = glanceOf(runs(), rows.slice(1), values.slice(1), today);
    expect(view.context).toBe("Last run today");
    expect(view.chart).toMatchObject({ kind: "month" });
    expect(view.chart && "previous" in view.chart).toBe(false);
  });

  test("a month total with one entry and no earlier month shows the day grid instead of a one-step climb", () => {
    const view = glanceOf(runs(), rows.slice(-1), values.filter((value) => value.subject?.entityId === rows.at(-1)!.id), today);
    expect(view.chart).toMatchObject({ kind: "days" });
  });

  test("count shows entries in the last seven days against the week before", () => {
    expect(glanceOf(runs("count"), rows, values, today)).toEqual({
      glance: "count",
      figure: "3",
      caption: "this week",
      context: "Last run today",
      chart: {
        kind: "days",
        weeks: [
          [false, false, false, false, false, false, false],
          [true, false, false, true, false, false, true],
        ],
      },
    });
    const earlier = [...rows, row("2026-11-06"), row("2026-11-09")];
    expect(glanceOf(runs("count"), earlier, values, today).context).toBe("2 the week before");
  });

  test("average shows the mean per entry this month, the latest entry and a line through them", () => {
    const view = glanceOf(runs("average"), rows, values, today);
    expect(view).toMatchObject({ glance: "average", figure: "4.7 km", caption: "average", context: "Latest 2 km", chart: { kind: "line", points: [1 / 3, 1, 0] } });
    expect(view.chart?.kind === "line" && view.chart.mean).toBeCloseTo(4 / 9);
  });

  test("average uses the collection's calculated column when it has one", () => {
    const paced: Collection = {
      ...runs("average"),
      fields: [
        { id: "distance", name: "distance", kind: "number" },
        { id: "time", name: "time", kind: "duration" },
      ],
      columns: [{ id: "pace", name: "Pace", expr: "$1 / $2", inputs: ["time", "distance"] }],
    };
    const timed = [...values, time("2026-11-12", 1200, "20:00"), time("2026-11-15", 2400, "40:00"), time("2026-11-18", 660, "11:00")];
    const view = glanceOf(paced, rows, timed, today);
    expect(view.figure).toBe("5:10/km");
    expect(view.context).toBe("Latest 5:30/km");
    expect(view.chart).toMatchObject({ kind: "line", points: [0, 0, 1] });
    expect(view.chart?.kind === "line" && view.chart.mean).toBeCloseTo(1 / 3);
  });

  test("countdown shows days to the next dated row and places the next few on a timeline", () => {
    const later = [...rows, row("2026-11-20"), row("2026-12-03")];
    expect(glanceOf(runs("countdown"), later, values, new Date(2026, 10, 19))).toEqual({
      glance: "countdown",
      figure: "1 day",
      caption: "run",
      context: "Fri 20 Nov, then 1 more",
      chart: { kind: "timeline", at: [1 / 14, 1] },
    });
    expect(glanceOf(runs("countdown"), [...rows, row("2026-11-20")], values, new Date(2026, 10, 19))).toMatchObject({ context: "Fri 20 Nov", chart: { at: [1 / 7] } });
    expect(glanceOf(runs("countdown"), rows, values, new Date(2026, 10, 25))).toEqual({ glance: "countdown", figure: "–", caption: "nothing coming up" });
  });

  test("a total of named rows charts each row and names the largest", () => {
    const budget: Collection = { id: "b", name: "Budget", rowLabel: "supplier", key: { by: "name" }, createdAt: 0, fields: [{ id: "cost", name: "cost", kind: "money" }] };
    const supplier = (label: string, createdAt: number): Row => ({ id: `b.${label}`, collectionId: "b", label, createdAt });
    const cost = (label: string, amount: number): StoredValue => ({ id: `${label}:cost`, text: `£${amount}`, field: "cost", subject: { label, entityId: `b.${label}` }, amount, before: "£", after: "", unit: "GBP" });
    const view = glanceOf(budget, [supplier("Florist", 1), supplier("Venue", 2), supplier("Band", 3)], [cost("Florist", 10), cost("Venue", 40), cost("Band", 20)], today);
    expect(view).toEqual({ glance: "total", figure: "£70", caption: "in total", context: "Largest Venue, £40", chart: { kind: "bars", heights: [0.25, 1, 0.5], highlight: 1 } });
  });

  test("a single entry with nothing to sum shows when it was added", () => {
    const gifts: Collection = { id: "g", name: "Gifts", rowLabel: "gift", key: { by: "name" }, createdAt: 0, fields: [{ id: "gift", name: "gift", kind: "text" }] };
    const view = glanceOf(gifts, [{ id: "g.dad", collectionId: "g", label: "Dad", createdAt: today.getTime() }], [], today);
    expect(view).toMatchObject({ figure: "1", caption: "entry in total", context: "Last gift today" });
    expect(view.chart).toEqual({ kind: "days", weeks: [Array(7).fill(false), [...Array(6).fill(false), true]] });
  });
});

describe("relativeDay", () => {
  test("names today and yesterday, and dates anything older", () => {
    expect(relativeDay("2026-11-18", today)).toBe("today");
    expect(relativeDay("2026-11-17", today)).toBe("yesterday");
    expect(relativeDay("2026-11-14", today)).toBe("Sat 14 Nov");
  });
});

describe("timelineOf", () => {
  test("spreads the next dates over at least a week and keeps the first eight", () => {
    expect(timelineOf([0, 3])).toEqual({ kind: "timeline", at: [0, 3 / 7] });
    expect(timelineOf([23, 24, 46])).toEqual({ kind: "timeline", at: [0.5, 24 / 46, 1] });
    expect(timelineOf([1, 2, 3, 4, 5, 6, 7, 8, 9])).toEqual({ kind: "timeline", at: [1, 2, 3, 4, 5, 6, 7, 8].map((stop) => stop / 8) });
  });
});
