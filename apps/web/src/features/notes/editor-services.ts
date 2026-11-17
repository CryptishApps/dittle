import type { QueryClient } from "@tanstack/react-query";
import { dayLabel, rowLabel } from "@/features/collections/format";
import { placeByDay, placeByName, planCollection, rowOptions, type Placement } from "@/features/collections/logic";
import { changeEverywhere, type Quantity } from "@/features/editor/linking";
import { acceptFormula, describeFormula, inputsFor, quantityOf } from "@/features/formulas/apply";
import type { EditorServices } from "@/features/editor/services";
import type { TrackedValue, ValueStore } from "@/features/editor/values";
import type { Collection, CollectionField, StoredValue } from "./fact";
import { collectionsQuery, noteQuery, notesQuery, rowsQuery, writes } from "./api";
import { askToast, showToast } from "./toast";

type ServiceInput = { queryClient: QueryClient; uid: string; noteId: string; store: ValueStore };

export function relabelNotesUsing(queryClient: QueryClient, uid: string, factId: string, text: string, exceptNoteId?: string): void {
  const notes = queryClient.getQueryData(notesQuery(uid).queryKey) ?? [];
  const noteIds = notes.filter((note) => note.id !== exceptNoteId && note.valueIds.includes(factId)).map((note) => note.id);
  if (noteIds.length > 0) writes.relabelNotes(uid, factId, text, noteIds);
}

export function changeOutsideEditor(queryClient: QueryClient, uid: string, store: ValueStore, factId: string, text: string, quantity?: Quantity): void {
  for (const change of changeEverywhere(store, factId, text, quantity)) relabelNotesUsing(queryClient, uid, change.id, change.text);
}

export function createEditorServices({ queryClient, uid, noteId, store }: ServiceInput): EditorServices {
  const notes = () => queryClient.getQueryData(notesQuery(uid).queryKey) ?? [];
  const collections = () => queryClient.getQueryData(collectionsQuery(uid).queryKey) ?? [];
  const rows = () => queryClient.getQueryData(rowsQuery(uid).queryKey) ?? [];

  const put = async (collection: Collection, valueId: string, field: CollectionField, target: Pick<Placement, "row" | "newRow">, replaces?: string) => {
    const undo = await writes.placeCell(uid, { row: target.row, newRow: target.newRow, valueId, fieldId: field.id, replaces });
    showToast(`Added to ${collection.name} · ${rowLabel(target.row)}`, undo);
  };

  const place = async (value: TrackedValue) => {
    const fact = { ...store.get(value.id), ...value };
    const all = collections();
    if (fact.field || all.length === 0) return;
    const options = all.map((collection) => (collection.key.by === "name" ? rowOptions(collection, rows()) : []));
    const { placeValue } = await import("@/features/ai/place");
    const result = await placeValue({
      sentence: fact.origin?.sentence ?? fact.text,
      item: { text: fact.text, kind: fact.kind, name: fact.name, about: fact.subject?.label },
      collections: all.map((collection, index) => ({
        name: collection.name,
        per: collection.key.by === "when" ? "day" : "name",
        fields: collection.fields,
        rows: options[index]!.map((row) => row.label),
      })),
    });
    if (result.collection === null || result.field === null) return;
    const collection = all[result.collection]!;
    const field = collection.fields[result.field]!;
    const byDay = collection.key.by === "when";
    if ((byDay && field.kind === "date") || (fact.kind && field.kind !== "text" && field.kind !== fact.kind)) return;
    const placement = byDay
      ? placeByDay(collection, fact, field.id, store.list(), rows())
      : result.row && placeByName(collection, result.row, options[result.collection]!, fact, field.id, store.list());
    if (!placement) return;
    const { occupant, another } = placement;
    if (!occupant) return put(collection, fact.id, field, placement);
    if (byDay && another) {
      askToast(`${collection.name} already has ${occupant.text} on ${dayLabel(placement.row.period)}`, [
        { label: "Skip" },
        { label: "Add another", primary: true, run: () => void put(collection, fact.id, field, another) },
      ]);
      return;
    }
    askToast(`${collection.name} already has ${occupant.text} for ${placement.row.label}`, [
      { label: "Skip" },
      { label: `Use ${fact.text}`, primary: true, run: () => void put(collection, fact.id, field, placement, occupant.id) },
    ]);
  };

  const findFormula = async (value: TrackedValue) => {
    const fact = { ...store.get(value.id), ...value };
    const target = quantityOf(fact);
    if (target === undefined || fact.formula) return;
    const inputs = inputsFor(fact, store.list());
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
      void place(value).catch((error: unknown) => console.warn("Dittle could not place a value in a collection", error));
      void findFormula(value).catch((error: unknown) => console.warn("Dittle could not check for a formula", error));
    },
    placementOf: (value) => {
      const row = rows().find((item) => item.id === value.subject?.entityId);
      const collection = row && collections().find((item) => item.id === row.collectionId);
      return row && collection ? `In ${collection.name} · ${rowLabel(row)}` : undefined;
    },
    startCollection: (value, name) => {
      const plan = planCollection(value, store.list(), name);
      writes.createCollection(uid, plan.collection, plan.rows, plan.cells);
      showToast(`Created ${name} with ${plan.cells.length} ${plan.cells.length === 1 ? "value" : "values"}`);
    },
    ignoredRequests: () => queryClient.getQueryData(noteQuery(uid, noteId).queryKey)?.ignoredRequests ?? [],
    ignoreRequest: (text) => writes.ignoreRequest(uid, noteId, text),
  };
}
