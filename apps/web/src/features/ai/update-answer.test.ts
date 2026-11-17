import { describe, expect, test } from "bun:test";
import { readUpdateAnswer, updatePrompt, type UpdateTracked } from "./update-answer";

const shown: UpdateTracked[] = [
  { text: "80", kind: "count", name: "guest_count", about: "wedding", noteTitle: "Catering", amount: 80, before: "", after: "" },
  { text: "£38", kind: "money", name: "price_per_head", about: "Rosa's Kitchen", noteTitle: "Catering", amount: 38, before: "£", after: "", unit: "GBP" },
  { text: "4 June", kind: "date", name: "deposit_due", about: "Rosa's Kitchen", noteTitle: "Catering", when: { on: "2026-06-04", grain: "day" } },
  { text: "6 h", kind: "duration", name: "set_length", about: "band", seconds: 21_600 },
  { text: "Hartley Barn", kind: "place", name: "venue", about: "wedding" },
  { text: "£1,200", kind: "money", name: "venue_hire", amount: 1200, before: "£", after: "", unit: "GBP" },
];

const email = "Hi, we can now do £42 a head, and we'd need the deposit by 30 May. Still 80 guests? Call 0161 496 0123.";

const update = (value: string, text: string, quote: string, extra: Record<string, string> = {}) => ({ value, text, quote, amount: "", unit: "", when: "", duration: "", ...extra });
const answer = (data: Record<string, unknown>) => JSON.stringify({ title: "", updates: [], additions: [], ...data });

describe("readUpdateAnswer", () => {
  test("keeps a grounded money change and writes it the way the tracked value is written", () => {
    const read = readUpdateAnswer(answer({ updates: [update("u2", "£42", "we can now do £42 a head", { amount: "42", unit: "GBP" })] }), shown, "text", email);
    expect(read.updates).toEqual([{ tracked: 1, text: "£42", quote: "we can now do £42 a head", source: "text", quantity: { amount: 42 } }]);
  });

  test("drops an update whose quote is not in the pasted text or does not contain the new value", () => {
    const notQuoted = answer({ updates: [update("u2", "£42", "we can do £42 per head")] });
    const notInQuote = answer({ updates: [update("u2", "£45", "we can now do £42 a head")] });
    expect(readUpdateAnswer(notQuoted, shown, "text", email).updates).toEqual([]);
    expect(readUpdateAnswer(notInQuote, shown, "text", email).updates).toEqual([]);
  });

  test("a date change needs a valid day from the model", () => {
    const good = answer({ updates: [update("u3", "30 May", "we'd need the deposit by 30 May", { when: "2026-05-30" })] });
    const bad = answer({ updates: [update("u3", "30 May", "we'd need the deposit by 30 May", { when: "next Friday" })] });
    expect(readUpdateAnswer(good, shown, "text", email).updates[0]).toMatchObject({ tracked: 2, text: "30 May", when: { on: "2026-05-30", grain: "day" }, quantity: {} });
    expect(readUpdateAnswer(bad, shown, "text", email).updates).toEqual([]);
  });

  test("an unchanged value is confirmed, not proposed", () => {
    const read = readUpdateAnswer(answer({ updates: [update("u1", "80", "Still 80 guests?", { amount: "80" })] }), shown, "text", email);
    expect(read.updates).toEqual([]);
    expect(read.confirmed).toEqual([0]);
  });

  test("money in another currency is blocked rather than converted", () => {
    const message = "We can do it for €45 a head.";
    const read = readUpdateAnswer(answer({ updates: [update("u2", "€45", "We can do it for €45 a head.", { unit: "EUR" })] }), shown, "text", message);
    expect(read.updates).toEqual([{ tracked: 1, text: "€45", quote: "We can do it for €45 a head.", source: "text", quantity: {}, blocked: { currency: "EUR" } }]);
  });

  test("an amount is the model's plain number, written in the tracked value's own format", () => {
    const message = "Now 92 guests confirmed.";
    const read = (amount: string) => readUpdateAnswer(answer({ updates: [update("u1", "92 guests", "Now 92 guests confirmed.", { amount })] }), shown, "text", message).updates;
    expect(read("92")).toEqual([{ tracked: 0, text: "92", quote: "Now 92 guests confirmed.", source: "text", quantity: { amount: 92 } }]);
    expect(read("92 guests")).toEqual([]);
    expect(read("")).toEqual([]);
  });

  test("reads grouped thousands and durations through the existing formats", () => {
    const message = "Hire is now £1,350. The band can play 4 hours.";
    const read = readUpdateAnswer(
      answer({ updates: [update("u6", "£1,350", "Hire is now £1,350.", { amount: "1350", unit: "GBP" }), update("u4", "4 hours", "The band can play 4 hours.", { duration: "PT4H" })] }),
      shown,
      "text",
      message,
    );
    expect(read.updates.map((item) => [item.tracked, item.text, item.quantity])).toEqual([
      [5, "£1,350", { amount: 1350 }],
      [3, "4 h", { seconds: 14_400 }],
    ]);
  });

  test("ignores keys outside the values shown and repeats of the same value", () => {
    const message = "£42 a head, or £44 a head.";
    const read = readUpdateAnswer(
      answer({ updates: [update("u9", "£42", "£42 a head"), update("u2", "£42", "£42 a head", { amount: "42" }), update("u2", "£44", "£44 a head", { amount: "44" }), update("none", "£44", "£44 a head")] }),
      shown,
      "text",
      message,
    );
    expect(read.updates.map((item) => item.text)).toEqual(["£42"]);
  });

  test("new values need a known kind and a grounded quote", () => {
    const read = readUpdateAnswer(
      answer({
        additions: [
          { text: "£120", kind: "money", name: "server_fee", quote: "two servers at £120 each" },
          { text: "£5", kind: "money", name: "parking", quote: "parking is £5" },
          { text: "Rosa", kind: "chef", name: "host", quote: "Rosa" },
        ],
      }),
      shown,
      "text",
      "We need two servers at £120 each. Rosa",
    );
    expect(read.additions).toEqual([{ text: "£120", kind: "money", name: "server_fee", quote: "two servers at £120 each", source: "text" }]);
  });

  test("a file has no text to ground against, so its proposals are marked as read from the file", () => {
    const read = readUpdateAnswer(
      answer({ title: "Quote", transcript: " Catering £42 per head ", updates: [update("u2", "£42", "Catering £42 per head", { amount: "42", unit: "GBP" })] }),
      shown,
      "file",
    );
    expect(read.updates[0]).toMatchObject({ tracked: 1, text: "£42", source: "file", quantity: { amount: 42 } });
    expect(read.transcript).toBe("Catering £42 per head");
  });
});

describe("updatePrompt", () => {
  test("numbers the tracked values and adds the message", () => {
    expect(updatePrompt("Dates: today Mon 2026-03-02.", shown.slice(1, 3), "We can do £42.")).toBe(
      [
        "Dates: today Mon 2026-03-02.",
        "Tracked values:",
        'u1: £38 · money · price_per_head · about Rosa\'s Kitchen · in "Catering"',
        'u2: 4 June · date · deposit_due · about Rosa\'s Kitchen · on 2026-06-04 · in "Catering"',
        "Message:\nWe can do £42.",
      ].join("\n"),
    );
    expect(updatePrompt("Dates: today Mon 2026-03-02.", [])).toContain("Tracked values:\nnone\nMessage: in the attached file.");
  });
});
