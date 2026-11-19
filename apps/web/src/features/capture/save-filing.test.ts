import { beforeEach, describe, expect, mock, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import type { DraftValue, NoteDraft } from "@/features/ai/capture-answer";
import type { PlaceAnswer } from "@/features/ai/place-answer";
import { createValueStore } from "@/features/editor/values";
import type { Collection } from "@/features/notes/fact";
import type { CellPlacement } from "@/features/notes/store";

const placed: CellPlacement[] = [];
const unplaced: string[] = [];
const deleted: string[] = [];
const asked: string[] = [];
const formulaChecks: string[] = [];
let answer = { collection: 0, field: 2, row: null, sure: true };
let byKind: Record<string, PlaceAnswer> = {};
let modelCalls = 0;

mock.module("@/features/ai/place", () => ({
  placeValue: async (input: { item: { kind?: string } }) => {
    modelCalls += 1;
    const kind = input.item.kind ?? "";
    return { ...(byKind[kind] ?? (kind === "duration" ? answer : { collection: null, field: null, row: null, sure: false })), where: "in_cloud", ms: 1 };
  },
}));
mock.module("@/features/ai/formula", () => ({
  suggestFormula: async ({ value }: { value: { text: string } }) => {
    formulaChecks.push(value.text);
    return "";
  },
}));
mock.module("@/features/notes/toast", () => ({
  askToast: (text: string) => asked.push(text),
  showToast: () => undefined,
}));
mock.module("@/features/notes/api", () => ({
  collectionsQuery: (uid: string) => ({ queryKey: ["collections", uid] }),
  rowsQuery: (uid: string) => ({ queryKey: ["rows", uid] }),
  notesQuery: (uid: string) => ({ queryKey: ["notes", uid] }),
  noteQuery: (uid: string, id: string) => ({ queryKey: ["note", uid, id] }),
  cachedThenLive: async () => undefined,
  startNote: () => "n1",
  writes: {
    placeCell: async (_uid: string, placement: CellPlacement) => {
      placed.push(placement);
      return () => unplaced.push(placement.valueId);
    },
    saveNote: () => undefined,
    deleteNote: async (_uid: string, noteId: string) => deleted.push(noteId),
    createCollection: () => undefined,
    deleteCollection: () => undefined,
    relabelNotes: () => undefined,
    renameFields: () => undefined,
    ignoreRequest: () => undefined,
  },
}));

const { previewFiling, saveDraft } = await import("./apply");
const { shelfOf } = await import("@/features/onboarding/practice");

const runs: Collection = {
  id: "runs",
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

const raceDay = { on: "2026-11-15", grain: "day" as const };
const chip: DraftValue = { quote: "52:41", kind: "duration", name: "chip_time", about: "race", event: true, when: raceDay, seconds: 3161, formula: "", field: null };
const bib: DraftValue = { quote: "1482", kind: "number", name: "bib_number", about: "race", event: false, amount: 1482, before: "", after: "", formula: "", field: null };
const race: NoteDraft = { title: "Richmond Park 10K", paragraphs: [{ text: "Bib 1482, chip time 52:41.", values: [bib, chip] }] };

const settle = async () => {
  for (let round = 0; round < 20; round += 1) await new Promise((resolve) => setTimeout(resolve, 0));
};

function context() {
  const queryClient = new QueryClient();
  queryClient.setQueryData(["collections", "u1"], [runs]);
  queryClient.setQueryData(["rows", "u1"], []);
  queryClient.setQueryData(["notes", "u1"], []);
  return { queryClient, uid: "u1", store: createValueStore() };
}

beforeEach(() => {
  for (const list of [placed, unplaced, deleted, asked, formulaChecks]) list.length = 0;
  answer = { collection: 0, field: 2, row: null, sure: true };
  byKind = {};
  modelCalls = 0;
});

describe("saving a pasted note files its values like a typed note", () => {
  test("a race result's chip time lands in the Runs row for its day", async () => {
    const { store, ...rest } = context();
    saveDraft({ ...rest, store }, race, { file: true });
    await settle();
    const time = store.list().find((value) => value.text === "52:41")!;
    expect(placed).toEqual([{ row: { id: "runs.2026-11-15", collectionId: "runs", label: "2026-11-15", period: "2026-11-15" }, newRow: true, valueId: time.id, fieldId: "time", replaces: undefined }]);
    expect(formulaChecks).toEqual([]);
  });

  test("saving files what the preview showed, without asking the model again", async () => {
    answer = { collection: 0, field: 2, row: null, sure: false };
    const { store, ...rest } = context();
    const previewed = { wheres: new Map(), answers: new Map([[1, { collection: 0, field: 2, row: null, sure: true }]]), shape: JSON.stringify([["runs"]]) };
    saveDraft({ ...rest, store }, race, { file: true, previewed });
    await settle();
    expect(placed.map((cell) => cell.fieldId)).toEqual(["time"]);
    expect(asked).toEqual([]);
  });

  test("a second time for the same row and column asks on save, as the preview said, instead of replacing the first", async () => {
    const gun: DraftValue = { ...chip, quote: "53:10", name: "gun_time", seconds: 3190 };
    const both: NoteDraft = { title: "Richmond Park 10K", paragraphs: [{ text: "Chip time 52:41, gun time 53:10.", values: [chip, gun] }] };
    const previewed = await previewFiling(shelfOf([runs], []), both, new Date(2026, 10, 18));
    expect([...previewed.answers.values()].map((item) => item.sure)).toEqual([true, false]);
    const { store, ...rest } = context();
    saveDraft({ ...rest, store }, both, { file: true, previewed });
    await settle();
    expect(placed.map((cell) => store.get(cell.valueId)?.text)).toEqual(["52:41"]);
    expect(asked.length).toBe(1);
  });

  test("two values the preview put in one new named row are saved into that one row", async () => {
    const trips: Collection = {
      id: "trips",
      name: "Trips",
      rowLabel: "trip",
      fields: [
        { id: "cost", name: "Cost", kind: "money" },
        { id: "nights", name: "Nights", kind: "count" },
      ],
      key: { by: "name" },
      createdAt: 0,
    };
    const porto = { id: "trips.porto", collectionId: "trips", label: "Porto", createdAt: 1 };
    byKind = {
      money: { collection: 0, field: 0, row: { label: "Lisbon" }, sure: true },
      count: { collection: 0, field: 1, row: { label: "Lisbon" }, sure: true },
    };
    const cost: DraftValue = { quote: "£640", kind: "money", name: "cost", about: "Lisbon", event: false, amount: 640, before: "£", after: "", formula: "", field: null };
    const nights: DraftValue = { quote: "4", kind: "count", name: "nights", about: "Lisbon", event: false, amount: 4, before: "", after: " nights", formula: "", field: null };
    const lisbon: NoteDraft = { title: "Lisbon", paragraphs: [{ text: "£640 for 4 nights.", values: [cost, nights] }] };
    const previewed = await previewFiling(shelfOf([trips], [porto]), lisbon, new Date(2026, 10, 18));
    modelCalls = 0;
    const { queryClient, store } = context();
    queryClient.setQueryData(["collections", "u1"], [trips]);
    queryClient.setQueryData(["rows", "u1"], [porto]);
    saveDraft({ queryClient, uid: "u1", store }, lisbon, { file: true, previewed });
    await settle();
    expect(modelCalls).toBe(0);
    expect(placed.map((cell) => [cell.fieldId, cell.row.label, cell.newRow])).toEqual([
      ["cost", "Lisbon", true],
      ["nights", "Lisbon", false],
    ]);
    expect(new Set(placed.map((cell) => cell.row.id)).size).toBe(1);
  });

  test("a preview made before the collections changed is not reused", async () => {
    answer = { collection: 0, field: 2, row: null, sure: false };
    const previewed = { wheres: new Map(), answers: new Map([[1, { collection: 0, field: 2, row: null, sure: true }]]), shape: JSON.stringify([["other"]]) };
    saveDraft(context(), race, { file: true, previewed });
    await settle();
    expect(placed).toEqual([]);
    expect(asked).toEqual(["Add 52:41 to Runs?"]);
  });

  test("when the model is unsure it asks instead of filing", async () => {
    answer = { collection: 0, field: 2, row: null, sure: false };
    saveDraft(context(), race, { file: true });
    await settle();
    expect(placed).toEqual([]);
    expect(asked).toEqual(["Add 52:41 to Runs?"]);
  });

  test("undo removes the note, its values and the cells it filed", async () => {
    const { store, ...rest } = context();
    const saved = saveDraft({ ...rest, store }, race, { file: true });
    await settle();
    saved.undo();
    expect(unplaced).toEqual([placed[0]!.valueId]);
    expect(deleted).toEqual(["n1"]);
    expect(store.list()).toEqual([]);
  });

  test("a cell filed after undo is taken straight back out", async () => {
    const { store, ...rest } = context();
    const saved = saveDraft({ ...rest, store }, race, { file: true });
    saved.undo();
    await settle();
    expect(placed).toHaveLength(1);
    expect(unplaced).toEqual(placed.map((cell) => cell.valueId));
  });

  test("without filing, nothing is placed", async () => {
    saveDraft(context(), race);
    await settle();
    expect(placed).toEqual([]);
  });
});
