import { describe, expect, test } from "bun:test";
import type { Collection, Row } from "@/features/notes/fact";
import { placeCollections, practiceExample, sentenceIndex, shelfOf, whereFrom, withDays, type Where } from "./practice";
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

  test("a day in a day-by-day collection is the row's day, not a value for its date column", () => {
    expect(whereFrom({ collection: 0, field: 0, row: null, sure: true }, shelf, { kind: "date", when: { on: "2026-11-14" } }, today)).toEqual({
      at: "collection",
      collection: "Runs",
      row: "Sat 14 Nov",
      day: true,
      sure: true,
    });
  });

  test("does not invent today as the day for a date it could not read", () => {
    expect(whereFrom({ collection: 0, field: 0, row: null, sure: true }, shelf, { kind: "date" }, today)).toEqual({ at: "collection", collection: "Runs", day: true, sure: true });
  });

  test("keeps a value in the note when no collection fits", () => {
    expect(whereFrom({ collection: null, field: null, row: null, sure: false }, shelf, { kind: "money" }, today)).toEqual({ at: "note" });
  });
});

describe("withDays", () => {
  const day: Where = { at: "collection", collection: "Workouts", day: true, sure: true };
  const time: Where = { at: "collection", collection: "Workouts", field: "Time", row: "Sat 14 Nov", sure: true };
  const run: Where = { at: "collection", collection: "Runs", field: "Distance", row: "Thu 12 Nov", sure: true };

  test("gives a date the day its sentence's other values go to", () => {
    expect(withDays([{ group: "b", where: day }, { group: "b", where: time }])[0]).toEqual({ ...day, row: "Sat 14 Nov" });
  });

  test("ignores values from another sentence or another collection", () => {
    expect(withDays([{ group: "a", where: run }, { group: "b", where: day }, { group: "c", where: time }])[1]).toEqual(day);
    expect(withDays([{ group: "b", where: { ...run, row: "Thu 12 Nov" } }, { group: "b", where: day }])[1]).toEqual(day);
  });

  test("keeps a date's own day", () => {
    expect(withDays([{ group: "b", where: { ...day, row: "Fri 13 Nov" } }, { group: "b", where: time }])[0]).toMatchObject({ row: "Fri 13 Nov" });
  });
});

describe("sentenceIndex", () => {
  const paragraph = "Easy 6 km last Thursday in 33:05 with Priya. Circuit class on Saturday, 30 minutes with 12 kg kettlebells. Lunch came to £8.50.";
  test("tells which sentence of a paragraph an offset falls in", () => {
    expect([paragraph.indexOf("6 km"), paragraph.indexOf("Saturday"), paragraph.indexOf("12 kg"), paragraph.indexOf("£8.50")].map((at) => sentenceIndex(paragraph, at))).toEqual([0, 1, 1, 2]);
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
