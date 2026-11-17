import { describe, expect, test } from "bun:test";
import type { Collection, Row, StoredValue } from "@/features/notes/fact";
import { placeByDay, placeByName, rowOptions } from "./logic";

const runs: Collection = {
  id: "runs",
  name: "Runs",
  rowLabel: "run",
  key: { by: "when", grain: "day" },
  createdAt: 0,
  fields: [
    { id: "date", name: "date", kind: "date" },
    { id: "distance", name: "distance", kind: "number" },
  ],
};
const vendors: Collection = { id: "vendors", name: "Vendors", rowLabel: "vendor", key: { by: "name" }, createdAt: 0, fields: [{ id: "price", name: "price per head", kind: "money" }] };

const newRun: StoredValue = { id: "new", text: "6 km", kind: "number", event: true, when: { on: "2026-11-12", grain: "day" } };
const cell = (id: string, rowId: string, field: string): StoredValue => ({ id, text: id, field, subject: { label: "x", entityId: rowId } });
const dayRow: Row = { id: "runs.2026-11-12", collectionId: "runs", label: "2026-11-12", period: "2026-11-12", createdAt: 1 };

describe("placeByDay", () => {
  test("creates the day row when the day is new", () => {
    expect(placeByDay(runs, newRun, "distance", [], [])).toEqual({
      row: { id: "runs.2026-11-12", collectionId: "runs", label: "2026-11-12", period: "2026-11-12" },
      newRow: true,
    });
  });

  test("uses the existing day row when its field is empty", () => {
    const placement = placeByDay(runs, newRun, "distance", [cell("time", dayRow.id, "time")], [dayRow]);
    expect(placement).toEqual({ row: dayRow, newRow: false });
  });

  test("reports the value already in that field and offers the next free row", () => {
    const occupant = cell("old", dayRow.id, "distance");
    const placement = placeByDay(runs, newRun, "distance", [occupant, cell("older", "runs.2026-11-12.2", "distance")], [dayRow]);
    expect(placement.occupant).toBe(occupant);
    expect(placement.row).toBe(dayRow);
    expect(placement.another).toEqual({ row: { id: "runs.2026-11-12.3", collectionId: "runs", label: "2026-11-12", period: "2026-11-12" }, newRow: true });
  });
});

describe("placeByName", () => {
  const rows: Row[] = [
    { id: "vendors.a", collectionId: "vendors", label: "Rosa's Kitchen", createdAt: 1 },
    { id: "vendors.b", collectionId: "vendors", label: "Hops & Co", createdAt: 2 },
    { id: "runs.2026-11-12", collectionId: "runs", label: "2026-11-12", period: "2026-11-12", createdAt: 3 },
  ];
  const price: StoredValue = { id: "new", text: "£38", kind: "money" };

  test("offers only the collection's rows, newest first", () => {
    expect(rowOptions(vendors, rows).map((row) => row.id)).toEqual(["vendors.b", "vendors.a"]);
  });

  test("places into the picked row by its option number", () => {
    const options = rowOptions(vendors, rows);
    expect(placeByName(vendors, { row: 0 }, options, price, "price", [])).toEqual({ row: rows[1]!, newRow: false });
  });

  test("creates a row with the quoted label", () => {
    const placement = placeByName(vendors, { label: "Green Fork" }, rowOptions(vendors, rows), price, "price", []);
    expect(placement?.newRow).toBe(true);
    expect(placement?.row.label).toBe("Green Fork");
    expect(placement?.row.collectionId).toBe("vendors");
    expect(placement?.row.id.startsWith("vendors.")).toBe(true);
  });

  test("reports the value already in the picked cell", () => {
    const occupant = cell("old", "vendors.b", "price");
    expect(placeByName(vendors, { row: 0 }, rowOptions(vendors, rows), price, "price", [occupant])?.occupant).toBe(occupant);
  });

  test("rejects an option number outside the list", () => {
    expect(placeByName(vendors, { row: 5 }, rowOptions(vendors, rows), price, "price", [])).toBeNull();
  });
});
