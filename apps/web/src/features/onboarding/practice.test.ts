import { describe, expect, test } from "bun:test";
import type { Collection, Row } from "@/features/notes/fact";
import { placeCollections, practiceExample, shelfOf, whereFrom } from "./practice";
import { RECIPES } from "./recipes";

const runs: Collection = {
  id: "runs",
  name: "Runs",
  rowLabel: "run",
  fields: [
    { id: "date", name: "date", kind: "date" },
    { id: "distance", name: "Distance", kind: "number" },
    { id: "time", name: "Time", kind: "duration" },
  ],
  key: { by: "when", grain: "day" },
  createdAt: 1,
};
const budget: Collection = { id: "budget", name: "Wedding budget", rowLabel: "supplier", fields: [{ id: "cost", name: "Cost", kind: "money" }], key: { by: "name" }, createdAt: 2 };
const rows: Row[] = [{ id: "budget.venue", collectionId: "budget", label: "Venue", createdAt: 3 }];
const shelf = shelfOf([runs, budget], rows);
const today = new Date(2026, 10, 18);

describe("whereFrom", () => {
  test("shows a run distance going into today's row of Runs", () => {
    expect(whereFrom({ collection: 0, field: 1, row: null, sure: true }, shelf, { kind: "number" }, today)).toEqual({
      at: "collection",
      collection: "Runs",
      field: "Distance",
      row: "Wed 18 Nov",
      sure: true,
    });
  });

  test("uses the day the value was about for a day-by-day collection", () => {
    expect(whereFrom({ collection: 0, field: 2, row: null, sure: true }, shelf, { kind: "duration", when: { on: "2026-11-16" } }, today)).toMatchObject({ row: "Mon 16 Nov", field: "Time" });
  });

  test("names the existing or new row in a collection of named things", () => {
    expect(whereFrom({ collection: 1, field: 0, row: { row: 0 }, sure: true }, shelf, { kind: "money" }, today)).toMatchObject({ row: "Venue", field: "Cost", sure: true });
    expect(whereFrom({ collection: 1, field: 0, row: { label: "Petal & Stem" }, sure: false }, shelf, { kind: "money" }, today)).toMatchObject({ row: "Petal & Stem", sure: false });
  });

  test("does not promise a field of a different kind, and marks it as a question", () => {
    expect(whereFrom({ collection: 1, field: 0, row: { row: 0 }, sure: true }, shelf, { kind: "date" }, today)).toEqual({ at: "collection", collection: "Wedding budget", row: "Venue", sure: false });
  });

  test("a day in a day-by-day collection sets the row's day", () => {
    expect(whereFrom({ collection: 0, field: 0, row: null, sure: true }, shelf, { kind: "date", when: { on: "2026-11-18" } }, today)).toMatchObject({ field: "Date", sure: true });
  });

  test("keeps a value in the note when no collection fits", () => {
    expect(whereFrom({ collection: null, field: null, row: null, sure: false }, shelf, { kind: "money" }, today)).toEqual({ at: "note" });
  });
});

describe("placeCollections", () => {
  test("lists each collection with its rows for the place model", () => {
    expect(placeCollections(shelf).map((item) => [item.name, item.per, item.rows])).toEqual([
      ["Runs", "day", []],
      ["Wedding budget", "name", ["Venue"]],
    ]);
  });
});

describe("practiceExample", () => {
  test("builds the example from the topics the person picked", () => {
    const example = practiceExample(RECIPES.filter((recipe) => recipe.id === "runs" || recipe.id === "wedding"));
    expect(example).toContain("km");
    expect(example).toContain("£");
  });

  test("falls back to an everyday example with no topics", () => expect(practiceExample([])).toContain("5 km"));
});
