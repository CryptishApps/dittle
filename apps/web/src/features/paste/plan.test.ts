import { describe, expect, test } from "bun:test";
import type { StoredValue } from "@/features/notes/fact";
import { planUpdates, trackedOptions } from "./plan";

const guests: StoredValue = { id: "guests", text: "80", kind: "count", amount: 80, before: "", after: "", origin: { noteId: "catering", sentence: "80 guests" } };
const price: StoredValue = { id: "price", text: "£38", kind: "money", amount: 38, before: "£", after: "", unit: "GBP", updatedAt: 2, origin: { noteId: "catering", sentence: "£38 a head" } };
const total: StoredValue = { id: "total", text: "£3,040", kind: "money", amount: 3040, before: "£", after: "", formula: { expr: "$1 * $2", inputs: ["guests", "price"] } };
const deposit: StoredValue = { id: "deposit", text: "4 June", kind: "date", when: { on: "2026-06-04", grain: "day" }, updatedAt: 1 };
const values = [guests, price, total, deposit];

describe("planUpdates", () => {
  test("a new price recomputes the total that follows it", () => {
    const plan = planUpdates(values, [{ id: "price", text: "£42", quantity: { amount: 42 } }]);
    expect(plan.map((change) => [change.id, change.before.text, change.after.text])).toEqual([
      ["price", "£38", "£42"],
      ["total", "£3,040", "£3,360"],
    ]);
    expect(plan[0]!.after.history).toEqual([{ text: "£38", at: expect.any(Number) }]);
  });

  test("two changes in one go both reach the total", () => {
    const plan = planUpdates(values, [
      { id: "guests", text: "90", quantity: { amount: 90 } },
      { id: "price", text: "£42", quantity: { amount: 42 } },
    ]);
    expect(plan.find((change) => change.id === "total")?.after).toMatchObject({ text: "£3,780", amount: 3780 });
  });

  test("a date change moves its day", () => {
    const [change] = planUpdates(values, [{ id: "deposit", text: "30 May", quantity: {}, when: { on: "2026-05-30", grain: "day" } }]);
    expect(change).toMatchObject({ before: { text: "4 June", when: { on: "2026-06-04" } }, after: { text: "30 May", when: { on: "2026-05-30" } } });
  });
});

describe("trackedOptions", () => {
  test("offers values used in a note, newest first, never calculated ones", () => {
    const notes = [{ id: "catering", title: "Catering", valueIds: ["guests", "price", "total"] }];
    const { ids, tracked } = trackedOptions(values, notes);
    expect(ids).toEqual(["price", "guests"]);
    expect(tracked[0]).toMatchObject({ text: "£38", noteTitle: "Catering", before: "£", unit: "GBP" });
  });
});
