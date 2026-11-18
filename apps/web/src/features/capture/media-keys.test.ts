import { describe, expect, test } from "bun:test";
import { formatElapsed, isEditable, isPushToTalk, meterLevel, releaseStops } from "./media-keys";

const body = { tagName: "BODY", isContentEditable: false };

describe("push-to-talk key", () => {
  test("M on the page starts talking", () => {
    expect(isPushToTalk({ key: "m", code: "KeyM", target: body })).toBe(true);
  });

  test("works on keyboard layouts where the M key reports a different character", () => {
    expect(isPushToTalk({ key: ",", code: "KeyM", target: body })).toBe(true);
  });

  test("typing m into a field, textarea or the editor does not start talking", () => {
    expect(isPushToTalk({ key: "m", code: "KeyM", target: { tagName: "INPUT" } })).toBe(false);
    expect(isPushToTalk({ key: "m", code: "KeyM", target: { tagName: "textarea" } })).toBe(false);
    expect(isPushToTalk({ key: "m", code: "KeyM", target: { tagName: "DIV", isContentEditable: true } })).toBe(false);
  });

  test("shortcuts with modifiers and key repeats are ignored", () => {
    expect(isPushToTalk({ key: "m", code: "KeyM", metaKey: true, target: body })).toBe(false);
    expect(isPushToTalk({ key: "m", code: "KeyM", ctrlKey: true, target: body })).toBe(false);
    expect(isPushToTalk({ key: "M", code: "KeyM", shiftKey: true, target: body })).toBe(false);
    expect(isPushToTalk({ key: "m", code: "KeyM", repeat: true, target: body })).toBe(false);
  });

  test("other keys do nothing", () => {
    expect(isPushToTalk({ key: "n", code: "KeyN", target: body })).toBe(false);
  });

  test("no target counts as not editable", () => {
    expect(isEditable(null)).toBe(false);
  });
});

describe("hold or tap", () => {
  test("a quick tap keeps recording until the next press", () => {
    expect(releaseStops(150)).toBe(false);
  });

  test("letting go after holding stops recording", () => {
    expect(releaseStops(900)).toBe(true);
  });
});

describe("elapsed time", () => {
  test("shows minutes and padded seconds", () => {
    expect(formatElapsed(0)).toBe("0:00");
    expect(formatElapsed(7_400)).toBe("0:07");
    expect(formatElapsed(60_000)).toBe("1:00");
  });
});

describe("level meter", () => {
  test("silence stays low, speech fills most of the bar, loud input caps at full", () => {
    expect(meterLevel(0)).toBe(0);
    expect(meterLevel(0.005)).toBeLessThan(0.15);
    expect(meterLevel(0.1)).toBeGreaterThan(0.5);
    expect(meterLevel(2)).toBe(1);
  });
});
