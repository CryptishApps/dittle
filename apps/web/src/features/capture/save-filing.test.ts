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
  placeValue: async (input: { item: { kind?: string; text: string } }) => {
    modelCalls += 1;
    const kind = input.item.kind ?? "";
    return { ...(byKind[input.item.text] ?? byKind[kind] ?? (kind === "duration" ? answer : { collection: null, field: null, row: null, sure: false })), where: "in_cloud", ms: 1 };
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

const { previewFiling, saveDraft, shownFiling } = await import("./apply");
const { keepLines } = await import("./keeps");
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

const today = new Date(2026, 10, 18);
const shown = async (draft: NoteDraft) => {
  const previewed = await previewFiling(shelfOf([runs], []), draft, today);
  return shownFiling(previewed, keepLines(draft, new Map(), today, previewed.wheres));
};

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
    saveDraft({ ...rest, store }, race, await shown(race));
    await settle();
    const time = store.list().find((value) => value.text === "52:41")!;
    expect(placed).toEqual([{ row: { id: "runs.2026-11-15", collectionId: "runs", label: "2026-11-15", period: "2026-11-15" }, newRow: true, valueId: time.id, fieldId: "time", replaces: undefined }]);
    expect(formulaChecks).toEqual([]);
  });

  test("saving files what the preview showed, without asking the model again", async () => {
    answer = { collection: 0, field: 2, row: null, sure: false };
    const { store, ...rest } = context();
    const previewed = { wheres: new Map(), answers: new Map([[1, { collection: 0, field: 2, row: null, sure: true }]]), shape: JSON.stringify([["runs"]]) };
    saveDraft({ ...rest, store }, race, previewed);
    await settle();
    expect(placed.map((cell) => cell.fieldId)).toEqual(["time"]);
    expect(asked).toEqual([]);
  });

  test("a value the preview did not place is not filed on save", async () => {
    byKind = { number: { collection: 0, field: 1, row: null, sure: true } };
    const { store, ...rest } = context();
    const previewed = { wheres: new Map(), answers: new Map([[1, { collection: 0, field: 2, row: null, sure: true }]]), shape: JSON.stringify([["runs"]]) };
    saveDraft({ ...rest, store }, race, previewed);
    await settle();
    expect(modelCalls).toBe(0);
    expect(placed.map((cell) => store.get(cell.valueId)?.text)).toEqual(["52:41"]);
  });

  test("a second time for the same row and column asks on save, as the preview said, instead of replacing the first", async () => {
    const gun: DraftValue = { ...chip, quote: "53:10", name: "gun_time", seconds: 3190 };
    const both: NoteDraft = { title: "Richmond Park 10K", paragraphs: [{ text: "Chip time 52:41, gun time 53:10.", values: [chip, gun] }] };
    const previewed = await previewFiling(shelfOf([runs], []), both, today);
    expect([...previewed.answers.values()].map((item) => item.sure)).toEqual([true, false]);
    const { store, ...rest } = context();
    saveDraft({ ...rest, store }, both, previewed);
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
    const previewed = await previewFiling(shelfOf([trips], [porto]), lisbon, today);
    modelCalls = 0;
    const { queryClient, store } = context();
    queryClient.setQueryData(["collections", "u1"], [trips]);
    queryClient.setQueryData(["rows", "u1"], [porto]);
    saveDraft({ queryClient, uid: "u1", store }, lisbon, previewed);
    await settle();
    expect(modelCalls).toBe(0);
    expect(placed.map((cell) => [cell.fieldId, cell.row.label, cell.newRow])).toEqual([
      ["cost", "Lisbon", true],
      ["nights", "Lisbon", false],
    ]);
    expect(new Set(placed.map((cell) => cell.row.id)).size).toBe(1);
  });

  test("save files only into the places the list showed", async () => {
    const shop = (id: string, name: string): Collection => ({ id, name, rowLabel: name, fields: [{ id: "cost", name: "Cost", kind: "money" }], key: { by: "name" }, createdAt: 0 });
    const shelves = [shop("trips", "Trips"), shop("dinners", "Dinners"), shop("gear", "Gear")];
    const spend = (quote: string, about: string, amount: number): DraftValue => ({ quote, kind: "money", name: "cost", about, event: false, amount, before: "£", after: "", formula: "", field: null });
    const values = [spend("£920", "Lisbon", 920), spend("£45", "Dishoom", 45), spend("£120", "shoes", 120)];
    values.forEach((value, index) => (byKind[value.quote] = { collection: index, field: 0, row: { label: value.about }, sure: true }));
    const spent: NoteDraft = { title: "Spent", paragraphs: [{ text: "Lisbon £920, Dishoom £45, shoes £120.", values }] };
    const previewed = await previewFiling(shelfOf(shelves, []), spent, today);
    const lines = keepLines(spent, new Map(), today, previewed.wheres).filter((line) => line.kind === "filed");
    expect(lines.map((line) => line.label)).toEqual(["Trips · Lisbon", "Dinners · Dishoom"]);
    modelCalls = 0;
    const { queryClient, store } = context();
    queryClient.setQueryData(["collections", "u1"], shelves);
    saveDraft({ queryClient, uid: "u1", store }, spent, shownFiling(previewed, lines));
    await settle();
    expect(modelCalls).toBe(0);
    expect(placed.map((cell) => cell.row.collectionId)).toEqual(["trips", "dinners"]);
  });

  describe("the list says it will ask when save would ask", () => {
    const trips: Collection = { id: "trips", name: "Trips", rowLabel: "trip", fields: [{ id: "cost", name: "Cost", kind: "money" }], key: { by: "name" }, createdAt: 0 };
    const porto = { id: "trips.porto", collectionId: "trips", label: "Porto", createdAt: 1 };
    const cost: DraftValue = { quote: "£640", kind: "money", name: "cost", about: "Porto", event: false, amount: 640, before: "£", after: "", formula: "", field: null };
    const paid: NoteDraft = { title: "Porto", paragraphs: [{ text: "Porto was £640.", values: [cost] }] };
    const heldFields = { kind: "money" as const, amount: 500, before: "£", after: "", field: "cost", subject: { label: "Porto", entityId: "trips.porto" } };
    const held = { id: "old", text: "£500", ...heldFields };

    const check = async (answerRow: PlaceAnswer["row"], values: typeof held[]) => {
      byKind = { money: { collection: 0, field: 0, row: answerRow, sure: true } };
      const previewed = await previewFiling({ ...shelfOf([trips], [porto]), values }, paid, today);
      const lines = keepLines(paid, new Map(), today, previewed.wheres);
      const { queryClient, store } = context();
      queryClient.setQueryData(["collections", "u1"], [trips]);
      queryClient.setQueryData(["rows", "u1"], [porto]);
      for (const value of values) store.add(value.text, heldFields);
      saveDraft({ queryClient, uid: "u1", store }, paid, shownFiling(previewed, lines));
      await settle();
      return lines.map((line) => `${line.label}: ${line.how}`);
    };

    test("a cell that already holds a value", async () => {
      expect(await check({ row: 0 }, [held])).toEqual(["Trips · Porto: Already has £500, so it asks first."]);
      expect(placed).toEqual([]);
      expect(asked).toEqual(["Trips already has £500 for Porto"]);
    });

    test("a day that already has a time", async () => {
      const earlier = { kind: "duration" as const, seconds: 3002, field: "time", subject: { label: "2026-11-15", entityId: "runs.2026-11-15" } };
      const day = { id: "runs.2026-11-15", collectionId: "runs", label: "2026-11-15", period: "2026-11-15", createdAt: 1 };
      const previewed = await previewFiling({ ...shelfOf([runs], [day]), rows: [day], values: [{ id: "old", text: "50:02", ...earlier }] }, race, today);
      const lines = keepLines(race, new Map(), today, previewed.wheres);
      expect(lines.map((line) => `${line.label}: ${line.how}`)).toEqual(["Runs · Sun 15 Nov: Already has 50:02, so it asks first."]);
      const { queryClient, store } = context();
      queryClient.setQueryData(["rows", "u1"], [day]);
      store.add("50:02", earlier);
      saveDraft({ queryClient, uid: "u1", store }, race, shownFiling(previewed, lines));
      await settle();
      expect(placed).toEqual([]);
      expect(asked).toEqual(["Runs already has 50:02 on Sun 15 Nov"]);
    });

    test("a collection picked without a row", async () => {
      expect(await check(null, [])).toEqual(["Trips: Asks before adding it."]);
      expect(placed).toEqual([]);
      expect(asked).toEqual(["Add £640 to Trips?"]);
    });
  });

  test("an unsure value save could not offer anywhere is left off the list", async () => {
    const trips: Collection = { id: "trips", name: "Trips", rowLabel: "trip", fields: [{ id: "where", name: "Destination", kind: "text" }], key: { by: "name" }, createdAt: 0 };
    const lisbon: DraftValue = { quote: "Lisbon", kind: "place", name: "destination", about: "trip", event: false, formula: "", field: null };
    const draft: NoteDraft = { title: "Trip", paragraphs: [{ text: "Off to Lisbon.", values: [lisbon] }] };
    byKind = { place: { collection: 0, field: 0, row: { label: "Lisbon" }, sure: false } };
    const previewed = await previewFiling(shelfOf([trips], []), draft, today);
    const lines = keepLines(draft, new Map(), today, previewed.wheres);
    expect(lines).toEqual([]);
    const { queryClient, store } = context();
    queryClient.setQueryData(["collections", "u1"], [trips]);
    saveDraft({ queryClient, uid: "u1", store }, draft, shownFiling(previewed, lines));
    await settle();
    expect(placed).toEqual([]);
    expect(asked).toEqual([]);
  });

  describe("with two columns of the same kind", () => {
    const trips: Collection = {
      id: "trips",
      name: "Trips",
      rowLabel: "trip",
      fields: [
        { id: "flight", name: "Flight", kind: "money" },
        { id: "hotel", name: "Hotel", kind: "money" },
      ],
      key: { by: "name" },
      createdAt: 0,
    };
    const lisbon = { id: "trips.lisbon", collectionId: "trips", label: "Lisbon", createdAt: 1 };
    const spend = (quote: string, name: string, amount: number): DraftValue => ({ quote, kind: "money", name, about: "Lisbon", event: false, amount, before: "£", after: "", formula: "", field: null });

    const lines = async (draft: NoteDraft) => {
      const previewed = await previewFiling(shelfOf([trips], [lisbon]), draft, today);
      const shown = keepLines(draft, new Map(), today, previewed.wheres);
      const { queryClient, store } = context();
      queryClient.setQueryData(["collections", "u1"], [trips]);
      queryClient.setQueryData(["rows", "u1"], [lisbon]);
      saveDraft({ queryClient, uid: "u1", store }, draft, shownFiling(previewed, shown));
      await settle();
      return shown.map((line) => `${line.label}: ${line.how} ${line.figure}`);
    };

    test("unsure values never name a column the question might not use", async () => {
      byKind = {
        "£200": { collection: 0, field: 0, row: { row: 0 }, sure: false },
        "£300": { collection: 0, field: 1, row: { row: 0 }, sure: false },
      };
      const draft = { title: "Lisbon", paragraphs: [{ text: "Flight £200, hotel £300.", values: [spend("£200", "flight", 200), spend("£300", "hotel", 300)] }] };
      expect(await lines(draft)).toEqual(["Trips: Asks before adding it. £200", "Trips: Asks before adding it. £300"]);
      expect(placed).toEqual([]);
      expect(asked.at(-1)).toBe("Add £200 and £300 to Trips?");
    });

    test("a second value for a filled cell asks without naming a column", async () => {
      byKind = {
        "£300": { collection: 0, field: 1, row: { row: 0 }, sure: true },
        "£50": { collection: 0, field: 1, row: { row: 0 }, sure: true },
      };
      const draft = { title: "Lisbon", paragraphs: [{ text: "Hotel £300, hotel extras £50.", values: [spend("£300", "hotel", 300), spend("£50", "hotel_extras", 50)] }] };
      expect(await lines(draft)).toEqual(["Trips · Lisbon: Hotel goes in when you save. £300", "Trips: Asks before adding it. £50"]);
      expect(placed.map((cell) => cell.fieldId)).toEqual(["hotel"]);
      expect(asked).toEqual(["Add £50 to Trips?"]);
    });
  });

  describe("a date the list files goes into the row it named", () => {
    const trips: Collection = {
      id: "trips",
      name: "Trips",
      rowLabel: "trip",
      fields: [
        { id: "cost", name: "Cost", kind: "money" },
        { id: "date", name: "Date", kind: "date" },
      ],
      key: { by: "name" },
      createdAt: 0,
    };
    const porto = { id: "trips.porto", collectionId: "trips", label: "Porto", createdAt: 1 };
    const flying: DraftValue = { quote: "3 March", kind: "date", name: "date", about: "Lisbon", event: true, when: { on: "2027-03-03", grain: "day" }, formula: "", field: null };
    const cost: DraftValue = { quote: "£500", kind: "money", name: "cost", about: "Porto", event: false, amount: 500, before: "£", after: "", formula: "", field: null };

    const save = async (draft: NoteDraft) => {
      byKind = { date: { collection: 0, field: 1, row: { label: "Lisbon" }, sure: true }, money: { collection: 0, field: 0, row: { row: 0 }, sure: true } };
      const previewed = await previewFiling(shelfOf([trips], [porto]), draft, today);
      const lines = keepLines(draft, new Map(), today, previewed.wheres);
      const { queryClient, store } = context();
      queryClient.setQueryData(["collections", "u1"], [trips]);
      queryClient.setQueryData(["rows", "u1"], [porto]);
      saveDraft({ queryClient, uid: "u1", store }, draft, shownFiling(previewed, lines));
      await settle();
      return placed.map((cell) => [cell.fieldId, cell.row.label]);
    };

    test("on its own", async () => {
      expect(await save({ title: "Lisbon", paragraphs: [{ text: "Flying to Lisbon on 3 March.", values: [flying] }] })).toEqual([["date", "Lisbon"]]);
    });

    test("next to a value for another row", async () => {
      const draft = { title: "Trips", paragraphs: [{ text: "Flying to Lisbon on 3 March.", values: [flying] }, { text: "Porto cost £500.", values: [cost] }] };
      expect(await save(draft)).toEqual([
        ["date", "Lisbon"],
        ["cost", "Porto"],
      ]);
    });
  });

  test("a preview made before the collections changed is not reused", async () => {
    answer = { collection: 0, field: 2, row: null, sure: false };
    const previewed = { wheres: new Map(), answers: new Map([[1, { collection: 0, field: 2, row: null, sure: true }]]), shape: JSON.stringify([["other"]]) };
    saveDraft(context(), race, previewed);
    await settle();
    expect(placed).toEqual([]);
    expect(asked).toEqual(["Add 52:41 to Runs?"]);
  });

  test("when the model is unsure it asks instead of filing", async () => {
    answer = { collection: 0, field: 2, row: null, sure: false };
    saveDraft(context(), race, await shown(race));
    await settle();
    expect(placed).toEqual([]);
    expect(asked).toEqual(["Add 52:41 to Runs?"]);
  });

  test("undo removes the note, its values and the cells it filed", async () => {
    const { store, ...rest } = context();
    const saved = saveDraft({ ...rest, store }, race, await shown(race));
    await settle();
    saved.undo();
    expect(unplaced).toEqual([placed[0]!.valueId]);
    expect(deleted).toEqual(["n1"]);
    expect(store.list()).toEqual([]);
  });

  test("a cell filed after undo is taken straight back out", async () => {
    const { store, ...rest } = context();
    const saved = saveDraft({ ...rest, store }, race, await shown(race));
    saved.undo();
    await settle();
    expect(placed).toHaveLength(1);
    expect(unplaced).toEqual(placed.map((cell) => cell.valueId));
  });

  test("saving before the list has shown where values go files nothing", async () => {
    saveDraft(context(), race);
    await settle();
    expect(modelCalls).toBe(0);
    expect(placed).toEqual([]);
    expect(asked).toEqual([]);
  });
});
