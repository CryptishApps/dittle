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

function services(collection: Collection = things) {
  const queryClient = new QueryClient();
  queryClient.setQueryData(["collections", "u1"], [collection]);
  queryClient.setQueryData(["rows", "u1"], collection === runs ? [loggedRow] : []);
  queryClient.setQueryData(["notes", "u1"], []);
  const store = createValueStore(collection === runs ? [...logged, ...walk] : [price, day]);
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

  test("asking to file a paragraph with no list that fits starts one", async () => {
    answers.push({ collection: null, field: null, row: null, sure: false });
    const filing = services();
    await filing.fileValues?.([price], "Cruises", "Sunset cruise on the Tagus, €40 each.");
    expect(created).toEqual(["Cruises"]);
  });
});
