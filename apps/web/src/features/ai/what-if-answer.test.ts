import { describe, expect, test } from "bun:test";
import { readWhatIfAnswer, whatIfPrompt, type WhatIfOption } from "./what-if-answer";

const shown: WhatIfOption[] = [
  { text: "6", kind: "count", name: "group_size", about: "Lisbon trip", notes: ["Villa", "Flights"] },
  { text: "£118", kind: "money", name: "seat_price", about: "flights", notes: ["Flights"] },
];
const answer = (data: Record<string, unknown>) => JSON.stringify({ operation: "set", number: 0, ...data });

describe("readWhatIfAnswer", () => {
  test("reads the value by its number, with the operation and number", () => {
    expect(readWhatIfAnswer(answer({ value: "v1", operation: "add", number: 2 }), shown)).toEqual({ option: 0, operation: "add", number: 2 });
    expect(readWhatIfAnswer(answer({ value: "v2", operation: "multiply", number: 1.1 }), shown)).toEqual({ option: 1, operation: "multiply", number: 1.1 });
  });

  test("treats none as a refusal", () => {
    expect(readWhatIfAnswer(answer({ value: "none" }), shown)).toBeNull();
  });

  test("rejects values outside the options shown", () => {
    expect(readWhatIfAnswer(answer({ value: "v3", number: 4 }), shown)).toBeNull();
    expect(readWhatIfAnswer(answer({ value: "c1", number: 4 }), shown)).toBeNull();
  });

  test("rejects an unknown operation or a number that is not a finite number", () => {
    expect(readWhatIfAnswer(answer({ value: "v1", operation: "divide", number: 2 }), shown)).toBeNull();
    expect(readWhatIfAnswer(answer({ value: "v1", number: "8" }), shown)).toBeNull();
    expect(readWhatIfAnswer(JSON.stringify({ value: "v1", operation: "set" }), shown)).toBeNull();
  });
});

describe("whatIfPrompt", () => {
  test("numbers the tracked values with what they are and where they appear", () => {
    expect(whatIfPrompt("  What if 2 more people come? ", shown)).toBe(
      [
        "Values:",
        'v1: 6 · count · group size · about Lisbon trip · in "Villa", "Flights"',
        'v2: £118 · money · seat price · about flights · in "Flights"',
        "Question: What if 2 more people come?",
      ].join("\n"),
    );
  });
});
