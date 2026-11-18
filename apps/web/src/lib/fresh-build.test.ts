import { describe, expect, test } from "bun:test";
import { shouldReload } from "./fresh-build";

describe("shouldReload", () => {
  test("reloads the first time a chunk from an older build fails", () => {
    expect(shouldReload(undefined, 1_000)).toBe(true);
  });

  test("does not reload again straight after a reload, so a broken deploy cannot loop", () => {
    expect(shouldReload(1_000, 5_000)).toBe(false);
  });

  test("reloads again once the earlier reload is old", () => {
    expect(shouldReload(1_000, 20_000)).toBe(true);
  });

  test("treats an unreadable stored time as no earlier reload", () => {
    expect(shouldReload(Number.NaN, 1_000)).toBe(true);
  });
});
