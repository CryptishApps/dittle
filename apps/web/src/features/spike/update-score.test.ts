import { describe, expect, test } from "bun:test";
import type { ProposedUpdate } from "@/features/ai/update-answer";
import { UPDATE_CASES } from "./update-samples";
import { scoreUpdate } from "./update-score";

const got = (tracked: number, extra: Partial<ProposedUpdate> = {}): ProposedUpdate => ({ tracked, text: "", quote: "", source: "text", quantity: {}, ...extra });
const sample = (id: string) => UPDATE_CASES.find((item) => item.id === id)!;

describe("scoreUpdate", () => {
  test("needs every expected change and nothing else", () => {
    expect(scoreUpdate(sample("U1"), { updates: [got(1, { quantity: { amount: 42 } }), got(2, { when: { on: "2026-05-30", grain: "day" } })] }).ok).toBe(true);
    expect(scoreUpdate(sample("U1"), { updates: [got(1, { quantity: { amount: 42 } })] }).missed).toEqual([{ value: 2, when: "2026-05-30" }]);
    expect(scoreUpdate(sample("U2"), { updates: [got(0, { quantity: { amount: 12 } })] }).ok).toBe(false);
  });

  test("a blocked currency change is safe, and counts as shown", () => {
    const score = scoreUpdate(sample("U5"), { updates: [got(10, { blocked: { currency: "EUR" } })] });
    expect(score).toMatchObject({ ok: true, blockedShown: true });
  });
});
