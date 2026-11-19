import { describe, expect, test } from "bun:test";
import type { DraftValue, NoteDraft } from "@/features/ai/capture-answer";
import { formulasFor } from "./draft";
import { filingCandidates, keepLines, liveValues, nextQuantity, spotsFor, tryItOf, tryValues, valuesOf, withSpotted, withTried } from "./keeps";

const today = new Date(2026, 10, 18);

const base = { about: "", event: false, formula: "", field: null } as const;
const money = (quote: string, amount: number, name: string, formula = ""): DraftValue => ({ ...base, quote, kind: "money", name, amount, before: "£", after: "", unit: "GBP", formula });
const count = (quote: string, amount: number, name: string): DraftValue => ({ ...base, quote, kind: "count", name, amount, before: "", after: "" });
const percent = (quote: string, amount: number, name: string): DraftValue => ({ ...base, quote, kind: "percent", name, amount, before: "", after: "%" });
const date = (quote: string, on: string, name: string, grain: "day" | "time" = "day"): DraftValue => ({ ...base, quote, kind: "date", name, event: true, when: { on, grain } });
const stay = (quote: string, seconds: number, name: string): DraftValue => ({ ...base, quote, kind: "duration", name, seconds });

const groupChat: NoteDraft = {
  title: "St Ives cottage trip",
  paragraphs: [
    { text: "3 of us are going. Leo can't make it.", values: [count("3", 3, "people")] },
    {
      text: "The cottage in St Ives is booked at £920 for 3 nights, so £306.67 each.",
      values: [money("£920", 920, "cottage_price"), stay("3 nights", 259_200, "cottage_stay"), money("£306.67", 306.67, "cottage_share", "v2 / v1")],
    },
    {
      text: "Trains leave Paddington at 8:06 on Fri 4 December and cost £84 return each.",
      values: [date("8:06", "2026-12-04T08:06", "departure_time", "time"), date("Fri 4 December", "2026-12-04", "departure_date"), money("£84", 84, "train_price")],
    },
    { text: "Surf lessons on Saturday morning cost £45 each.", values: [date("Saturday", "2026-12-05", "surf_day"), money("£45", 45, "surf_price")] },
  ],
};

const receipt: NoteDraft = {
  title: "The Green Fork dinner",
  paragraphs: [
    { text: "We dined at The Green Fork on 18/11/2026 at Table 7.", values: [date("18/11/2026", "2026-11-18", "dinner_date"), { ...count("7", 7, "table_number"), kind: "number" }] },
    { text: "The subtotal was £49.00. Service of 12.5% added £6.13, making a total of £55.13.", values: [money("£49.00", 49, "subtotal"), percent("12.5%", 12.5, "service_rate"), money("£6.13", 6.13, "service"), money("£55.13", 55.13, "total")] },
    { text: "Split 3 ways comes to £18.38 each.", values: [count("3", 3, "split_ways"), money("£18.38", 18.38, "share_each", "v3 / v4")] },
  ],
};

describe("what Dittle keeps up to date", () => {
  test("a share worked out from the group size and the dates that count down become lines, with figures from code", () => {
    expect(keepLines(groupChat, new Map(), today)).toEqual([
      { kind: "worked", index: 3, sign: "÷", label: "Cottage share", how: "£920 ÷ 3. Follows cottage price and people.", figure: "£306.67" },
      { kind: "countdown", index: 5, sign: "◷", label: "Departure date", how: "Counts down on Home.", figure: "16 days" },
      { kind: "countdown", index: 7, sign: "◷", label: "Surf day", how: "Counts down on Home.", figure: "17 days" },
    ]);
  });

  test("a formula that does not reproduce its number gives no line, and only future dates count down", () => {
    expect(keepLines(receipt, new Map(), new Date(2026, 10, 17)).map((line) => line.label)).toEqual(["Dinner date"]);
    expect(keepLines(receipt, new Map(), today)).toEqual([]);
    expect(keepLines(receipt, new Map(), new Date(2026, 10, 19))).toEqual([]);
  });

  test("only values that feed, are worked out, or count down stay highlighted", () => {
    const lines = keepLines(groupChat, new Map(), today);
    const live = liveValues(groupChat, lines, tryItOf(groupChat));
    expect([...live].sort((a, b) => a - b).map((index) => valuesOf(groupChat)[index]!.quote)).toEqual(["3", "£920", "£306.67", "Fri 4 December", "Saturday"]);
  });
});

describe("trying a change before saving", () => {
  test("the group size is the value to try, one more person, and the share follows", () => {
    const tryIt = tryItOf(groupChat)!;
    expect(tryIt).toEqual({ index: 0, to: 4, fromText: "3", toText: "4", followers: 1 });
    const tried = tryValues(groupChat, tryIt);
    expect(tried.get(3)?.text).toBe("£230");
    expect(keepLines(groupChat, tried, today)[0]).toMatchObject({ how: "£920 ÷ 4. Follows cottage price and people.", figure: "£230" });
  });

  test("saving after trying keeps the tried values in the text, and they still add up", () => {
    const saved = withTried(groupChat, tryValues(groupChat, tryItOf(groupChat)!))!;
    expect(saved.paragraphs[0]!.text).toBe("4 of us are going. Leo can't make it.");
    expect(saved.paragraphs[1]!.text).toBe("The cottage in St Ives is booked at £920 for 3 nights, so £230 each.");
    expect(valuesOf(saved)[3]).toMatchObject({ quote: "£230", amount: 230 });
    expect(formulasFor(valuesOf(saved)).get(3)).toEqual({ expr: "$2 / $1", inputs: ["0", "1"] });
  });

  test("a tried value that would land on another spot in the sentence is not offered", () => {
    const clash: NoteDraft = {
      title: "",
      paragraphs: [{ text: "Tickets are £4 each and 3 of us go, so £12.", values: [money("£4", 4, "ticket"), count("3", 3, "people"), money("£12", 12, "total", "v1 * v2")] }],
    };
    const tried = tryValues(clash, { index: 1, to: 4, fromText: "3", toText: "4", followers: 1 });
    expect(withTried(clash, tried)).toBeNull();
  });

  test("nothing to try when nothing is worked out", () => {
    expect(tryItOf(receipt)).toBeUndefined();
  });

  test("the next value to try comes from the value itself", () => {
    expect(nextQuantity({ kind: "count", amount: 3 })).toBe(4);
    expect(nextQuantity({ kind: "percent", amount: 12.5 })).toBe(17.5);
    expect(nextQuantity({ kind: "money", amount: 920 })).toBe(1000);
    expect(nextQuantity({ kind: "money", amount: 84 })).toBe(92);
    expect(nextQuantity({ kind: "duration", seconds: 259_200 })).toBe(345_600);
    expect(nextQuantity({ kind: "duration", seconds: 3161 })).toBe(3101);
    expect(nextQuantity({ kind: "date" })).toBeUndefined();
  });
});

describe("asking for formulas the tidy step missed", () => {
  test("values whose numbers follow from others, or that claimed a formula that failed, are checked, claims first and then later values first", () => {
    const spots = spotsFor(receipt);
    expect(spots.map((spot) => valuesOf(receipt)[spot.index]!.quote)).toEqual(["£18.38", "£55.13", "£6.13", "£49.00"]);
    expect(spots[1]!.inputs.slice(0, 2)).toEqual([2, 4]);
    expect(spots[2]!.inputs.slice(0, 2)).toEqual([2, 3]);
  });

  test("a verified formula from the check joins the draft and gives a line and a value to try", () => {
    const fixed = withSpotted(receipt, 7, { expr: "$1 / $2", inputs: ["5", "6"] });
    expect(valuesOf(fixed)[7]!.formula).toBe("v6 / v7");
    expect(keepLines(fixed, new Map(), today)[0]).toMatchObject({ label: "Share each", how: "£55.13 ÷ 3. Follows total and split ways.", sign: "÷" });
    expect(tryItOf(fixed)).toMatchObject({ index: 6, toText: "4" });
  });

  test("a formula that does not add up or would loop back on itself is left out", () => {
    expect(withSpotted(receipt, 7, { expr: "$1 / $2", inputs: ["2", "6"] })).toBe(receipt);
    const total = withSpotted(receipt, 5, { expr: "$1 + $2", inputs: ["2", "4"] });
    expect(withSpotted(total, 2, { expr: "$1 - $2", inputs: ["5", "4"] })).toBe(total);
  });
});

describe("where values would be filed", () => {
  const race: NoteDraft = {
    title: "Richmond Park 10K",
    paragraphs: [
      { text: "The race was on Sunday 15 November 2026. My bib was 1482.", values: [date("Sunday 15 November 2026", "2026-11-15", "race_date"), { ...count("1482", 1482, "bib"), kind: "number" }] },
      { text: "Chip time 52:41, gun time 53:10.", values: [stay("52:41", 3161, "chip_time"), stay("53:10", 3190, "gun_time")] },
    ],
  };

  test("values that would be filed sum up by destination, a second value for a field already taken asks, and values that stay in the note or only name the day give nothing", () => {
    const wheres = new Map([
      [0, { at: "collection", collection: "Runs", row: "Sun 15 Nov", day: true, sure: true } as const],
      [1, { at: "note" } as const],
      [2, { at: "collection", collection: "Runs", field: "Time", row: "Sun 15 Nov", sure: true } as const],
      [3, { at: "collection", collection: "Runs", field: "Time", row: "Sun 15 Nov", sure: true } as const],
    ]);
    const lines = keepLines(race, new Map(), today, wheres);
    expect(lines).toEqual([
      { kind: "filed", index: 2, also: [2], sign: "→", label: "Runs · Sun 15 Nov", how: "Time goes in when you save.", figure: "52:41" },
      { kind: "filed", index: 3, also: [3], sign: "→", label: "Runs", how: "Asks before adding it.", figure: "53:10" },
    ]);
    expect([...liveValues(race, lines)].sort()).toEqual([2, 3]);
  });

  test("a value with no column that fits gives no line, so a bib number never shows as something to ask about", () => {
    const wheres = new Map([[1, { at: "collection", collection: "Runs", sure: false } as const]]);
    expect(keepLines(race, new Map(), today, wheres)).toEqual([]);
  });

  test("try-it is offered only for a count, never for a measurement like a race distance", () => {
    const tenK: NoteDraft = {
      title: "10K",
      paragraphs: [
        {
          text: "Ran 10 km in 52:41, a pace of 5:16/km.",
          values: [
            { ...count("10", 10, "distance"), kind: "number", after: " km" },
            stay("52:41", 3161, "chip_time"),
            { ...stay("5:16/km", 316, "pace"), formula: "v2 / v1", field: null },
          ],
        },
      ],
    };
    expect(tryItOf(tenK)).toBeUndefined();
  });

  test("two unsure values get a line each, never joined into one figure", () => {
    const wheres = new Map([
      [2, { at: "collection", collection: "Runs", field: "Time", row: "Sun 15 Nov", sure: false } as const],
      [3, { at: "collection", collection: "Runs", field: "Time", row: "Sun 15 Nov", sure: false } as const],
    ]);
    expect(keepLines(race, new Map(), today, wheres).map((line) => line.figure)).toEqual(["52:41", "53:10"]);
  });

  test("a date today does not count down", () => {
    const receipt: NoteDraft = { title: "Lunch", paragraphs: [{ text: "Paid today.", values: [date("today", "2026-11-18", "paid_on")] }] };
    expect(keepLines(receipt, new Map(), new Date(2026, 10, 18))).toEqual([]);
  });

  test("an unsure destination says it will ask", () => {
    const wheres = new Map([[2, { at: "collection", collection: "Runs", field: "Time", row: "Sun 15 Nov", sure: false } as const]]);
    expect(keepLines(race, new Map(), today, wheres)).toEqual([{ kind: "filed", index: 2, also: [2], sign: "→", label: "Runs", how: "Asks before adding it.", figure: "52:41" }]);
  });

  test("numbers are checked before dates and dates before text", () => {
    expect(filingCandidates(race)).toEqual([1, 2, 3, 0]);
    expect(filingCandidates(race, 2)).toEqual([1, 2]);
  });
});
