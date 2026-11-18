import { beforeEach, describe, expect, mock, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import type { DraftValue, NoteDraft } from "@/features/ai/capture-answer";
import { createValueStore } from "@/features/editor/values";
import type { Collection } from "@/features/notes/fact";
import type { CellPlacement } from "@/features/notes/store";

const placed: CellPlacement[] = [];
const unplaced: string[] = [];
const deleted: string[] = [];
const asked: string[] = [];
const formulaChecks: string[] = [];
let answer = { collection: 0, field: 2, row: null, sure: true };

mock.module("@/features/ai/place", () => ({
  placeValue: async (input: { item: { kind?: string } }) => ({ ...(input.item.kind === "duration" ? answer : { collection: null, field: null, row: null, sure: false }), where: "in_cloud", ms: 1 }),
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

const { saveDraft } = await import("./apply");

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
