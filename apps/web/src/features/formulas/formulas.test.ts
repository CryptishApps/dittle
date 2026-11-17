import { describe, expect, test } from "bun:test";
import type { StoredValue } from "@/features/notes/fact";
import { acceptFormula, formatAmount, recompute } from "./apply";
import { dimensionsOf } from "./dimensions";
import { evaluate, parseFormula, print } from "./engine";

const refs = (name: string) => (/^v\d+$/.test(name) ? Number(name.slice(1)) - 1 : undefined);
const value = (id: string, amount: number, extra: Partial<StoredValue> = {}): StoredValue => ({ id, text: String(amount), amount, ...extra });
const duration = (id: string, seconds: number, extra: Partial<StoredValue> = {}): StoredValue => ({ id, text: `${seconds} s`, kind: "duration", seconds, ...extra });

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

describe("dimensions", () => {
  const time = { s: 1 };
  const km = { km: 1 };

  test("time over distance is a pace and distance over time a speed", () => {
    expect(dimensionsOf(parseFormula("v1 / v2", refs), [time, km])).toEqual({ s: 1, km: -1 });
    expect(dimensionsOf(parseFormula("v2 / v1 * 2", refs), [time, km])).toEqual({ km: 1, s: -1 });
  });

  test("cancels matching units and refuses to add different ones", () => {
    expect(dimensionsOf(parseFormula("v1 / v2", refs), [time, time])).toEqual({});
    expect(dimensionsOf(parseFormula("v1 + v2", refs), [time, time])).toEqual(time);
    expect(dimensionsOf(parseFormula("v1 + v2", refs), [time, km])).toBeUndefined();
  });
});

describe("formulas with durations", () => {
  const distance = value("d", 10, { kind: "number", before: "", after: " km", unit: "km" });
  const time = duration("t", 3300);

  test("accepts a pace worked out from a time and a distance", () => {
    expect(acceptFormula("v2 / v1", 330, [distance, time])).toEqual({ expr: "$2 / $1", inputs: ["d", "t"] });
  });

  test("recomputes a pace as minutes and seconds per unit", () => {
    const pace = duration("p", 330, { unit: "km", formula: { expr: "$2 / $1", inputs: ["d", "t"] } });
    expect(recompute("d", [distance, time, pace], new Map([["d", 12]]))).toEqual([{ id: "p", text: "4:35/km", seconds: 275 }]);
  });

  test("recomputes a speed when the time changes", () => {
    const speed = value("v", 10.9, { kind: "number", before: "", after: " km/h", formula: { expr: "$1 / ($2 / 3600)", inputs: ["d", "t"] } });
    expect(recompute("t", [distance, time, speed], new Map([["t", 3000]]))).toEqual([{ id: "v", text: "12 km/h", amount: 12 }]);
  });

  test("recomputes a total time from durations", () => {
    const total = duration("sum", 3600, { formula: { expr: "$1 + $2", inputs: ["a", "b"] } });
    expect(recompute("a", [duration("a", 1800), duration("b", 1800), total], new Map([["a", 2400]]))).toEqual([{ id: "sum", text: "1 h 10 min", seconds: 4200 }]);
  });
});
