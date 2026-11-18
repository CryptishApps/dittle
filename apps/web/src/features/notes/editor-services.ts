import type { QueryClient } from "@tanstack/react-query";
import { dayLabel, rowLabel } from "@/features/collections/format";
import { placeByDay, placeByName, planCollection, rowOptions, type Placement } from "@/features/collections/logic";
import { changeEverywhere, type Quantity } from "@/features/editor/linking";
import { acceptFormula, describeFormula, inputsFor, quantityOf } from "@/features/formulas/apply";
import type { EditorServices } from "@/features/editor/services";
import type { TrackedValue, ValueStore } from "@/features/editor/values";
import type { Collection, CollectionField, Row, StoredValue } from "./fact";
import { collectionsQuery, noteQuery, notesQuery, rowsQuery, writes } from "./api";
import { askToast, showToast } from "./toast";

type ServiceInput = { queryClient: QueryClient; uid: string; noteId: string; store: ValueStore; valuesInNote: () => string[] };

export function relabelNotesUsing(queryClient: QueryClient, uid: string, factId: string, text: string, exceptNoteId?: string): void {
  const notes = queryClient.getQueryData(notesQuery(uid).queryKey) ?? [];
  const noteIds = notes.filter((note) => note.id !== exceptNoteId && note.valueIds.includes(factId)).map((note) => note.id);
  if (noteIds.length > 0) writes.relabelNotes(uid, factId, text, noteIds);
}

export function changeOutsideEditor(queryClient: QueryClient, uid: string, store: ValueStore, factId: string, text: string, quantity?: Quantity): void {
  for (const change of changeEverywhere(store, factId, text, quantity)) relabelNotesUsing(queryClient, uid, change.id, change.text);
}

export function createEditorServices({ queryClient, uid, noteId, store, valuesInNote }: ServiceInput): EditorServices {
  const notes = () => queryClient.getQueryData(notesQuery(uid).queryKey) ?? [];
  const collections = () => queryClient.getQueryData(collectionsQuery(uid).queryKey) ?? [];
  const created: Row[] = [];
  const rows = () => {
    const stored = queryClient.getQueryData(rowsQuery(uid).queryKey) ?? [];
    return [...stored, ...created.filter((row) => !stored.some((item) => item.id === row.id))];
  };
  let placing: Promise<void> = Promise.resolve();

  const put = async (collection: Collection, valueId: string, field: CollectionField, target: Pick<Placement, "row" | "newRow">, replaces?: string) => {
    if (target.newRow) created.push({ ...target.row, createdAt: Date.now() });
    const undo = await writes.placeCell(uid, { row: target.row, newRow: target.newRow, valueId, fieldId: field.id, replaces });
    showToast(`Added to ${collection.name} · ${rowLabel(target.row)}`, () => {
      const index = created.findIndex((row) => row.id === target.row.id);
      if (index >= 0) created.splice(index, 1);
      undo();
    });
  };

  const place = async (value: TrackedValue, sentence?: string): Promise<boolean> => {
    const fact = { ...store.get(value.id), ...value };
    const all = collections();
    if (fact.field || all.length === 0) return false;
    const options = all.map((collection) => (collection.key.by === "name" ? rowOptions(collection, rows()) : []));
    const { placeValue } = await import("@/features/ai/place");
    const result = await placeValue({
      sentence: sentence ?? fact.origin?.sentence ?? fact.text,
      item: { text: fact.text, kind: fact.kind, name: fact.name, about: fact.subject?.label },
      collections: all.map((collection, index) => ({
        name: collection.name,
        per: collection.key.by === "when" ? "day" : "name",
        fields: collection.fields,
        rows: options[index]!.map((row) => row.label),
      })),
    });
    if (result.collection === null || result.field === null) return false;
    const collection = all[result.collection]!;
    const field = collection.fields[result.field]!;
    const byDay = collection.key.by === "when";
    if ((byDay && field.kind === "date") || (fact.kind && field.kind !== "text" && field.kind !== fact.kind)) return false;
    const placement = byDay
      ? placeByDay(collection, fact, field.id, store.list(), rows())
      : result.row && placeByName(collection, result.row, options[result.collection]!, fact, field.id, store.list());
    if (!placement) return false;
    const { occupant, another } = placement;
    if (!occupant) {
      await put(collection, fact.id, field, placement);
      return true;
    }
    if (byDay && another) {
      askToast(`${collection.name} already has ${occupant.text} on ${dayLabel(placement.row.period)}`, [
        { label: "Skip" },
        { label: "Add another", primary: true, run: () => void put(collection, fact.id, field, another) },
      ]);
      return true;
    }
    askToast(`${collection.name} already has ${occupant.text} for ${placement.row.label}`, [
      { label: "Skip" },
      { label: `Use ${fact.text}`, primary: true, run: () => void put(collection, fact.id, field, placement, occupant.id) },
    ]);
    return true;
  };

  const fileValues = async (values: TrackedValue[], list: string, sentence: string): Promise<boolean> => {
    if (values.length === 0) {
      showToast(`Nothing to add to ${list} yet. Write a value in this paragraph, like a distance or a price.`);
      return false;
    }
    const filed = values.find((value) => value.field);
    const row = filed && rows().find((item) => item.id === filed.subject?.entityId);
    const home = row && collections().find((item) => item.id === row.collectionId);
    if (home) {
      showToast(`Already in ${home.name} · ${rowLabel(row)}`);
      return true;
    }
    let placed = false;
    for (const value of values) placed = (await place(value, sentence)) || placed;
    if (placed) return true;
    const lead = values.find((value) => value.event) ?? values[0]!;
    const known = new Map(store.list().map((value) => [value.id, value]));
    for (const value of values) known.set(value.id, { ...known.get(value.id), ...value });
    const plan = planCollection(lead, [...known.values()], list, lead.event ? "day" : "name");
    writes.createCollection(uid, plan.collection, plan.rows, plan.cells);
    showToast(`Started ${list} with ${rowLabel(plan.rows[0]!)}`);
    return true;
  };

  const findFormula = async (value: TrackedValue) => {
    const fact = { ...store.get(value.id), ...value };
    const target = quantityOf(fact);
    if (target === undefined || fact.formula) return;
    const inputs = inputsFor(fact, store.list(), new Set(valuesInNote()));
    if (inputs.length === 0) return;
    const { suggestFormula } = await import("@/features/ai/formula");
    const asInput = (value: StoredValue) => ({ name: value.name ?? "value", text: value.text, number: quantityOf(value)!, seconds: value.amount === undefined });
    const suggested = await suggestFormula({ sentence: fact.origin?.sentence ?? fact.text, value: asInput(fact), inputs: inputs.map(asInput) });
    const formula = acceptFormula(suggested, target, inputs);
    if (!formula) return;
    store.update(fact.id, { formula });
    showToast(`${fact.text} now follows ${describeFormula({ ...fact, formula }, (id) => store.get(id)) ?? "a formula"}`);
  };

  return {
    noteId,
    noteTitleOf: (id) => notes().find((note) => note.id === id)?.title || undefined,
    usage: (factId) => notes().filter((note) => note.valueIds.includes(factId)).length,
    onChanged: (factId, text) => relabelNotesUsing(queryClient, uid, factId, text, noteId),
    onNewFact: (value) => {
      placing = placing
        .then(() => place(value))
        .then(
          () => undefined,
          (error: unknown) => console.warn("Dittle could not place a value in a collection", error),
        );
      void findFormula(value).catch((error: unknown) => console.warn("Dittle could not check for a formula", error));
    },
    placementOf: (value) => {
      const row = rows().find((item) => item.id === value.subject?.entityId);
      const collection = row && collections().find((item) => item.id === row.collectionId);
      return row && collection ? `In ${collection.name} · ${rowLabel(row)}` : undefined;
    },
    startCollection: (value, name, per) => {
      const plan = planCollection(value, store.list(), name, per);
      writes.createCollection(uid, plan.collection, plan.rows, plan.cells);
      showToast(`Created ${name} with ${plan.cells.length} ${plan.cells.length === 1 ? "value" : "values"}`);
    },
    fileValues: (values, list, sentence) => {
      const filing = placing.then(() => fileValues(values, list, sentence));
      placing = filing.then(() => undefined).catch(() => undefined);
      return filing;
    },
    ignoredRequests: () => queryClient.getQueryData(noteQuery(uid, noteId).queryKey)?.ignoredRequests ?? [],
    ignoreRequest: (text) => writes.ignoreRequest(uid, noteId, text),
  };
}
