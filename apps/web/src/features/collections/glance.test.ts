import { describe, expect, test } from "bun:test";
import type { Collection, Glance, Row, StoredValue } from "@/features/notes/fact";
import { glanceOf } from "./glance";

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
const today = new Date(2026, 10, 18);
const rows = [row("2026-10-30"), row("2026-11-12"), row("2026-11-15"), row("2026-11-18")];
const values = [km("2026-10-30", 9), km("2026-11-12", 4), km("2026-11-15", 8), km("2026-11-18", 2)];

describe("glanceOf", () => {
  test("total sums this month with one bar per entry, defaulting to total", () => {
    expect(glanceOf(runs(), rows, values, today)).toEqual({ glance: "total", figure: "14 km", caption: "this month", bars: [0.5, 1, 0.25] });
  });

  test("count shows entries in the last seven days and which days had one", () => {
    expect(glanceOf(runs("count"), rows, values, today)).toEqual({
      glance: "count",
      figure: "3",
      caption: "this week",
      dots: [true, false, false, true, false, false, true],
    });
  });

  test("average shows the mean per entry with a line through the entries", () => {
    const view = glanceOf(runs("average"), rows, values, today);
    expect(view.figure).toBe("4.7 km");
    expect(view.line).toEqual([1, 4 / 9, 8 / 9, 2 / 9]);
  });

  test("countdown shows days to the next dated row", () => {
    const later = [...rows, row("2026-11-20")];
    expect(glanceOf(runs("countdown"), later, values, new Date(2026, 10, 19))).toMatchObject({ figure: "1 day", caption: "run" });
    expect(glanceOf(runs("countdown"), rows, values, new Date(2026, 10, 25))).toMatchObject({ figure: "–" });
  });
});
