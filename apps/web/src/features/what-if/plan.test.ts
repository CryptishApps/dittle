import { describe, expect, test } from "bun:test";
import { summarise, valueIdsOf } from "@/features/notes/note-doc";
import { sampleTrip } from "@/features/notes/sample-trip";
import { RECIPES } from "@/features/onboarding/recipes";
import { buildSeed } from "@/features/onboarding/seed";
import { applyOperation, changeable, exampleQuestion, labelOf, optionsFor, previewWhatIf, scopeOf } from "./plan";

const plan = sampleTrip(new Date(2026, 10, 17));
const notes = plan.notes.map((note) => ({ id: note.id, title: summarise(note.doc).title, valueIds: valueIdsOf(note.doc) }));
const byName = (name: string) => plan.values.find((value) => value.name === name)!;

const logged = (id: string) => {
  const recipe = RECIPES.find((item) => item.id === id)!;
  return buildSeed(recipe, recipe.samples, undefined, new Date(2026, 10, 18)).values;
};

describe("changeable", () => {
  test("offers numbers people set themselves, not calculated ones or dates", () => {
    expect(changeable(plan.values).map((value) => value.text).sort()).toEqual(["£118", "€1,680", "€18", "€20", "€45", "6"].sort());
  });

  test("offers nothing from logs of runs and workouts", () => {
    expect(changeable([...logged("runs"), ...logged("workouts")])).toEqual([]);
  });

  test("offers only values that stand until they change", () => {
    const base = { kind: "count" as const, amount: 4, before: "", after: "" };
    const shown = changeable([
      { id: "standing", text: "4", ...base, event: false },
      { id: "logged", text: "4", ...base, event: true },
      { id: "unknown", text: "4", ...base },
    ]);
    expect(shown.map((value) => value.id)).toEqual(["standing"]);
  });

  test("puts the values most others are calculated from first", () => {
    expect(labelOf(changeable(plan.values)[0]!)).toBe("Group size");
  });
});

describe("exampleQuestion", () => {
  test("asks about a real value the person has", () => {
    expect(exampleQuestion(byName("group_size"))).toBe("What if Group size goes from 6 to 8?");
    expect(exampleQuestion(byName("seat_price"))).toBe("What if Seat price goes from £118 to £142?");
  });
});

describe("scopeOf", () => {
  test("names the values it can change and the notes they are in", () => {
    expect(scopeOf(changeable(plan.values), notes)).toBe("Tries it on Group size, Villa cost and 2 more in Villa, Flights and 3 more notes");
  });

  test("names every value and note when there are few", () => {
    expect(scopeOf([byName("seat_price")], notes)).toBe("Tries it on Seat price in Flights");
  });
});

describe("optionsFor", () => {
  test("lists each value with every note it is in", () => {
    const [group] = optionsFor([byName("group_size")], notes);
    expect(group).toEqual({ text: "6", kind: "count", name: "group_size", about: "Lisbon trip", notes: ["Villa", "Flights"] });
  });
});

describe("applyOperation", () => {
  test("sets, adds, subtracts and multiplies, to the nearest hundredth", () => {
    expect(applyOperation(6, "set", 8)).toBe(8);
    expect(applyOperation(6, "add", 2)).toBe(8);
    expect(applyOperation(6, "subtract", 2)).toBe(4);
    expect(applyOperation(118, "multiply", 1.1)).toBe(129.8);
  });
});

describe("previewWhatIf", () => {
  test("shows the change and every value that follows it, with the notes they are in", () => {
    const preview = previewWhatIf(byName("group_size"), "add", 2, plan.values, notes)!;
    expect({ label: labelOf(preview.changed.value), from: preview.changed.from, to: preview.changed.to, notes: preview.changed.notes }).toEqual({
      label: "Group size",
      from: "6",
      to: "8",
      notes: ["Villa", "Flights"],
    });
    expect(preview.follows.map((effect) => [labelOf(effect.value), effect.from, effect.to, effect.notes])).toEqual([
      ["Villa cost per person", "€280", "€210", ["Villa"]],
      ["Flights total", "£708", "£944", ["Flights"]],
    ]);
  });

  test("formats money the way the note writes it", () => {
    expect(previewWhatIf(byName("villa_cost"), "set", 1900, plan.values, notes)!.follows.map((effect) => effect.to)).toEqual(["€316.67"]);
  });

  test("refuses a change that goes below zero", () => {
    expect(previewWhatIf(byName("group_size"), "subtract", 7, plan.values, notes)).toBeNull();
  });
});
