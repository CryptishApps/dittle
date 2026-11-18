import { describe, expect, test } from "bun:test";
import type { DraftValue } from "@/features/ai/capture-answer";
import { formulasFor, inlinesFor, shortTitle } from "./draft";

const money = (quote: string, amount: number, formula = ""): DraftValue => ({ quote, kind: "money", name: quote, about: "", event: false, amount, before: quote[0], after: "", formula, field: null });
const count = (quote: string, amount: number): DraftValue => ({ quote, kind: "count", name: "people", about: "", event: false, amount, before: "", after: "", formula: "", field: null });

describe("turning a tidy paragraph into note text with value nodes", () => {
  test("each quote becomes a value node in reading order, whatever order the values came in", () => {
    const inlines = inlinesFor("Villa is €1,680 for 5 of us, so €336 each.", [
      { id: "b", quote: "€336" },
      { id: "a", quote: "€1,680" },
      { id: "c", quote: "5" },
    ]);
    expect(inlines).toEqual([
      { t: "text", text: "Villa is " },
      { t: "value", id: "a", label: "€1,680" },
      { t: "text", text: " for " },
      { t: "value", id: "c", label: "5" },
      { t: "text", text: " of us, so " },
      { t: "value", id: "b", label: "€336" },
      { t: "text", text: " each." },
    ]);
  });

  test("a quote that is missing or overlaps an earlier one stays plain text", () => {
    expect(inlinesFor("Paid £45.", [{ id: "a", quote: "£45" }, { id: "b", quote: "45" }, { id: "c", quote: "£9" }])).toEqual([
      { t: "text", text: "Paid " },
      { t: "value", id: "a", label: "£45" },
      { t: "text", text: "." },
    ]);
  });
});

describe("keeping derived values as formulas", () => {
  test("a share each that matches its inputs becomes a formula over their ids", () => {
    const formulas = formulasFor([count("5", 5), money("€1,680", 1680), money("€336", 336, "v2 / v1")], ["p", "v", "s"]);
    expect(formulas.get(2)).toEqual({ expr: "$2 / $1", inputs: ["p", "v"] });
  });

  test("a formula that does not add up, or points at itself, is dropped", () => {
    expect(formulasFor([count("5", 5), money("€1,680", 1680), money("€300", 300, "v2 / v1")]).size).toBe(0);
    expect(formulasFor([money("€336", 336, "v1")]).size).toBe(0);
  });
});

describe("saving an entry as it was typed", () => {
  test("a short entry is the title", () => {
    expect(shortTitle("call the plumber")).toEqual({ title: "call the plumber", body: "" });
  });

  test("a long entry gets a cut title and keeps all its words in the body", () => {
    const entry = "remember to ask the venue whether the band can play past eleven and if parking is free";
    const { title, body } = shortTitle(entry);
    expect(title.endsWith("…")).toBe(true);
    expect(title.length).toBeLessThanOrEqual(61);
    expect(body).toBe(entry);
  });
});
