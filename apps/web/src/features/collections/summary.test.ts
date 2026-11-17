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
const cell = (rowId: string, field: string, text: string): StoredValue => ({ id: `${rowId}:${field}`, text, field, subject: { label: "run", entityId: rowId } });
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

  test("falls back to all rows when nothing happened this month", () => {
    const summary = summariseCollection(runs, [row("2026-09-01"), row("2026-10-02")], [], today);
    expect(summary).toMatchObject({ count: 2, scope: "in total" });
  });

  test("an empty collection has no latest row", () => {
    expect(summariseCollection(runs, [], [], today)).toMatchObject({ count: 0, latest: undefined });
  });
});

describe("upcomingDates", () => {
  const date = (id: string, on: string, grain: "day" | "time" | "month" = "day"): StoredValue => ({ id, text: on, kind: "date", when: { on, grain } });

  test("lists future day dates soonest first and skips past or vague ones", () => {
    const values = [date("a", "2026-12-01"), date("b", "2026-11-20"), date("c", "2026-11-01"), date("d", "2026-12", "month"), date("e", "2026-11-17T18:00", "time")];
    expect(upcomingDates(values, today).map((item) => item.value.id)).toEqual(["e", "b", "a"]);
  });

  test("counts whole days", () => {
    expect(daysUntil("2026-11-17", today)).toBe(0);
    expect(daysUntil("2026-11-20", today)).toBe(3);
  });
});
