import type { QueryClient } from "@tanstack/react-query";
import { dayLabel, rowLabel } from "@/features/collections/format";
import { tidyColumnNames } from "@/features/collections/name-columns";
import { freeRowId, placeByDay, placeByName, planCollection, rowOptions, type Placement } from "@/features/collections/logic";
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

type Fits = { kind: "fits"; fact: TrackedValue; collection: Collection; field: CollectionField; placement: Placement };
type Declined = { kind: "declined"; fact: TrackedValue; collection: Collection; pick: { label?: string; row?: Omit<Row, "createdAt"> } };
type Decision = { kind: "none"; fact: TrackedValue } | { kind: "follows"; fact: TrackedValue; collection: Collection } | Declined | Fits;
type Entry = { fact: TrackedValue; field: CollectionField; occupant?: StoredValue };
type Group = { collection: Collection; key: string; target: Pick<Placement, "row" | "newRow">; entries: Entry[] };

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

  const decide = async (value: TrackedValue, sentence?: string): Promise<Decision> => {
    const fact = { ...store.get(value.id), ...value };
    const all = collections();
    if (fact.field || all.length === 0) return { kind: "none", fact };
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
    if (!collection) return { kind: "none", fact };
    const byDay = collection.key.by === "when";
    const existing = result.row && "row" in result.row ? options[result.collection!]![result.row.row] : undefined;
    const pick = result.row && "label" in result.row ? { label: result.row.label } : { row: existing };
    if (!sentence && !byDay && fact.kind === "date" && !(existing && result.sure)) return { kind: "follows", fact, collection };
    const declined: Decision = { kind: "declined", fact, collection, pick };
    if (result.field === null || !result.sure) return declined;
    const field = collection.fields[result.field]!;
    if ((byDay && field.kind === "date") || (fact.kind && field.kind !== "text" && field.kind !== fact.kind)) return declined;
    const placement = byDay
      ? placeByDay(collection, fact, field.id, store.list(), rows())
      : result.row && placeByName(collection, result.row, options[result.collection!]!, fact, field.id, store.list());
    return placement ? { kind: "fits", fact, collection, field, placement } : declined;
  };

  const place = async (value: TrackedValue): Promise<void> => {
    const decision = await decide(value);
    if (decision.kind === "none") return;
    if (decision.kind === "follows") return follow(decision.fact, decision.collection);
    if (decision.kind === "declined") return suggest(decision.fact, decision.collection, decision.pick);
    const { fact, collection, field, placement } = decision;
    const byDay = collection.key.by === "when";
    const { occupant, another } = placement;
    if (!occupant) {
      await put(collection, fact.id, field, placement);
      if (!byDay) {
        settled = { collectionId: collection.id, row: placement.row, at: Date.now() };
        const waiting = heldFor(collection.id);
        held = undefined;
        if (waiting.length > 0) await accept({ collection, values: waiting, label: placement.row.label, row: placement.row, at: Date.now() });
      }
      return;
    }
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

  const fillRow = async (collection: Collection, entries: Entry[], target: Pick<Placement, "row" | "newRow">, replace: boolean) => {
    for (const [index, { fact, field, occupant }] of entries.entries()) {
      await put(collection, fact.id, field, { row: target.row, newRow: target.newRow && index === 0 }, replace ? occupant?.id : undefined);
    }
  };

  const groupsOf = (fits: Fits[], extra: Declined[]): Group[] => {
    const groups: Group[] = [];
    const ordered = [...fits.filter((item) => item.fact.kind !== "date"), ...fits.filter((item) => item.fact.kind === "date")];
    const takenIds = new Set(rows().map((row) => row.id));
    const join = (group: Group, fact: TrackedValue, field: CollectionField) => {
      if (group.entries.some((entry) => entry.field.id === field.id)) return false;
      group.entries.push({ fact, field });
      return true;
    };
    for (const { fact, collection, field, placement } of ordered) {
      const byDay = collection.key.by === "when";
      const mine = groups.filter((group) => group.collection.id === collection.id);
      const key = byDay || !placement.newRow ? placement.row.id : `new:${placement.row.label}`;
      if (mine.some((group) => group.key === key && join(group, fact, field))) continue;
      if (!byDay && fact.kind === "date" && mine.some((group) => join(group, fact, field))) continue;
      const clash = mine.some((group) => group.key === key);
      const target = !clash
        ? { row: placement.row, newRow: placement.newRow }
        : byDay
          ? { row: { ...placement.row, id: freeRowId(placement.row.id, (id) => takenIds.has(id) || groups.some((group) => group.target.row.id === id)) }, newRow: true }
          : { row: { id: `${collection.id}.${crypto.randomUUID()}`, collectionId: collection.id, label: fact.subject?.label ?? placement.row.label }, newRow: true };
      groups.push({ collection, key: clash ? target.row.id : key, target, entries: [{ fact, field }] });
    }
    for (const { fact, collection } of extra) {
      const group = groups.find((item) => item.collection.id === collection.id);
      const field = group && fieldFor(collection, fact, new Set(group.entries.map((entry) => entry.field.id)));
      if (group && field) group.entries.push({ fact, field });
    }
    return groups;
  };

  const fileGroups = async (groups: Group[]): Promise<boolean> => {
    const filling = new Set(groups.map((group) => group.target.row.id));
    const occupantOf = (group: Group, entry: Entry) =>
      group.target.newRow ? undefined : store.list().find((other) => other.id !== entry.fact.id && other.subject?.entityId === group.target.row.id && other.field === entry.field.id);
    const checked = groups.map((group) => ({ group, entries: group.entries.map((entry) => ({ ...entry, occupant: occupantOf(group, entry) })) }));
    const clashing = checked.filter(({ entries }) => entries.some((entry) => entry.occupant));
    let written = false;
    for (const { group, entries } of checked) {
      if (clashing.some((item) => item.group === group)) continue;
      await fillRow(group.collection, entries, group.target, false);
      written = true;
    }
    if (clashing.length === 0) return written;
    const answers = clashing.map(({ group, entries }) => {
      const occupied = entries.flatMap((entry) => (entry.occupant ? [entry.occupant.text] : [])).join(" and ");
      if (group.collection.key.by !== "when") {
        return { text: `${group.collection.name} already has ${occupied} for ${group.target.row.label}`, replace: true, run: () => fillRow(group.collection, entries, { row: group.target.row, newRow: false }, true) };
      }
      const busy = (id: string) => filling.has(id) || store.list().some((other) => other.subject?.entityId === id && entries.some((entry) => entry.field.id === other.field));
      const id = freeRowId(group.target.row.id, busy);
      filling.add(id);
      const another = { row: rows().find((row) => row.id === id) ?? { ...group.target.row, id }, newRow: !rows().some((row) => row.id === id) };
      return { text: `${group.collection.name} already has ${occupied} on ${dayLabel(group.target.row.period)}`, replace: false, run: () => fillRow(group.collection, entries, another, false) };
    });
    const label = answers.every((answer) => !answer.replace)
      ? "Add another"
      : answers.every((answer) => answer.replace)
        ? `Use ${clashing.flatMap(({ entries }) => entries.map((entry) => entry.fact.text)).join(" and ")}`
        : "Add them";
    askToast(answers.map((answer) => answer.text).join(". "), [
      { label: "Skip" },
      { label, primary: true, run: () => void answers.reduce((previous, answer) => previous.then(answer.run), Promise.resolve()) },
    ]);
    return written;
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
    const decisions: Decision[] = [];
    for (const value of values) decisions.push(await decide(value, sentence));
    const fits = decisions.filter((decision): decision is Fits => decision.kind === "fits");
    const declined = decisions.filter((decision): decision is Declined => decision.kind === "declined");
    if (fits.length > 0) {
      return fileGroups(groupsOf(fits, declined));
    }
    if (declined.length > 0) {
      const asked = offer;
      for (const item of declined) suggest(item.fact, item.collection, item.pick);
      if (offer === asked) showToast(`${declined[0]!.collection.name} has no column for ${values.map((value) => value.text).join(" and ")}`);
      return false;
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
