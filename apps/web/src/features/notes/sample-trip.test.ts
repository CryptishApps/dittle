import { describe, expect, test } from "bun:test";
import { upcomingDates, daysUntil, summariseCollection } from "@/features/collections/summary";
import { recompute } from "@/features/formulas/apply";
import { summarise, valueIdsOf } from "./note-doc";
import { sampleTrip, tripStart } from "./sample-trip";

const today = new Date(2026, 10, 17);
const plan = sampleTrip(today);
const byName = (name: string) => plan.values.find((value) => value.name === name)!;

describe("tripStart", () => {
  test("is the first Friday at least three weeks out", () => {
    expect(tripStart(today)).toBe("2026-12-11");
    expect(tripStart(new Date(2026, 10, 20))).toBe("2026-12-11");
    expect(tripStart(new Date(2026, 10, 21))).toBe("2026-12-18");
  });
});

describe("sampleTrip", () => {
  test("reads like the plan in the notes", () => {
    expect(plan.notes.map((note) => summarise(note.doc).title)).toEqual(["Villa", "Flights", "Fado night", "Pena Palace", "Jerónimos and pastéis"]);
    expect(summarise(plan.notes[0]!.doc).text).toBe("The villa in Alfama is €1,680 for four nights. There are 6 of us, so €280 each.");
    expect(summarise(plan.notes[1]!.doc).text).toBe("6 seats at £118 each, £708 in total. We land on Fri 11 December.");
  });

  test("tags every value in the note it comes from, and shares the group size", () => {
    const tagged = plan.notes.flatMap((note) => valueIdsOf(note.doc));
    expect(new Set(tagged)).toEqual(new Set(plan.values.map((value) => value.id)));
    const group = byName("group_size");
    expect(plan.notes.filter((note) => valueIdsOf(note.doc).includes(group.id)).map((note) => summarise(note.doc).title)).toEqual(["Villa", "Flights"]);
    for (const value of plan.values) {
      const home = plan.notes.find((note) => note.id === value.origin?.noteId)!;
      expect(valueIdsOf(home.doc)).toContain(value.id);
      expect(summarise(home.doc).text).toBe(value.origin!.sentence);
    }
  });

  test("keeps its formulas true, and follows a bigger group", () => {
    const changes = recompute(byName("group_size").id, plan.values, new Map([[byName("group_size").id, 8]]));
    expect(changes.map((change) => change.text).sort()).toEqual(["£944", "€210"]);
    const unchanged = recompute(byName("group_size").id, plan.values, new Map());
    expect(unchanged.map((change) => [change.text, plan.values.find((value) => value.id === change.id)!.text])).toEqual([
      ["€280", "€280"],
      ["£708", "£708"],
    ]);
  });

  test("files each thing to do in one row with a price and a date", () => {
    expect(plan.rows.map((row) => row.label)).toEqual(["Clube de Fado", "Pena Palace", "Jerónimos Monastery"]);
    const summary = summariseCollection({ ...plan.collection, createdAt: 0 }, plan.rows.map((row) => ({ ...row, createdAt: 0 })), plan.values, today);
    expect(summary.count).toBe(3);
    expect(summary.totals[0]?.text).toBe("€83");
    for (const row of plan.rows) {
      expect(plan.values.filter((value) => value.subject?.entityId === row.id).map((value) => value.field).sort()).toEqual(["date", "price"]);
    }
  });

  test("counts down to the landing date", () => {
    const [first] = upcomingDates(plan.values, [], today);
    expect(first?.value.name).toBe("landing_date");
    expect(daysUntil(first!.on, today)).toBe(24);
  });
});
