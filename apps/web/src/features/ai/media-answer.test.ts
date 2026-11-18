import { describe, expect, test } from "bun:test";
import { baseMimeType, fitWithin, readMediaAnswer } from "./media-answer";

describe("reading the model's media answer", () => {
  test("returns the text with spacing tidied", () => {
    expect(readMediaAnswer(JSON.stringify({ text: "  Ran 5 km   in 27:40 \n\n  Felt good " }))).toBe("Ran 5 km in 27:40\nFelt good");
  });

  test("an empty or malformed answer gives empty text", () => {
    expect(readMediaAnswer(JSON.stringify({ text: "   " }))).toBe("");
    expect(readMediaAnswer("not json")).toBe("");
    expect(readMediaAnswer(JSON.stringify({ text: 4 }))).toBe("");
    expect(readMediaAnswer("null")).toBe("");
  });
});

describe("downscaling images", () => {
  test("small images keep their size", () => {
    expect(fitWithin(1200, 800, 1600)).toEqual({ width: 1200, height: 800 });
  });

  test("big images shrink so the longest side fits, keeping the shape", () => {
    expect(fitWithin(3200, 2000, 1600)).toEqual({ width: 1600, height: 1000 });
    expect(fitWithin(1170, 2532, 1600)).toEqual({ width: 739, height: 1600 });
  });
});

describe("media types", () => {
  test("drops codec parameters", () => {
    expect(baseMimeType("audio/webm;codecs=opus")).toBe("audio/webm");
    expect(baseMimeType("image/png")).toBe("image/png");
  });
});
