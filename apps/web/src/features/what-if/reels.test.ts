import { describe, expect, test } from "bun:test";
import { REEL_CELLS, reelColumns } from "./reels";

const landsOn = (from: string, to: string) =>
  reelColumns(from, to)
    .map((column) => (column.kind === "still" ? column.char : REEL_CELLS[column.to]))
    .join("");

describe("reelColumns", () => {
  test("lands every column on the new text", () => {
    expect(landsOn("£708", "£944")).toBe("£944");
    expect(landsOn("€280", "€316.67")).toBe("€316.67");
    expect(landsOn("6", "26")).toBe("26");
  });

  test("starts each reel on the digit it replaces, lining numbers up from the right", () => {
    expect(reelColumns("€280", "€210")).toEqual([
      { kind: "still", char: "€" },
      { kind: "reel", from: 2, to: 2 },
      { kind: "reel", from: 8, to: 11 },
      { kind: "reel", from: 0, to: 0 },
    ]);
    expect(reelColumns("6", "26")).toEqual([
      { kind: "reel", from: 0, to: 12 },
      { kind: "reel", from: 6, to: 6 },
    ]);
  });

  test("always rolls forwards", () => {
    for (const column of reelColumns("£999", "£100")) if (column.kind === "reel") expect(column.to).toBeGreaterThanOrEqual(column.from);
  });
});
