import { describe, expect, test } from "bun:test";
import { placePrompt, readPlaceAnswer, type PlaceCollection } from "./place-answer";

const runs: PlaceCollection = { name: "Runs", per: "day", fields: [{ name: "date", kind: "date" }, { name: "distance", kind: "number" }], rows: [] };
const vendors: PlaceCollection = { name: "Vendors", per: "name", fields: [{ name: "price per head", kind: "money" }], rows: ["Rosa's Kitchen", "Hops & Co"] };
const shown = [runs, vendors];
const sentence = "Green Fork wants £42 per head, a bit more than Hops & Co.";
const answer = (data: Record<string, string | boolean>) => JSON.stringify({ row: "none", label: "", ...data });

describe("readPlaceAnswer", () => {
  test("reads a day collection and ignores any row", () => {
    expect(readPlaceAnswer(answer({ collection: "k1", field: "f2", row: "r1" }), shown, sentence)).toEqual({ collection: 0, field: 1, row: null, sure: true });
  });

  test("reads an existing row by its number", () => {
    expect(readPlaceAnswer(answer({ collection: "k2", field: "f1", row: "r2" }), shown, sentence)).toEqual({ collection: 1, field: 0, row: { row: 1 }, sure: true });
  });

  test("accepts a new row only when its label is quoted from the sentence", () => {
    expect(readPlaceAnswer(answer({ collection: "k2", field: "f1", row: "new", label: " Green Fork " }), shown, sentence).row).toEqual({ label: "Green Fork" });
    expect(readPlaceAnswer(answer({ collection: "k2", field: "f1", row: "new", label: "Green Forks" }), shown, sentence).row).toBeNull();
    expect(readPlaceAnswer(answer({ collection: "k2", field: "f1", row: "new", label: "" }), shown, sentence).row).toBeNull();
  });

  test("takes a new row's capitals from the sentence when the model changed them", () => {
    expect(readPlaceAnswer(answer({ collection: "k2", field: "f1", row: "new", label: "green fork" }), shown, sentence).row).toEqual({ label: "Green Fork" });
    const accented = "Jerónimos Monastery and pastéis, €18 each.";
    expect(readPlaceAnswer(answer({ collection: "k2", field: "f1", row: "new", label: "jerónimos monastery and pastéis" }), shown, accented).row).toEqual({ label: "Jerónimos Monastery and pastéis" });
  });

  test("keeps a pick the model is unsure about so the person can be asked", () => {
    expect(readPlaceAnswer(answer({ collection: "k2", field: "f1", row: "new", label: "Green Fork", sure: false }), shown, sentence)).toEqual({ collection: 1, field: 0, row: { label: "Green Fork" }, sure: false });
  });

  test("rejects numbers outside the options shown", () => {
    expect(readPlaceAnswer(answer({ collection: "k2", field: "f2", row: "r3" }), shown, sentence)).toEqual({ collection: 1, field: null, row: null, sure: true });
    expect(readPlaceAnswer(answer({ collection: "k3", field: "f1" }), shown, sentence)).toEqual({ collection: null, field: null, row: null, sure: false });
    expect(readPlaceAnswer(answer({ collection: "none", field: "none" }), shown, sentence).collection).toBeNull();
  });
});

describe("placePrompt", () => {
  test("numbers collections, fields and the rows of name collections", () => {
    expect(placePrompt(sentence, { text: "£42", kind: "money", name: "price_per_head", about: "Green Fork" }, shown)).toBe(
      [
        `Sentence: ${sentence}`,
        "Item: £42 · money · price_per_head · about Green Fork",
        "Collections:",
        "k1: Runs, one row per day. f1 date (date), f2 distance (number)",
        "k2: Vendors, one row per named thing. f1 price per head (money). Rows: r1 Rosa's Kitchen, r2 Hops & Co",
      ].join("\n"),
    );
  });
});
