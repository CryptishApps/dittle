import type { QueryClient } from "@tanstack/react-query";
import { dayLabel, rowLabel } from "@/features/collections/format";
import { tidyColumnNames } from "@/features/collections/name-columns";
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

const OFFER_GROUP_MS = 6000;

type Offer = { collection: Collection; values: TrackedValue[]; label: string; row?: Omit<Row, "createdAt">; at: number };

function fieldFor(collection: Collection, value: StoredValue, used: Set<string> = new Set()): CollectionField | undefined {
  if (!value.kind || value.field) return undefined;
  return collection.fields.find((field) => field.kind === value.kind && !used.has(field.id) && !(collection.key.by === "when" && field.kind === "date"));
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

  let offer: Offer | undefined;
  let settled: { collectionId: string; row: Omit<Row, "createdAt">; at: number } | undefined;
  let held: { collectionId: string; values: TrackedValue[]; at: number } | undefined;
  const fresh = (at: number) => Date.now() - at < OFFER_GROUP_MS;
  const recent = (collectionId: string) => (settled && settled.collectionId === collectionId && fresh(settled.at) ? settled.row : undefined);
  const heldFor = (collectionId: string) => (held && held.collectionId === collectionId && fresh(held.at) ? held.values : []);

  const accept = async ({ collection, values, label, row }: Offer) => {
    offer = undefined;
    const used = new Set<string>();
    let target: Pick<Placement, "row" | "newRow"> | undefined;
    for (const value of values) {
      const fact = { ...store.get(value.id), ...value };
      const field = fieldFor(collection, fact, used);
      if (!field || fact.field) continue;
      used.add(field.id);
      if (collection.key.by === "when") {
        const placement = placeByDay(collection, fact, field.id, store.list(), rows());
        await put(collection, fact.id, field, placement.occupant && placement.another ? placement.another : placement);
        continue;
      }
      target ??= row ? { row, newRow: false } : (placeByName(collection, { label }, [], fact, field.id, store.list()) ?? undefined);
      if (!target) continue;
      await put(collection, fact.id, field, target);
      target = { row: target.row, newRow: false };
    }
  };

  const ask = (next: Offer) => {
    offer = next;
    askToast(`Add ${next.values.map((item) => item.text).join(" and ")} to ${next.collection.name}?`, [
      { label: "Not now", run: () => (offer = undefined) },
      { label: "Add", primary: true, run: () => void accept(next) },
    ]);
  };

  const suggest = (fact: TrackedValue, collection: Collection, pick?: { label?: string; row?: Omit<Row, "createdAt"> }) => {
    if (!fieldFor(collection, fact)) return;
    const joins = offer && offer.collection.id === collection.id && fresh(offer.at) && !offer.values.some((item) => item.id === fact.id);
    if (joins && offer) return ask({ ...offer, values: [...offer.values, fact], at: Date.now() });
    const waiting = heldFor(collection.id);
    held = undefined;
    const label = pick?.label ?? fact.subject?.label ?? notes().find((note) => note.id === noteId)?.title ?? collection.rowLabel;
    ask({ collection, values: [fact, ...waiting], label, row: pick?.row, at: Date.now() });
  };

  const follow = (fact: TrackedValue, collection: Collection) => {
    const sibling = recent(collection.id);
    if (sibling) return void accept({ collection, values: [fact], label: sibling.label, row: sibling, at: Date.now() });
    if (offer && offer.collection.id === collection.id && fresh(offer.at)) return suggest(fact, collection);
    held = { collectionId: collection.id, values: [...heldFor(collection.id), fact], at: Date.now() };
  };

  const place = async (value: TrackedValue, sentence?: string, declinedInto?: (collection: Collection) => void): Promise<boolean> => {
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
    const collection = result.collection === null ? undefined : all[result.collection];
    if (!collection) return false;
    const byDay = collection.key.by === "when";
    const existing = result.row && "row" in result.row ? options[result.collection!]![result.row.row] : undefined;
    if (!sentence && !byDay && fact.kind === "date" && !(existing && result.sure)) {
      follow(fact, collection);
      return false;
    }
    const declined = () => {
      declinedInto?.(collection);
      suggest(fact, collection, result.row && "label" in result.row ? { label: result.row.label } : { row: existing });
      return false;
    };
    if (result.field === null || !result.sure) return declined();
    const field = collection.fields[result.field]!;
    if ((byDay && field.kind === "date") || (fact.kind && field.kind !== "text" && field.kind !== fact.kind)) return declined();
    const placement = byDay
      ? placeByDay(collection, fact, field.id, store.list(), rows())
      : result.row && placeByName(collection, result.row, options[result.collection!]!, fact, field.id, store.list());
    if (!placement) return declined();
    const { occupant, another } = placement;
    if (!occupant) {
      await put(collection, fact.id, field, placement);
      if (!byDay) {
        settled = { collectionId: collection.id, row: placement.row, at: Date.now() };
        const waiting = heldFor(collection.id);
        held = undefined;
        if (waiting.length > 0) await accept({ collection, values: waiting, label: placement.row.label, row: placement.row, at: Date.now() });
      }
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
    const asked = offer;
    const picked: Collection[] = [];
    for (const value of values) placed = (await place(value, sentence, (collection) => picked.push(collection))) || placed;
    if (placed) return true;
    if (picked.length > 0) {
      if (offer === asked) showToast(`${picked[0]!.name} has no column for ${values.map((value) => value.text).join(" and ")}`);
      return true;
    }
    const lead = values.find((value) => value.event) ?? values[0]!;
    const known = new Map(store.list().map((value) => [value.id, value]));
    for (const value of values) known.set(value.id, { ...known.get(value.id), ...value });
    const plan = planCollection(lead, [...known.values()], list, lead.event ? "day" : "name");
    writes.createCollection(uid, plan.collection, plan.rows, plan.cells);
    void tidyColumnNames(uid, plan.collection, plan.cells.map((cell) => ({ text: known.get(cell.valueId)?.text ?? "", field: cell.fieldId })));
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
      void tidyColumnNames(uid, plan.collection, plan.cells.map((cell) => ({ text: store.get(cell.valueId)?.text ?? "", field: cell.fieldId })));
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
