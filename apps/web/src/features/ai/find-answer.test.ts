import { describe, expect, test } from "bun:test";
import { readFound } from "./find-answer";

const paragraph = "I ran 5km today and I want that to go into my first entry for a list of runs.";
const answer = (data: unknown) => JSON.stringify(data);

describe("reading what the model found in a paragraph", () => {
  test("a sentence asking to file the paragraph into a list becomes a filing with the list's name", () => {
    const found = readFound(
      answer({
        values: [{ quote: "5km", kind: "number", name: "run_distance" }],
        requests: [],
        filings: [{ sentence: "I want that to go into my first entry for a list of runs.", list: "Runs" }],
      }),
      paragraph,
    );
    expect(found.values).toEqual([{ quote: "5km", kind: "number", name: "run_distance" }]);
    expect(found.filings).toEqual([{ sentence: "I want that to go into my first entry for a list of runs.", list: "Runs" }]);
    expect(found.requests).toEqual([]);
  });

  test("a sentence the model gives as both a request and a filing is only a filing", () => {
    const sentence = "I want that to go into my first entry for a list of runs.";
    const found = readFound(answer({ values: [], requests: [sentence], filings: [{ sentence, list: "Runs" }] }), paragraph);
    expect(found.requests).toEqual([]);
    expect(found.filings).toHaveLength(1);
  });

  test("filings that are not in the paragraph or have no list name are dropped", () => {
    const found = readFound(
      answer({
        values: [],
        requests: [],
        filings: [
          { sentence: "Put it in my swims.", list: "Swims" },
          { sentence: "I want that to go into my first entry for a list of runs.", list: "  " },
        ],
      }),
      paragraph,
    );
    expect(found.filings).toEqual([]);
  });

  test("a list name is trimmed and kept short", () => {
    const found = readFound(
      answer({ values: [], requests: [], filings: [{ sentence: "I want that to go into my first entry for a list of runs.", list: `  ${"Runs ".repeat(20)}` }] }),
      paragraph,
    );
    expect(found.filings[0]!.list.length).toBeLessThanOrEqual(40);
    expect(found.filings[0]!.list.startsWith("Runs")).toBe(true);
  });

  test("an answer without filings still reads values and requests", () => {
    const found = readFound(answer({ values: [{ quote: "5km", kind: "number", name: "distance" }], requests: [] }), paragraph);
    expect(found.filings).toEqual([]);
    expect(found.values).toHaveLength(1);
  });

  test("write requests still come through", () => {
    const text = "Dinner for 12 on 3 May. Add a shopping list here.";
    const found = readFound(answer({ values: [], requests: ["Add a shopping list here."], filings: [] }), text);
    expect(found.requests).toEqual(["Add a shopping list here."]);
  });
});
