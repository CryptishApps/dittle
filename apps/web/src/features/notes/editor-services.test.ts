import { beforeEach, describe, expect, mock, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import { createValueStore, type TrackedValue } from "@/features/editor/values";
import type { CellPlacement } from "./store";
import type { Collection } from "./fact";

type Answer = { collection: number | null; field: number | null; row: { row: number } | { label: string } | null; sure: boolean };
type Asked = { text: string; actions: { label: string; run?: () => void }[] };

const answers: Answer[] = [];
const placed: CellPlacement[] = [];
const created: string[] = [];
const asked: Asked[] = [];
const shown: string[] = [];

mock.module("@/features/ai/place", () => ({
  placeValue: async () => ({ ...(answers.shift() ?? { collection: null, field: null, row: null, sure: false }), where: "in_cloud", ms: 1 }),
}));
mock.module("@/features/collections/name-columns", () => ({ tidyColumnNames: async () => undefined }));
mock.module("./toast", () => ({
  askToast: (text: string, actions: Asked["actions"]) => asked.push({ text, actions }),
  showToast: (text: string) => shown.push(text),
}));
mock.module("./api", () => ({
  collectionsQuery: (uid: string) => ({ queryKey: ["collections", uid] }),
  rowsQuery: (uid: string) => ({ queryKey: ["rows", uid] }),
  notesQuery: (uid: string) => ({ queryKey: ["notes", uid] }),
  noteQuery: (uid: string, id: string) => ({ queryKey: ["note", uid, id] }),
  writes: {
    placeCell: async (_uid: string, placement: CellPlacement) => {
      placed.push(placement);
      return () => undefined;
    },
    createCollection: (_uid: string, collection: Collection) => created.push(collection.name),
    relabelNotes: () => undefined,
    ignoreRequest: () => undefined,
  },
}));

const { createEditorServices } = await import("./editor-services");

const things: Collection = {
  id: "c1",
  name: "Things to do",
  rowLabel: "thing",
  fields: [
    { id: "price", name: "Price", kind: "money" },
    { id: "date", name: "Date", kind: "date" },
  ],
  key: { by: "name" },
  createdAt: 0,
};

const price: TrackedValue = { id: "v1", text: "€40", kind: "money", name: "cruise_price", subject: { label: "Sunset cruise" }, naming: false };
const day: TrackedValue = { id: "v2", text: "Sun 13 December", kind: "date", name: "cruise_date", subject: { label: "Sunset cruise" }, when: { on: "2026-12-13", grain: "day" }, naming: false };

const sure = (field: number, label = "Sunset cruise"): Answer => ({ collection: 0, field, row: { label }, sure: true });

const runs: Collection = {
  id: "c2",
  name: "Runs",
  rowLabel: "run",
  fields: [
    { id: "date", name: "Date", kind: "date" },
    { id: "distance", name: "Distance", kind: "number" },
    { id: "time", name: "Time", kind: "duration" },
  ],
  key: { by: "when", grain: "day" },
  createdAt: 0,
};

const today = { on: "2026-11-18", grain: "day" as const };
const loggedRow = { id: "c2.2026-11-18", collectionId: "c2", label: "2026-11-18", period: "2026-11-18", createdAt: 0 };
const logged: TrackedValue[] = [
  { id: "r1", text: "5 km", kind: "number", amount: 5, field: "distance", subject: { label: "run", entityId: loggedRow.id }, event: true, when: today, naming: false },
  { id: "r2", text: "27:40", kind: "duration", seconds: 1660, field: "time", subject: { label: "run", entityId: loggedRow.id }, event: true, when: today, naming: false },
];
const walk: TrackedValue[] = [
  { id: "w1", text: "4k", kind: "number", amount: 4, subject: { label: "walk" }, event: true, when: today, naming: false },
  { id: "w2", text: "50 mins", kind: "duration", seconds: 3000, subject: { label: "walk" }, event: true, when: today, naming: false },
];

function services(collection: Collection = things, known?: TrackedValue[], rows?: { id: string; collectionId: string; label: string; period?: string; createdAt: number }[]) {
  const queryClient = new QueryClient();
  queryClient.setQueryData(["collections", "u1"], [collection]);
  queryClient.setQueryData(["rows", "u1"], rows ?? (collection === runs ? [loggedRow] : []));
  queryClient.setQueryData(["notes", "u1"], []);
  const store = createValueStore(collection === runs ? [...(known ?? logged), ...walk] : (known ?? [price, day]));
  return createEditorServices({ queryClient, uid: "u1", noteId: "n1", store, valuesInNote: () => [] });
}

const settle = async () => {
  for (let round = 0; round < 20; round += 1) await new Promise((resolve) => setTimeout(resolve, 0));
};

beforeEach(() => {
  answers.length = 0;
  placed.length = 0;
  created.length = 0;
  asked.length = 0;
  shown.length = 0;
});

describe("filing a sentence's values into a collection", () => {
  test("a price and then its date land in one row", async () => {
    answers.push(sure(0), sure(1, "Sunset cruise on the Tagus"));
    const filing = services();
    filing.onNewFact?.(price);
    filing.onNewFact?.(day);
    await settle();
    expect(placed.map((cell) => cell.fieldId)).toEqual(["price", "date"]);
    expect(placed[1]!.row.id).toBe(placed[0]!.row.id);
    expect(placed.map((cell) => cell.newRow)).toEqual([true, false]);
  });

  test("a date waits for its price and then joins the price's row", async () => {
    answers.push(sure(1), sure(0));
    const filing = services();
    filing.onNewFact?.(day);
    filing.onNewFact?.(price);
    await settle();
    expect(placed.map((cell) => cell.fieldId)).toEqual(["price", "date"]);
    expect(placed[1]!.row.id).toBe(placed[0]!.row.id);
  });

  test("when the model is unsure, it asks and files nothing until Add", async () => {
    answers.push({ ...sure(0), sure: false }, sure(1));
    const filing = services();
    filing.onNewFact?.(price);
    filing.onNewFact?.(day);
    await settle();
    expect(placed).toEqual([]);
    expect(asked.at(-1)?.text).toBe("Add €40 and Sun 13 December to Things to do?");
    asked.at(-1)!.actions.find((action) => action.label === "Add")!.run!();
    await settle();
    expect(placed.map((cell) => cell.fieldId)).toEqual(["price", "date"]);
    expect(placed[1]!.row.id).toBe(placed[0]!.row.id);
  });

  test("asking to file a paragraph asks about an existing list instead of starting another", async () => {
    answers.push({ ...sure(0), sure: false });
    const filing = services();
    expect(await filing.fileValues?.([price], "Things to do", "Sunset cruise on the Tagus, €40 each.")).toBe(false);
    expect(created).toEqual([]);
    expect(asked.at(-1)?.text).toBe("Add €40 to Things to do?");
  });

  test("a paragraph for a day that already has an entry asks once and adds every value to one new row", async () => {
    answers.push({ collection: 0, field: 1, row: null, sure: true }, { collection: 0, field: 2, row: null, sure: true });
    const filing = services(runs);
    expect(await filing.fileValues?.(walk, "Runs", "Walked 4k with the dog in 50 mins. Add this to my runs.")).toBe(false);
    expect(placed).toEqual([]);
    expect(asked).toHaveLength(1);
    expect(asked[0]!.text).toStartWith("Runs already has 5 km and 27:40 on ");
    asked[0]!.actions.find((action) => action.label === "Add another")!.run!();
    await settle();
    expect(placed.map((cell) => cell.fieldId)).toEqual(["distance", "time"]);
    expect(placed[1]!.row.id).toBe(placed[0]!.row.id);
    expect(placed[0]!.row.id).not.toBe(loggedRow.id);
    expect(placed.map((cell) => cell.newRow)).toEqual([true, false]);
  });

  test("a paragraph for a day whose row has some of its columns filled still lands in one new row", async () => {
    answers.push({ collection: 0, field: 1, row: null, sure: true }, { collection: 0, field: 2, row: null, sure: true });
    const filing = services(runs, [logged[1]!]);
    expect(await filing.fileValues?.(walk, "Runs", "Walked 4k with the dog in 50 mins. Add this to my runs.")).toBe(false);
    expect(placed).toEqual([]);
    expect(asked[0]!.text).toStartWith("Runs already has 27:40 on ");
    asked[0]!.actions.find((action) => action.label === "Add another")!.run!();
    await settle();
    expect(placed.map((cell) => cell.fieldId)).toEqual(["distance", "time"]);
    expect(placed[1]!.row.id).toBe(placed[0]!.row.id);
    expect(placed[0]!.row.id).not.toBe(loggedRow.id);
  });

  test("a paragraph for a day with an empty row fills that row", async () => {
    answers.push({ collection: 0, field: 1, row: null, sure: true }, { collection: 0, field: 2, row: null, sure: true });
    const filing = services(runs, []);
    expect(await filing.fileValues?.(walk, "Runs", "Walked 4k with the dog in 50 mins. Add this to my runs.")).toBe(true);
    expect(asked).toEqual([]);
    expect(placed.map((cell) => cell.fieldId)).toEqual(["distance", "time"]);
    expect(placed[1]!.row.id).toBe(placed[0]!.row.id);
  });

  test("a paragraph whose list row already has that column asks, and files nothing until Use", async () => {
    const palace = { id: "c1.palace", collectionId: "c1", label: "Pena Palace", createdAt: 0 };
    const old: TrackedValue = { id: "old", text: "€30", kind: "money", field: "price", subject: { label: "Pena Palace", entityId: palace.id }, naming: false };
    const newer: TrackedValue = { ...price, id: "new", text: "€32", subject: { label: "Pena Palace" } };
    answers.push({ collection: 0, field: 0, row: { row: 0 }, sure: true });
    const filing = services(things, [old, newer], [palace]);
    expect(await filing.fileValues?.([newer], "Things to do", "Pena Palace is €32 each.")).toBe(false);
    expect(placed).toEqual([]);
    expect(asked[0]!.text).toBe("Things to do already has €30 for Pena Palace");
    asked[0]!.actions.find((action) => action.label === "Use €32")!.run!();
    await settle();
    expect(placed).toHaveLength(1);
    expect(placed[0]!.replaces).toBe("old");
  });

  test("a paragraph about two things puts each in its own row", async () => {
    const palace: TrackedValue = { ...price, id: "p1", text: "€14", subject: { label: "Pena Palace" } };
    const castle: TrackedValue = { ...price, id: "p2", text: "€8", subject: { label: "Moorish Castle" } };
    answers.push(sure(0, "Pena Palace"), sure(0, "Moorish Castle"));
    const filing = services(things, [palace, castle]);
    expect(await filing.fileValues?.([palace, castle], "Things to do", "Pena Palace €14, Moorish Castle €8. Add these to things to do.")).toBe(true);
    expect(placed.map((cell) => cell.row.label)).toEqual(["Pena Palace", "Moorish Castle"]);
    expect(placed[0]!.row.id).not.toBe(placed[1]!.row.id);
  });

  test("a paragraph about two days puts each run in its own day's row", async () => {
    const monday: TrackedValue = { ...walk[0]!, id: "m1", text: "5k", amount: 5, when: { on: "2026-11-16", grain: "day" } };
    const tuesday: TrackedValue = { ...walk[0]!, id: "t1", text: "7k", amount: 7, when: { on: "2026-11-17", grain: "day" } };
    answers.push({ collection: 0, field: 1, row: null, sure: true }, { collection: 0, field: 1, row: null, sure: true });
    const filing = services(runs, [monday, tuesday], []);
    expect(await filing.fileValues?.([monday, tuesday], "Runs", "Ran 5k on Monday and 7k on Tuesday. Add these to my runs.")).toBe(true);
    expect(placed.map((cell) => cell.row.period)).toEqual(["2026-11-16", "2026-11-17"]);
  });

  test("two distances for the same day go in two rows", async () => {
    const first: TrackedValue = { ...walk[0]!, id: "a1", text: "5k" };
    const second: TrackedValue = { ...walk[0]!, id: "a2", text: "3k" };
    answers.push({ collection: 0, field: 1, row: null, sure: true }, { collection: 0, field: 1, row: null, sure: true });
    const filing = services(runs, [first, second], []);
    expect(await filing.fileValues?.([first, second], "Runs", "Ran 5k this morning and 3k tonight. Add these to my runs.")).toBe(true);
    expect(placed).toHaveLength(2);
    expect(placed[0]!.row.id).not.toBe(placed[1]!.row.id);
    expect(placed.map((cell) => cell.row.period)).toEqual(["2026-11-18", "2026-11-18"]);
  });

  test("asking to file a paragraph with no list that fits starts one", async () => {
    answers.push({ collection: null, field: null, row: null, sure: false });
    const filing = services();
    await filing.fileValues?.([price], "Cruises", "Sunset cruise on the Tagus, €40 each.");
    expect(created).toEqual(["Cruises"]);
  });
});
