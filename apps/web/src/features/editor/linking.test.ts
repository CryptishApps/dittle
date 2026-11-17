import { describe, expect, mock, test } from "bun:test";
import type { TrackedValue } from "./values";

mock.module("@/features/ai/link", () => ({
  linkValues: async () => ({ decisions: [{ match: 0, changed: true }], where: "in_cloud", ms: 1 }),
}));

const { findLinks } = await import("./linking");

const price: TrackedValue = { id: "price", text: "£42", kind: "money", naming: false };
const link = (text: string) => findLinks({ sentence: `We can now do ${text} a head.`, probes: [{ text, kind: "money" }], values: [price], noteTitle: () => undefined });

describe("findLinks", () => {
  test("a link is a change only when the text differs", async () => {
    expect(await link("£42")).toEqual([{ factId: "price", changed: false }]);
    expect(await link("£45")).toEqual([{ factId: "price", changed: true }]);
  });
});
