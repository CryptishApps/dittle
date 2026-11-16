import { describe, expect, test } from "bun:test";
import type { StoredValue } from "@/features/notes/fact";
import { acceptFormula, formatAmount, recompute } from "./apply";
import { evaluate, parseFormula, print } from "./engine";

const refs = (name: string) => (/^v\d+$/.test(name) ? Number(name.slice(1)) - 1 : undefined);
const value = (id: string, amount: number, extra: Partial<StoredValue> = {}): StoredValue => ({ id, text: String(amount), amount, ...extra });

describe("formula engine", () => {
  test("respects precedence and brackets", () => {
    expect(evaluate(parseFormula("v1 + v2 * 2", refs), [1, 3])).toBe(7);
    expect(evaluate(parseFormula("(v1 + v2) * 2", refs), [1, 3])).toBe(8);
  });

  test("reads × and ÷ from the model", () => {
    expect(evaluate(parseFormula("v1 × v2 ÷ 4", refs), [80, 38])).toBe(760);
  });

  test("rejects unknown names and stray text", () => {
    expect(() => parseFormula("v1 * guests", refs)).toThrow();
    expect(() => parseFormula("v1 * v2)", refs)).toThrow();
  });

  test("division by zero is not a number", () => {
    expect(evaluate(parseFormula("v1 / v2", refs), [5, 0])).toBeNaN();
  });

  test("prints with the right brackets", () => {
    expect(print(parseFormula("(v1 + v2) * v3", refs), (index) => `x${index}`)).toBe("(x0 + x1) × x2");
  });
});

describe("accepting a suggested formula", () => {
  const guests = value("g", 80);
  const perHead = value("p", 38);
  const flights = value("f", 182);

  test("keeps a formula that reproduces the value", () => {
    expect(acceptFormula("v1 * v2", 3040, [guests, perHead, flights])).toEqual({ expr: "$1 * $2", inputs: ["g", "p"] });
  });

  test("allows a little rounding for 'roughly'", () => {
    expect(acceptFormula("v1 * v2", 3000, [guests, perHead])).toBeDefined();
  });

  test("drops a formula that gives a different number", () => {
    expect(acceptFormula("v1 + v2", 3040, [guests, perHead])).toBeUndefined();
  });

  test("drops an answer with no items", () => {
    expect(acceptFormula("3040", 3040, [guests])).toBeUndefined();
    expect(acceptFormula("", 3040, [guests])).toBeUndefined();
  });
});

describe("recomputing", () => {
  test("updates dependents in order", () => {
    const values = [
      value("g", 80),
      value("p", 38, { kind: "money", before: "£", after: "" }),
      value("t", 3040, { kind: "money", before: "£", after: "", formula: { expr: "$1 * $2", inputs: ["g", "p"] } }),
      value("d", 1520, { kind: "money", before: "£", after: "", formula: { expr: "$1 / 2", inputs: ["t"] } }),
    ];
    expect(recompute("g", values, new Map([["g", 95]]))).toEqual([
      { id: "t", text: "£3,610", amount: 3610 },
      { id: "d", text: "£1,805", amount: 1805 },
    ]);
  });

  test("formats pence only when needed", () => {
    expect(formatAmount({ kind: "money", before: "£", after: "" }, 2.5)).toBe("£2.50");
    expect(formatAmount({ kind: "number", before: "", after: " km" }, 5)).toBe("5 km");
  });
});
