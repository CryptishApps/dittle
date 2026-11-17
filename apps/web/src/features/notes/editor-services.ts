import type { QueryClient } from "@tanstack/react-query";
import { dayLabel, rowLabel } from "@/features/collections/format";
import { planCollection, rowForPlacement } from "@/features/collections/logic";
import { acceptFormula, describeFormula, inputsFor } from "@/features/formulas/apply";
import type { EditorServices } from "@/features/editor/services";
import type { TrackedValue, ValueStore } from "@/features/editor/values";
import { collectionsQuery, noteQuery, notesQuery, rowsQuery, writes } from "./api";
import { showToast } from "./toast";

type ServiceInput = { queryClient: QueryClient; uid: string; noteId: string; store: ValueStore };

export function createEditorServices({ queryClient, uid, noteId, store }: ServiceInput): EditorServices {
  const notes = () => queryClient.getQueryData(notesQuery(uid).queryKey) ?? [];
  const collections = () => queryClient.getQueryData(collectionsQuery(uid).queryKey) ?? [];
  const rows = () => queryClient.getQueryData(rowsQuery(uid).queryKey) ?? [];

  const place = async (value: TrackedValue) => {
    const fact = { ...store.get(value.id), ...value };
    const daily = collections().filter((collection) => collection.key.by === "when");
    if (fact.field || daily.length === 0) return;
    const { placeValue } = await import("@/features/ai/place");
    const result = await placeValue({
      sentence: fact.origin?.sentence ?? fact.text,
      item: { text: fact.text, kind: fact.kind, name: fact.name, about: fact.subject?.label },
      collections: daily.map((collection) => ({ name: collection.name, rowLabel: collection.rowLabel, per: "day", fields: collection.fields })),
    });
    if (result.collection === null || result.field === null) return;
    const collection = daily[result.collection]!;
    const field = collection.fields[result.field]!;
    if (field.kind === "date" || (fact.kind && field.kind !== "text" && field.kind !== fact.kind)) return;
    const row = rowForPlacement(collection, fact, field.id, store.list(), rows());
    if (!row) return;
    const undo = await writes.placeCell(uid, row, { valueId: fact.id, rowId: row.id, fieldId: field.id });
    showToast(`Added to ${collection.name} · ${dayLabel(row.period)}`, undo);
  };

  const findFormula = async (value: TrackedValue) => {
    const fact = { ...store.get(value.id), ...value };
    if (fact.amount === undefined || fact.formula) return;
    const inputs = inputsFor(fact, store.list());
    if (inputs.length === 0) return;
    const { suggestFormula } = await import("@/features/ai/formula");
    const suggested = await suggestFormula({
      sentence: fact.origin?.sentence ?? fact.text,
      value: { name: fact.name ?? "value", text: fact.text, amount: fact.amount },
      inputs: inputs.map((input) => ({ name: input.name ?? "value", text: input.text, amount: input.amount! })),
    });
    const formula = acceptFormula(suggested, fact.amount, inputs);
    if (!formula) return;
    store.update(fact.id, { formula });
    showToast(`${fact.text} now follows ${describeFormula({ ...fact, formula }, (id) => store.get(id)) ?? "a formula"}`);
  };

  return {
    noteId,
    noteTitleOf: (id) => notes().find((note) => note.id === id)?.title || undefined,
    usage: (factId) => notes().filter((note) => note.valueIds.includes(factId)).length,
    onChanged: (factId, text) =>
      writes.relabelNotes(
        uid,
        factId,
        text,
        notes()
          .filter((note) => note.id !== noteId && note.valueIds.includes(factId))
          .map((note) => note.id),
      ),
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
