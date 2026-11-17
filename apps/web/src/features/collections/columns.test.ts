import { describe, expect, test } from "bun:test";
import type { CalculatedColumn, CollectionField, StoredValue } from "@/features/notes/fact";
import { acceptColumn, columnAverage, columnValue, describeColumn, type RowCells } from "./columns";
import { scalesOf, withUnits } from "./scale";

const fields: CollectionField[] = [
  { id: "distance", name: "distance", kind: "number" },
  { id: "time", name: "time", kind: "duration" },
  { id: "cost", name: "cost", kind: "money" },
];
const distance = (row: string, amount: number, unit = "km", after = ` ${unit}`): StoredValue => ({ id: `${row}:d`, text: `${amount}${after}`, field: "distance", subject: { label: "run", entityId: row }, amount, before: "", after, unit });
const time = (row: string, seconds: number): StoredValue => ({ id: `${row}:t`, text: `${seconds} s`, kind: "duration", field: "time", subject: { label: "run", entityId: row }, seconds });
const cost = (row: string, amount: number): StoredValue => ({ id: `${row}:c`, text: `£${amount}`, kind: "money", field: "cost", subject: { label: "run", entityId: row }, amount, before: "£", after: "", unit: "GBP" });

const table = (values: StoredValue[]) => {
  const cells = withUnits(values);
  const rows = [...new Set(cells.map((cell) => cell.subject!.entityId!))];
  const lookup = (row: string): RowCells => (fieldId) => cells.find((cell) => cell.subject?.entityId === row && cell.field === fieldId);
  return { scales: scalesOf(fields, cells), rows: rows.map(lookup), lookup };
};

const pace: CalculatedColumn = { id: "pace", name: "Pace", expr: "$2 / $1", inputs: ["distance", "time"] };
const speed: CalculatedColumn = { id: "speed", name: "Speed", expr: "$1 / $2", inputs: ["distance", "time"] };

describe("calculated columns", () => {
  test("shows pace as minutes and seconds per unit", () => {
    const { scales, lookup } = table([distance("a", 10), time("a", 3300)]);
    expect(columnValue(pace, lookup("a"), scales)?.text).toBe("5:30/km");
  });

  test("shows speed per hour", () => {
    const { scales, lookup } = table([distance("a", 10), time("a", 3300)]);
    expect(columnValue(speed, lookup("a"), scales)?.text).toBe("10.9 km/h");
  });

  test("converts a row in miles to the column's usual unit", () => {
    const { scales, lookup } = table([distance("a", 10), time("a", 3000), distance("b", 5), time("b", 1500), distance("c", 3.1, "mi", " miles"), time("c", 1500)]);
    expect(columnValue(pace, lookup("c"), scales)?.text).toBe("5:01/km");
  });

  test("shows money per unit", () => {
    const { scales, lookup } = table([distance("a", 8), cost("a", 20)]);
    expect(columnValue({ id: "x", name: "Per km", expr: "$2 / $1", inputs: ["distance", "cost"] }, lookup("a"), scales)?.text).toBe("£2.50/km");
  });

  test("skips rows missing an input and averages the rest", () => {
    const { scales, rows } = table([distance("a", 10), time("a", 3000), distance("b", 5), time("b", 1800), distance("c", 6)]);
    const results = rows.flatMap((cellOf) => columnValue(pace, cellOf, scales) ?? []);
    expect(results.map((result) => result.text)).toEqual(["5:00/km", "6:00/km"]);
    expect(columnAverage(results)).toEqual({ text: "5:30/km", counted: 2 });
  });

  test("names the inputs in the formula", () => {
    expect(describeColumn(pace, fields)).toBe("time ÷ distance");
  });
});

describe("accepting a calculated column", () => {
  const { scales, rows } = table([distance("a", 10), time("a", 3300)]);

  test("keeps a formula over two fields that works on a row", () => {
    expect(acceptColumn("Pace", "f2 / f1", fields, rows, scales)).toMatchObject({ name: "Pace", expr: "$2 / $1", inputs: ["distance", "time"] });
  });

  test("drops formulas that use one field, unknown fields or units that do not add up", () => {
    expect(acceptColumn("Double", "f1 * 2", fields, rows, scales)).toBeUndefined();
    expect(acceptColumn("Odd", "f1 / f9", fields, rows, scales)).toBeUndefined();
    expect(acceptColumn("Mixed", "f1 + f2", fields, rows, scales)).toBeUndefined();
    expect(acceptColumn("Unused", "f3 / f1", fields, rows, scales)).toBeUndefined();
    expect(acceptColumn(" ", "f2 / f1", fields, rows, scales)).toBeUndefined();
  });
});
