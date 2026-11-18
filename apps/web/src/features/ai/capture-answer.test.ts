import { describe, expect, test } from "bun:test";
import { readRoute, readTidy, routePrompt, type CaptureShown } from "./capture-answer";

const shown: CaptureShown = {
  collections: [
    { name: "Runs", per: "day", fields: [{ name: "date", kind: "date" }, { name: "distance", kind: "number" }, { name: "time", kind: "duration" }], rows: [] },
    { name: "Vendors", per: "name", fields: [{ name: "price per head", kind: "money" }], rows: ["Rosa's Kitchen"] },
  ],
  values: [{ text: "£118", kind: "money", name: "flight_price", about: "flights", noteTitle: "Lisbon long weekend" }],
  notes: ["Lisbon long weekend"],
};

const empty = { collection: "none", list: "", row: "none", label: "", target: "none", amount: "", duration: "", text: "", note: "none", title: "", paragraphs: [] };
const answer = (data: Record<string, unknown>) => JSON.stringify({ ...empty, ...data });
const value = (data: Record<string, unknown>) => ({
  kind: "text",
  name: "value",
  about: "",
  event: false,
  when: "",
  grain: "none",
  amount: "",
  before: "",
  after: "",
  unit: "",
  duration: "",
  formula: "",
  field: "none",
  ...data,
});

const run = {
  text: "Ran 6 km by the canal in 31 minutes.",
  values: [
    value({ quote: "6 km", kind: "number", name: "run_distance", event: true, when: "2026-11-18", grain: "day", amount: "6", after: " km", unit: "km", field: "f2" }),
    value({ quote: "31 minutes", kind: "duration", name: "run_time", event: true, duration: "PT31M", field: "f3" }),
  ],
};

describe("reading where a capture goes", () => {
  test("a run is filed into the chosen collection with each value's field and quantity", () => {
    const route = readRoute(answer({ action: "file", collection: "k1", paragraphs: [run] }), shown);
    expect(route.action).toBe("file");
    if (route.action !== "file") return;
    expect(route.collection).toBe(0);
    expect(route.row).toBeNull();
    expect(route.paragraph.values.map((item) => [item.quote, item.field, item.amount ?? item.seconds])).toEqual([
      ["6 km", 1, 6],
      ["31 minutes", 2, 1860],
    ]);
    expect(route.paragraph.values[0]!.when).toEqual({ on: "2026-11-18", grain: "day" });
    expect(route.paragraph.values[0]!.unit).toBe("km");
  });

  test("values the paragraph does not contain, repeats, and fields past the collection's end are dropped", () => {
    const paragraph = { ...run, values: [...run.values, value({ quote: "8 km", field: "f2" }), run.values[0], value({ quote: "canal", field: "f7" })] };
    const route = readRoute(answer({ action: "file", collection: "k1", paragraphs: [paragraph] }), shown);
    if (route.action !== "file") throw new Error(route.action);
    expect(route.paragraph.values.map((item) => item.quote)).toEqual(["6 km", "31 minutes"]);
  });

  test("filing with no value that fits a field becomes a note", () => {
    const paragraph = { text: run.text, values: run.values.map((item) => ({ ...item, field: "none" })) };
    expect(readRoute(answer({ action: "file", collection: "k1", title: "Canal run", paragraphs: [paragraph] }), shown).action).toBe("note");
  });

  test("filing into a new list keeps the list's name and all the values", () => {
    const route = readRoute(answer({ action: "file", collection: "new", list: "Swims", paragraphs: [run] }), shown);
    expect(route).toMatchObject({ action: "file", collection: "new", list: "Swims", row: null });
  });

  test("a collection with a row per named thing takes the chosen row or a new label", () => {
    const paragraph = { text: "Hops & Co are £42 a head.", values: [value({ quote: "£42", kind: "money", amount: "42", before: "£", unit: "GBP", field: "f1" })] };
    const existing = readRoute(answer({ action: "file", collection: "k2", row: "r1", paragraphs: [paragraph] }), shown);
    const fresh = readRoute(answer({ action: "file", collection: "k2", row: "new", label: "Hops & Co", paragraphs: [paragraph] }), shown);
    expect(existing).toMatchObject({ row: 0 });
    expect(fresh).toMatchObject({ row: { label: "Hops & Co" } });
  });

  test("an update names the candidate and the new amount", () => {
    expect(readRoute(answer({ action: "update", target: "c1", amount: "140" }), shown)).toEqual({ action: "update", target: 0, text: "", amount: 140 });
  });

  test("an update to a candidate that was not shown falls back to a note when there is text, and fails otherwise", () => {
    expect(() => readRoute(answer({ action: "update", target: "c2", amount: "140" }), shown)).toThrow();
    const route = readRoute(answer({ action: "update", target: "c9", amount: "140", title: "Flights", paragraphs: [{ text: "Flights went up to £140.", values: [] }] }), shown);
    expect(route.action).toBe("note");
  });

  test("an update without a new value is not applied", () => {
    expect(() => readRoute(answer({ action: "update", target: "c1" }), shown)).toThrow();
  });

  test("adding to a note needs a shown note and a paragraph", () => {
    const paragraphs = [{ text: "The villa has a pool.", values: [] }];
    expect(readRoute(answer({ action: "add", note: "n1", paragraphs }), shown)).toEqual({ action: "add", note: 0, paragraphs });
    expect(readRoute(answer({ action: "add", note: "n4", paragraphs }), shown).action).toBe("note");
  });

  test("a title on its own opens a note", () => {
    expect(readRoute(answer({ action: "open", title: "  Garden plans " }), shown)).toEqual({ action: "open", title: "Garden plans" });
  });

  test("an unknown action with nothing usable is an error", () => {
    expect(() => readRoute(answer({ action: "dance" }), shown)).toThrow();
    expect(() => readRoute("not json", shown)).toThrow();
  });

  test("the prompt numbers collections, values and notes the way the reader expects", () => {
    const prompt = routePrompt("ran 6k", "Dates: today", shown);
    expect(prompt).toContain("k1: Runs, one row per day. f1 date (date), f2 distance (number), f3 time (duration)");
    expect(prompt).toContain("k2: Vendors, one row per named thing. f1 price per head (money). Rows: r1 Rosa's Kitchen");
    expect(prompt).toContain('c1: £118 · money · flight_price · about flights · in "Lisbon long weekend"');
    expect(prompt).toContain("n1: Lisbon long weekend");
    expect(prompt.endsWith("Entry: ran 6k")).toBe(true);
  });
});

describe("reading a tidied paste", () => {
  test("keeps the title, paragraphs and formulas, and drops values not in their paragraph", () => {
    const draft = readTidy(
      JSON.stringify({
        title: "Lisbon long weekend",
        paragraphs: [
          { text: "5 of us are going.", values: [value({ quote: "5", kind: "count", amount: "5" }), value({ quote: "6", kind: "count", amount: "6" })] },
          { text: "", values: [] },
          { text: "Villa is €1,680, so €336 each.", values: [value({ quote: "€1,680", kind: "money", amount: "1680", before: "€", unit: "EUR" }), value({ quote: "€336", kind: "money", amount: "336", before: "€", unit: "EUR", formula: "v2 / v1" })] },
        ],
      }),
    );
    expect(draft.title).toBe("Lisbon long weekend");
    expect(draft.paragraphs.map((paragraph) => paragraph.values.map((item) => item.quote))).toEqual([["5"], ["€1,680", "€336"]]);
    expect(draft.paragraphs[1]!.values[1]).toMatchObject({ amount: 336, before: "€", after: "", unit: "EUR", formula: "v2 / v1", field: null });
  });

  test("a before or after that is not in the quote is dropped, and an unknown currency is not kept", () => {
    const draft = readTidy(JSON.stringify({ title: "Receipt", paragraphs: [{ text: "Total £12.50.", values: [value({ quote: "£12.50", kind: "money", amount: "12.5", before: "$", unit: "XYZ" })] }] }));
    expect(draft.paragraphs[0]!.values[0]).toMatchObject({ amount: 12.5, before: "", after: "" });
    expect(draft.paragraphs[0]!.values[0]!.unit).toBeUndefined();
  });

  test("an empty answer is an error", () => {
    expect(() => readTidy(JSON.stringify({ title: " ", paragraphs: [] }))).toThrow();
  });
});
