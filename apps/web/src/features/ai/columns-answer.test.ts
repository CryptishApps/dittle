import { describe, expect, test } from "bun:test";
import { columnsPrompt, readColumnNames } from "./columns-answer";

describe("naming a new table's columns", () => {
  test("lists each column with its kind and an example", () => {
    expect(columnsPrompt("Things to do", "name", [{ name: "palace ticket price", kind: "money", example: "€32" }, { name: "trip date", kind: "date" }])).toBe(
      "Table: Things to do, one row per named thing\nColumns:\nc1 palace ticket price (money), e.g. €32\nc2 trip date (date)",
    );
  });

  test("reads one trimmed name per column", () => {
    expect(readColumnNames(JSON.stringify({ names: [" Price ", "Date"] }), 2)).toEqual(["Price", "Date"]);
  });

  test("keeps the working names when the answer doesn't fit the columns", () => {
    expect(readColumnNames(JSON.stringify({ names: ["Price"] }), 2)).toBeUndefined();
    expect(readColumnNames(JSON.stringify({ names: ["Price", ""] }), 2)).toBeUndefined();
    expect(readColumnNames(JSON.stringify({ names: ["Price", "price"] }), 2)).toBeUndefined();
    expect(readColumnNames(JSON.stringify({ names: ["Price", "x".repeat(40)] }), 2)).toBeUndefined();
    expect(readColumnNames(JSON.stringify({}), 2)).toBeUndefined();
  });
});
