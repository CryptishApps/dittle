import { describe, expect, test } from "bun:test";
import { RECIPES, sentenceOf } from "./recipes";
import { sampleFromReading } from "./reading";
import { onboardingView } from "./stage";

const runs = RECIPES.find((recipe) => recipe.id === "runs")!;
const meals = RECIPES.find((recipe) => recipe.id === "meals")!;

describe("sampleFromReading", () => {
  test("turns a read run into tracked parts with amounts, units and seconds", () => {
    const sentence = "Did 10 km on Tuesday in 52:30, felt great";
    const sample = sampleFromReading(
      sentence,
      [
        {
          day: "2026-11-17",
          values: [
            { field: "f2", quote: "10 km", amount: "10", before: "", after: " km", unit: "km" },
            { field: "f3", quote: "52:30", duration: "PT52M30S" },
            { field: "f1", quote: "Tuesday" },
          ],
        },
      ],
      runs.collection,
    )!;
    expect(sentenceOf(sample.parts)).toBe(sentence);
    expect(sample.entries).toEqual([{ day: { iso: "2026-11-17" } }]);
    expect(sample.parts.filter((part) => typeof part !== "string")).toEqual([
      { v: "10 km", f: "distance", e: 0, amount: 10, before: "", after: " km", unit: "km" },
      { v: "Tuesday", f: "date", e: 0 },
      { v: "52:30", f: "time", e: 0, seconds: 3150 },
    ]);
  });

  test("splits a list into one entry per day and skips quotes that are not in the sentence", () => {
    const sentence = "Thursday tacos, Friday tacos";
    const sample = sampleFromReading(
      sentence,
      [
        { day: "2026-11-19", values: [{ field: "f2", quote: "tacos" }, { field: "f1", quote: "Thursday" }] },
        { day: "2026-11-20", values: [{ field: "f2", quote: "tacos" }, { field: "f1", quote: "Friday" }] },
        { day: "2026-11-21", values: [{ field: "f2", quote: "sushi" }] },
      ],
      meals.collection,
    )!;
    expect(sample.entries).toHaveLength(2);
    expect(sample.parts).toEqual([
      { v: "Thursday", f: "date", e: 0 },
      " ",
      { v: "tacos", f: "dish", e: 0 },
      ", ",
      { v: "Friday", f: "date", e: 1 },
      " ",
      { v: "tacos", f: "dish", e: 1 },
    ]);
  });

  test("gives up when nothing in the reading is in the sentence", () => {
    expect(sampleFromReading("Nothing here", [{ values: [{ field: "f2", quote: "5 km" }] }], runs.collection)).toBeUndefined();
  });
});

describe("onboardingView", () => {
  test("walks a new empty account through onboarding", () => expect(onboardingView(undefined, false, true)).toBe("flow"));
  test("keeps the flow open while it seeds notes", () => expect(onboardingView(undefined, true, false)).toBe("flow"));
  test("does not force an account that skipped back into onboarding", () => expect(onboardingView("skipped", false, true)).toBe("start"));
  test("shows the normal home once there are notes", () => {
    expect(onboardingView(undefined, false, false)).toBe("home");
    expect(onboardingView("done", false, false)).toBe("home");
    expect(onboardingView("skipped", false, false)).toBe("home");
  });
  test("offers the way back into onboarding when a finished account is empty again", () => expect(onboardingView("done", false, true)).toBe("start"));
});
