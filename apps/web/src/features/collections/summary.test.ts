import { describe, expect, test } from "bun:test";
import type { Collection, Row, StoredValue } from "@/features/notes/fact";
import { daysUntil, summariseCollection, upcomingDates } from "./summary";

const runs: Collection = {
  id: "c",
  name: "Runs",
  rowLabel: "run",
  key: { by: "when", grain: "day" },
  createdAt: 0,
  fields: [
    { id: "date", name: "date", kind: "date" },
    { id: "distance", name: "distance", kind: "number" },
    { id: "time", name: "time", kind: "duration" },
  ],
};
const row = (period: string): Row => ({ id: `c.${period}`, collectionId: "c", label: period, period, createdAt: 0 });
const timed = (rowId: string, text: string, seconds?: number): StoredValue => ({
  id: `${rowId}:time`,
  text,
  kind: "duration",
  field: "time",
  subject: { label: "run", entityId: rowId },
  ...(seconds !== undefined && { seconds }),
});
const cell = (rowId: string, field: string, text: string, amount?: number, after = " km", unit?: string): StoredValue => ({
  id: `${rowId}:${field}`,
  text,
  field,
  subject: { label: "run", entityId: rowId },
  ...(amount !== undefined && { amount, before: "", after }),
  ...(unit && { unit }),
});
const km = (rowId: string, amount: number) => cell(rowId, "distance", `${amount} km`, amount, " km", "km");
const today = new Date(2026, 10, 17);

describe("summariseCollection", () => {
  test("counts this month's rows and shows the newest row", () => {
    const rows = [row("2026-10-30"), row("2026-11-03"), row("2026-11-15")];
    const values = [cell("c.2026-11-15", "distance", "5 km"), cell("c.2026-11-15", "time", "27:40"), cell("c.2026-11-03", "distance", "6 km")];
    const summary = summariseCollection(runs, rows, values, today);
    expect(summary.count).toBe(2);
    expect(summary.scope).toBe("this month");
    expect(summary.latest?.cells).toEqual(["5 km", "27:40"]);
  });

  test("adds up a field this month, leaving out rows without it", () => {
    const rows = [row("2026-10-30"), row("2026-11-03"), row("2026-11-10"), row("2026-11-15")];
    const values = [cell("c.2026-10-30", "distance", "9 km", 9), cell("c.2026-11-03", "distance", "6.4 km", 6.4), cell("c.2026-11-15", "distance", "5 km", 5), cell("c.2026-11-15", "time", "27:40")];
    const [distance, ...rest] = summariseCollection(runs, rows, values, today).totals;
    expect(distance).toMatchObject({ text: "11.4 km", counted: 2, otherUnits: 0 });
    expect(rest).toEqual([]);
  });

  test("keeps entries in another unit out of the total and counts them", () => {
    const rows = [row("2026-11-03"), row("2026-11-10"), row("2026-11-15")];
    const values = [cell("c.2026-11-03", "distance", "6 km", 6), cell("c.2026-11-10", "distance", "3 miles", 3, " miles"), cell("c.2026-11-15", "distance", "5 km", 5)];
    expect(summariseCollection(runs, rows, values, today).totals[0]).toMatchObject({ text: "11 km", counted: 2, otherUnits: 1 });
  });

  test("adds up durations in seconds and leaves out ones without a length", () => {
    const rows = [row("2026-11-03"), row("2026-11-10"), row("2026-11-15")];
    const values = [timed("c.2026-11-03", "27:40", 1660), timed("c.2026-11-10", "half an hour", 1800), timed("c.2026-11-15", "2740"), cell("c.2026-11-15", "distance", "5 km", 5)];
    const [distance, time] = summariseCollection(runs, rows, values, today).totals;
    expect(distance).toMatchObject({ text: "5 km", counted: 1 });
    expect(time).toMatchObject({ text: "57:40", counted: 2, otherUnits: 0 });
  });

  test("shows a duration total of an hour or more in hours and minutes", () => {
    const rows = [row("2026-11-03"), row("2026-11-10")];
    const values = [timed("c.2026-11-03", "1:05:00", 3900), timed("c.2026-11-10", "55 minutes", 3300)];
    expect(summariseCollection(runs, rows, values, today).totals).toMatchObject([{ field: { id: "time" }, text: "2 h", counted: 2 }]);
  });

  test("averages a field over the entries that have it", () => {
    const rows = [row("2026-11-01"), row("2026-11-03"), row("2026-11-10"), row("2026-11-15")];
    const values = [km("c.2026-11-01", 5), km("c.2026-11-03", 6.4), km("c.2026-11-15", 5.7)];
    const summary = summariseCollection(runs, rows, values, today);
    expect(summary.count).toBe(4);
    expect(summary.totals[0]).toMatchObject({ text: "17.1 km", average: "5.7 km", counted: 3, otherUnits: 0 });
  });

  test("averages durations and leaves out a single entry's average", () => {
    const rows = [row("2026-11-03"), row("2026-11-10")];
    const two = summariseCollection(runs, rows, [timed("c.2026-11-03", "27:40", 1660), timed("c.2026-11-10", "30:00", 1800)], today);
    expect(two.totals[0]).toMatchObject({ text: "57:40", average: "28:50" });
    const one = summariseCollection(runs, rows, [timed("c.2026-11-03", "27:40", 1660)], today);
    expect(one.totals[0]?.average).toBeUndefined();
  });

  test("converts units of the same dimension before adding", () => {
    const rows = [row("2026-11-03"), row("2026-11-10"), row("2026-11-15")];
    const values = [km("c.2026-11-03", 5), cell("c.2026-11-10", "distance", "3 miles", 3, " miles", "mi"), km("c.2026-11-15", 5)];
    expect(summariseCollection(runs, rows, values, today).totals[0]).toMatchObject({ text: "14.8 km", average: "4.9 km", counted: 3, otherUnits: 0 });
  });

  test("leaves out entries in another dimension", () => {
    const rows = [row("2026-11-03"), row("2026-11-10"), row("2026-11-15")];
    const values = [km("c.2026-11-03", 5), cell("c.2026-11-10", "distance", "3 kg", 3, " kg", "kg"), km("c.2026-11-15", 5)];
    expect(summariseCollection(runs, rows, values, today).totals[0]).toMatchObject({ text: "10 km", counted: 2, otherUnits: 1 });
  });

  test("gives older entries without a unit the unit of entries written the same way", () => {
    const rows = [row("2026-11-03"), row("2026-11-10"), row("2026-11-15")];
    const values = [cell("c.2026-11-03", "distance", "5 km", 5), cell("c.2026-11-10", "distance", "2 mi", 2, " mi", "mi"), km("c.2026-11-15", 5)];
    expect(summariseCollection(runs, rows, values, today).totals[0]).toMatchObject({ text: "13.2 km", counted: 3 });
  });

  test("adds money only within one currency", () => {
    const spend: Collection = { ...runs, fields: [{ id: "cost", name: "cost", kind: "money" }] };
    const money = (rowId: string, before: string, amount: number, unit: string): StoredValue => ({
      id: `${rowId}:cost`,
      text: `${before}${amount}`,
      kind: "money",
      field: "cost",
      subject: { label: "lunch", entityId: rowId },
      amount,
      before,
      after: "",
      unit,
    });
    const rows = [row("2026-11-03"), row("2026-11-10"), row("2026-11-15")];
    const values = [money("c.2026-11-03", "£", 12, "GBP"), money("c.2026-11-10", "€", 20, "EUR"), money("c.2026-11-15", "£", 8.5, "GBP")];
    expect(summariseCollection(spend, rows, values, today).totals[0]).toMatchObject({ text: "£20.50", average: "£10.25", counted: 2, otherUnits: 1 });
  });

  test("falls back to all rows when nothing happened this month", () => {
    const summary = summariseCollection(runs, [row("2026-09-01"), row("2026-10-02")], [], today);
    expect(summary).toMatchObject({ count: 2, scope: "in total" });
  });

  test("an empty collection has no latest row", () => {
    expect(summariseCollection(runs, [], [], today)).toMatchObject({ count: 0, latest: undefined, totals: [] });
  });
});

describe("upcomingDates", () => {
  const date = (id: string, on: string, grain: "day" | "time" | "month" = "day"): StoredValue => ({ id, text: on, kind: "date", when: { on, grain } });

  test("lists future day dates soonest first and skips past or vague ones", () => {
    const values = [date("a", "2026-12-01"), date("b", "2026-11-20"), date("c", "2026-11-01"), date("d", "2026-12", "month"), date("e", "2026-11-17T18:00", "time")];
    expect(upcomingDates(values, [], today).map((item) => item.value.id)).toEqual(["e", "b", "a"]);
  });

  test("leaves out dates that are entries in a collection", () => {
    const row = { id: "r1", collectionId: "c1", label: "Fri", createdAt: 0 };
    const values = [date("a", "2026-11-20"), { ...date("b", "2026-11-21"), subject: { label: "Fri", entityId: "r1" } }, { ...date("c", "2026-11-22"), field: "date" }];
    expect(upcomingDates(values, [row], today).map((item) => item.value.id)).toEqual(["a"]);
  });

  test("counts whole days", () => {
    expect(daysUntil("2026-11-17", today)).toBe(0);
    expect(daysUntil("2026-11-20", today)).toBe(3);
  });
});
