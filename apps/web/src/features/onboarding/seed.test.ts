import { describe, expect, test } from "bun:test";
import { valueIdsOf } from "@/features/notes/note-doc";
import { RECIPES, resolveDay, sentenceOf } from "./recipes";
import { buildSeed, glanceValue, previewChange, tableOf } from "./seed";

const today = new Date(2026, 10, 18);
const counter = () => {
  let next = 0;
  return () => `id${(next += 1)}`;
};
const recipe = (id: string) => RECIPES.find((item) => item.id === id)!;

describe("recipes", () => {
  test("every sample value names a field of its collection and an entry that exists", () => {
    for (const item of RECIPES) {
      for (const sample of [...item.samples, ...item.extras]) {
        for (const part of sample.parts) {
          if (typeof part === "string") continue;
          expect(item.collection.fields.map((field) => field.id)).toContain(part.f);
          expect(sample.entries[part.e ?? 0]).toBeDefined();
        }
        if (sample.change) expect(sample.parts.some((part) => typeof part !== "string" && part.f === sample.change!.f && (part.e ?? 0) === (sample.change!.e ?? 0))).toBe(true);
      }
    }
  });

  test("every recipe offers a glance and a prepared change for its first sample", () => {
    for (const item of RECIPES) {
      expect(item.glances.length).toBeGreaterThan(0);
      expect(item.samples[0]!.change).toBeDefined();
    }
  });

  test("days resolve against today", () => {
    expect(resolveDay({ ago: 0 }, today)).toBe("2026-11-18");
    expect(resolveDay({ last: 0 }, today)).toBe("2026-11-15");
    expect(resolveDay({ last: 3 }, today)).toBe("2026-11-11");
    expect(resolveDay({ thisWeek: 1 }, today)).toBe("2026-11-16");
    expect(resolveDay({ thisWeek: 0 }, today)).toBe("2026-11-22");
    expect(resolveDay({ yearly: [12, 11] }, today)).toBe("2026-12-11");
    expect(resolveDay({ yearly: [11, 1] }, today)).toBe("2027-11-01");
  });
});

describe("buildSeed", () => {
  const runs = recipe("runs");
  const seed = buildSeed(runs, [runs.samples[0]!, runs.extras[0]!], "total", today, counter());

  test("writes the note with every value as a tracked node", () => {
    const [, first, second] = seed.note.doc.blocks;
    expect(first).toMatchObject({ t: "p" });
    expect(valueIdsOf(seed.note.doc)).toEqual(seed.values.map((value) => value.id));
    expect(second?.t === "p" && second.c.map((inline) => (inline.t === "value" ? inline.label : inline.text)).join("")).toBe(sentenceOf(runs.extras[0]!.parts));
  });

  test("files each run into a row per day with its values already described", () => {
    expect(seed.rows.map((row) => row.period)).toEqual(["2026-11-18", "2026-11-15"]);
    const distance = seed.values.find((value) => value.text === "8 km")!;
    expect(distance).toMatchObject({ kind: "number", amount: 8, unit: "km", event: true, field: "distance", when: { on: "2026-11-15", grain: "day" } });
    expect(distance.subject?.entityId).toBe(seed.rows[1]!.id);
    expect(distance.origin?.noteId).toBe(seed.note.id);
    expect(seed.collection.glance).toBe("total");
  });

  test("shows the table with pace worked out", () => {
    const table = tableOf(seed.collection, seed.rows, seed.values);
    expect(table.headers).toEqual(["Day", "Distance", "Time", "Pace"]);
    expect(table.rows[0]).toEqual({ id: seed.rows[0]!.id, label: "Wed 18 Nov", cells: ["5 km", "27:40", "5:32/km"] });
    expect(table.rows[1]!.cells).toEqual(["8 km", "46:10", "5:46/km"]);
  });

  test("works out each glance", () => {
    expect(glanceValue("total", seed.collection, seed.rows, seed.values, today)).toBe("13 km");
    expect(glanceValue("count", seed.collection, seed.rows, seed.values, today)).toBe("1");
    expect(glanceValue("average", seed.collection, seed.rows, seed.values, today)).toBe("5:39/km");
  });

  test("previews a change in the note, the row, its pace and the home total", () => {
    const change = seed.changes.find((item) => item.sentence.startsWith("Actually Sunday"))!;
    const lines = previewChange({ seed, noteTitle: runs.noteTitle, change, glance: runs.glances[0], today });
    expect(lines).toEqual([
      { at: "note", title: "Running log", lead: "On Sunday I ran ", from: "8 km", to: "10 km", tail: " to Battersea Park and back in 46:10." },
      { at: "row", title: "Runs · Sun 15 Nov", label: "Distance", from: "8 km", to: "10 km" },
      { at: "row", title: "Runs · Sun 15 Nov", label: "Pace", from: "5:46/km", to: "4:37/km" },
      { at: "home", title: "Home · Runs", label: "Distance this month", from: "13 km", to: "15 km" },
    ]);
  });

  test("plans meals as one row per day and counts this week's days", () => {
    const meals = recipe("meals");
    const planned = buildSeed(meals, [meals.samples[0]!, meals.extras[0]!], "count", today, counter());
    expect(planned.rows.map((row) => row.period)).toEqual(["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19"]);
    expect(tableOf(planned.collection, planned.rows, planned.values).rows.map((row) => row.cells)).toEqual([["green curry"], ["pesto pasta"], ["salmon traybake"], ["chilli"]]);
    expect(glanceValue("count", planned.collection, planned.rows, planned.values, today)).toBe("4 of 7");
    const swap = planned.changes[0]!;
    expect(planned.values.find((value) => value.id === swap.valueId)?.text).toBe("salmon traybake");
  });

  test("names rows by entry for budgets and counts down to the next date", () => {
    const trips = recipe("trips");
    const planned = buildSeed(trips, [trips.samples[0]!, trips.extras[0]!], "countdown", today, counter());
    expect(planned.rows.map((row) => row.label)).toEqual(["Flights", "Fado dinner"]);
    expect(glanceValue("countdown", planned.collection, planned.rows, planned.values, today)).toBe("23 days");
    expect(glanceValue("total", planned.collection, planned.rows, planned.values, today)).toBe("£326");
  });

  test("offers a generic change when no sample prepared one", () => {
    const wedding = recipe("wedding");
    const planned = buildSeed(wedding, [{ ...wedding.extras[0]! }], "total", today, counter());
    expect(planned.changes).toEqual([{ sentence: "Actually it's £780, not £650", valueId: planned.values[0]!.id, to: { text: "£780", amount: 780 } }]);
  });
});
