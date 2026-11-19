import { tidyColumnNames } from "@/features/collections/name-columns";
import type { QueryClient } from "@tanstack/react-query";
import type { CaptureRoute, CaptureShown, DraftParagraph, NoteDraft } from "@/features/ai/capture-answer";
import { columnValue } from "@/features/collections/columns";
import { dayLabel, rowLabel } from "@/features/collections/format";
import { placeByDay, placeByName, rowOptions, type NewRow } from "@/features/collections/logic";
import { scalesOf, withUnits } from "@/features/collections/scale";
import { daysUntil } from "@/features/collections/summary";
import { changeEverywhere } from "@/features/editor/linking";
import type { TrackedValue, ValueStore } from "@/features/editor/values";
import { acceptFormula, quantityOf, withQuantity } from "@/features/formulas/apply";
import { cachedThenLive, collectionsQuery, noteQuery, notesQuery, rowsQuery, startNote, writes } from "@/features/notes/api";
import { createEditorServices, placeShape, relabelNotesUsing } from "@/features/notes/editor-services";
import type { PlaceAnswer } from "@/features/ai/place-answer";
import type { Collection, CollectionField, StoredValue } from "@/features/notes/fact";
import { EMPTY_NOTE, noteWith, type Block, type NoteDoc } from "@/features/notes/note-doc";
import { blocksFor, factOf, formulasFor, shortTitle, type Placed } from "./draft";
import { placeCollections, shelfOf, whereFrom, type Shelf, type Where } from "@/features/onboarding/practice";
import { filingCandidates, spotsFor, storedOf, valuesOf, withSpotted, type KeepLine } from "./keeps";

export type CaptureContext = { queryClient: QueryClient; uid: string; store: ValueStore };

export type Detail = { text: string; label?: string; value?: boolean; was?: string };
export type Destination = { note: string } | { collection: string };
export type Outcome = {
  icon: "file" | "update" | "note" | "add";
  lead: string;
  place: string;
  to?: Destination;
  details: Detail[];
  undo: () => void;
  open?: string;
};

const ROUTE_TIMEOUT_MS = 15_000;

function shownFor({ queryClient, uid, store }: CaptureContext) {
  const collections = (queryClient.getQueryData(collectionsQuery(uid).queryKey) ?? []).slice(0, 8);
  const rows = queryClient.getQueryData(rowsQuery(uid).queryKey) ?? [];
  const notes = (queryClient.getQueryData(notesQuery(uid).queryKey) ?? []).slice(0, 12);
  const titleOf = (noteId: string | undefined) => queryClient.getQueryData(notesQuery(uid).queryKey)?.find((note) => note.id === noteId)?.title;
  const candidates = store
    .list()
    .filter((value) => value.kind && !value.formula && !value.proposal)
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
    .slice(0, 40);
  const options = collections.map((collection) => (collection.key.by === "name" ? rowOptions(collection, rows).slice(0, 12) : []));
  const shown: CaptureShown = {
    collections: collections.map((collection, index) => ({
      name: collection.name,
      per: collection.key.by === "when" ? "day" : "name",
      fields: collection.fields,
      rows: options[index]!.map((row) => row.label),
    })),
    values: candidates.map((value) => ({ text: value.text, kind: value.kind, name: value.name, about: value.subject?.label, noteTitle: titleOf(value.origin?.noteId) })),
    notes: notes.map((note) => note.title),
  };
  return { shown, collections, options, candidates, notes, rows, titleOf };
}

function withTimeout<T>(pending: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`No answer after ${ms / 1000} s`)), ms);
  });
  return Promise.race([pending, timeout]).finally(() => clearTimeout(timer));
}

function addValues(store: ValueStore, paragraphs: DraftParagraph[], noteId?: string): { placed: Placed[][]; created: TrackedValue[] } {
  const created: TrackedValue[] = [];
  const placed = paragraphs.map((paragraph) =>
    paragraph.values.map((value) => {
      const added = store.add(value.quote, factOf(value, paragraph.text, noteId));
      created.push(added);
      return { id: added.id, quote: value.quote };
    }),
  );
  const all = paragraphs.flatMap((paragraph) => paragraph.values);
  for (const [index, formula] of formulasFor(all, created.map((value) => value.id))) store.update(created[index]!.id, { formula });
  return { placed, created };
}

function comingUp(paragraphs: DraftParagraph[]): Detail[] {
  const today = new Date();
  const dated = paragraphs
    .flatMap((paragraph) => paragraph.values)
    .flatMap((value) => (value.kind === "date" && value.when && value.when.grain !== "month" && value.when.grain !== "year" ? [daysUntil(value.when.on.slice(0, 10), today)] : []))
    .filter((days) => days >= 0)
    .sort((a, b) => a - b);
  const [days] = dated;
  if (days === undefined) return [];
  return [{ text: `in Coming up, ${days === 0 ? "today" : days === 1 ? "tomorrow" : `${days} days away`}` }];
}

export type PreviewedFiling = { wheres: Map<number, Where>; answers: Map<number, PlaceAnswer>; shape: string };

const NOT_FILED: PlaceAnswer = { collection: null, field: null, row: null, sure: false };

export function shownFiling(previewed: PreviewedFiling, lines: KeepLine[]): PreviewedFiling {
  const shown = new Set(lines.flatMap((line) => (line.kind === "filed" ? (line.also ?? [line.index]) : [])));
  return { ...previewed, answers: new Map([...previewed.answers].filter(([index]) => shown.has(index))) };
}

function fileIntoCollections({ queryClient, uid, store }: CaptureContext, noteId: string, created: TrackedValue[], previewed: PreviewedFiling): () => void {
  const undos: (() => void)[] = [];
  let undone = false;
  const services = createEditorServices({
    queryClient,
    uid,
    noteId,
    store,
    valuesInNote: () => created.map((value) => value.id),
    findsFormulas: false,
    onPlaced: (undo) => (undone ? undo() : undos.push(undo)),
    answers: { shape: previewed.shape, forValue: (valueId) => previewed.answers.get(created.findIndex((value) => value.id === valueId)) ?? NOT_FILED },
  });
  for (const value of created) services.onNewFact?.(value);
  return () => {
    undone = true;
    undos.reverse().forEach((undo) => undo());
  };
}

export function saveDraft(context: CaptureContext, draft: NoteDraft, filing?: PreviewedFiling): Outcome & { noteId: string } {
  const { queryClient, uid, store } = context;
  const noteId = startNote(queryClient, uid, null, noteWith(draft.title));
  const { placed, created } = addValues(store, draft.paragraphs, noteId);
  const unfile = filing ? fileIntoCollections(context, noteId, created, filing) : () => undefined;
  const blocks: Block[] = [{ t: "h", level: 1, c: draft.title ? [{ t: "text", text: draft.title }] : [] }, ...blocksFor(draft.paragraphs, placed)];
  const doc: NoteDoc = { v: 1, blocks: draft.paragraphs.length > 0 ? blocks : [...blocks, { t: "p", c: [] }] };
  queryClient.setQueryData(noteQuery(uid, noteId).queryKey, (current) => (current ? { ...current, doc, title: draft.title } : current));
  writes.saveNote(uid, noteId, doc);
  return {
    noteId,
    icon: "note",
    lead: "New note",
    place: draft.title || "Untitled",
    to: { note: noteId },
    details: comingUp(draft.paragraphs),
    undo: () => {
      unfile();
      void writes.deleteNote(uid, noteId);
      created.forEach((value) => store.remove(value.id));
    },
  };
}

function saveRaw(context: CaptureContext, entry: string): Outcome {
  return { ...saveDraft(context, rawDraft(entry)), details: [{ text: "Dittle couldn't work out where this goes, so it's saved as a note" }] };
}

const fieldOf = (value: { name: string; kind: StoredValue["kind"] }): CollectionField => ({ id: value.name, name: value.name.replaceAll("_", " "), kind: value.kind ?? "text" });

function newCollection(name: string, paragraph: DraftParagraph): { collection: Collection; fieldIds: string[] } {
  const byDay = paragraph.values.some((value) => value.event);
  const fields = new Map<string, CollectionField>(byDay ? [["date", { id: "date", name: "date", kind: "date" }]] : []);
  const fieldIds = paragraph.values.map((value) => {
    const field = fieldOf(value);
    if (!fields.has(field.id)) fields.set(field.id, field);
    return field.id;
  });
  const about = paragraph.values.find((value) => value.about)?.about;
  const collection: Collection = {
    id: crypto.randomUUID(),
    name,
    rowLabel: about || name,
    fields: [...fields.values()],
    key: byDay ? { by: "when", grain: "day" } : { by: "name" },
    createdAt: Date.now(),
  };
  return { collection, fieldIds };
}

async function file(context: CaptureContext, route: Extract<CaptureRoute, { action: "file" }>, found: ReturnType<typeof shownFor>): Promise<Outcome> {
  const { queryClient, uid, store } = context;
  const { paragraph } = route;
  const fresh = route.collection === "new" ? newCollection(route.list, paragraph) : undefined;
  const collection = fresh?.collection ?? found.collections[route.collection as number]!;
  const options = route.collection === "new" ? [] : found.options[route.collection as number]!;
  if (fresh) writes.createCollection(uid, fresh.collection, [], []);

  const picks = paragraph.values.flatMap((value, index) => {
    const field = fresh ? collection.fields.find((item) => item.id === fresh.fieldIds[index]) : value.field === null ? undefined : collection.fields[value.field];
    if (!field || (collection.key.by === "when" && field.kind === "date")) return [];
    if (field.kind !== "text" && value.kind !== "text" && field.kind !== value.kind) return [];
    return [{ value, field }];
  });
  if (picks.length === 0) {
    if (fresh) writes.deleteCollection(uid, collection.id);
    throw new Error("Nothing fits a field");
  }
  if (fresh) void tidyColumnNames(queryClient, uid, collection, picks.map(({ value, field }) => ({ text: value.quote, field: field.id })));

  const values = picks.map(({ value }) => store.add(value.quote, factOf(value, paragraph.text)));
  const [lead] = values;
  const byDay = collection.key.by === "when";
  let target: { row: NewRow; newRow: boolean };
  let replaces: StoredValue | undefined;
  if (byDay) {
    const placement = placeByDay(collection, lead!, picks[0]!.field.id, store.list(), found.rows);
    target = placement.occupant && placement.another ? placement.another : placement;
  } else {
    const label = paragraph.values.find((value) => value.about)?.about || collection.rowLabel || collection.name;
    const pick = typeof route.row === "number" ? { row: route.row } : (route.row ?? { label });
    const placement = placeByName(collection, pick, options, lead!, picks[0]!.field.id, store.list()) ?? placeByName(collection, { label }, options, lead!, picks[0]!.field.id, store.list())!;
    target = placement;
    replaces = placement.occupant;
  }

  const undos: (() => void)[] = [];
  for (const [index, { field }] of picks.entries()) {
    const occupant = index === 0 ? replaces : byDay ? undefined : store.list().find((other) => other.subject?.entityId === target.row.id && other.field === field.id);
    undos.push(await writes.placeCell(uid, { row: target.row, newRow: target.newRow && index === 0, valueId: values[index]!.id, fieldId: field.id, replaces: occupant?.id }));
  }

  const cells = values.map((value, index) => ({ ...value, subject: { label: target.row.label, entityId: target.row.id }, field: picks[index]!.field.id }));
  const others = store.list().filter((value) => value.subject?.entityId === target.row.id && !cells.some((cell) => cell.field === value.field));
  const rowCells = withUnits([...cells, ...others]);
  const scales = scalesOf(collection.fields, rowCells);
  const columns = (collection.columns ?? []).flatMap((column) => {
    const result = columnValue(column, (fieldId) => rowCells.find((cell) => cell.field === fieldId), scales);
    return result ? [{ text: `${column.name} ${result.text}` }] : [];
  });

  return {
    icon: "file",
    lead: fresh ? "Started" : "Filed in",
    place: collection.name,
    to: { collection: collection.id },
    details: [{ text: byDay ? dayLabel(target.row.period) : rowLabel(target.row) }, ...values.map((value) => ({ text: value.text, value: true })), ...columns],
    undo: () => {
      undos.reverse().forEach((undo) => undo());
      values.forEach((value) => store.remove(value.id));
      if (fresh) writes.deleteCollection(uid, collection.id);
    },
  };
}

function update(context: CaptureContext, route: Extract<CaptureRoute, { action: "update" }>, found: ReturnType<typeof shownFor>): Outcome {
  const { queryClient, uid, store } = context;
  const fact = found.candidates[route.target]!;
  const next =
    fact.amount !== undefined && route.amount !== undefined
      ? withQuantity(fact, route.amount)
      : fact.seconds !== undefined && route.seconds !== undefined
        ? withQuantity(fact, route.seconds)
        : route.text
          ? { text: route.text }
          : undefined;
  if (!next || next.text === fact.text) throw new Error("Nothing to change");
  const before = new Map(store.list().map((value) => [value.id, value]));
  const changes = changeEverywhere(store, fact.id, next.text, next);
  for (const change of changes) relabelNotesUsing(queryClient, uid, change.id, change.text);
  const noteId = fact.origin?.noteId;
  return {
    icon: "update",
    lead: "Updated",
    place: found.titleOf(noteId) || fact.subject?.label || fact.name?.replaceAll("_", " ") || "a value",
    to: noteId ? { note: noteId } : undefined,
    details: changes.map((change, index) => ({
      ...(index > 0 && { label: before.get(change.id)?.name?.replaceAll("_", " ") }),
      text: change.text,
      was: before.get(change.id)?.text,
      value: true,
    })),
    undo: () => {
      const reverted = changeEverywhere(store, fact.id, fact.text, { amount: fact.amount, seconds: fact.seconds });
      for (const change of reverted) relabelNotesUsing(queryClient, uid, change.id, change.text);
    },
  };
}

async function add(context: CaptureContext, route: Extract<CaptureRoute, { action: "add" }>, found: ReturnType<typeof shownFor>): Promise<Outcome> {
  const { queryClient, uid, store } = context;
  const summary = found.notes[route.note]!;
  const note = await cachedThenLive(queryClient, noteQuery(uid, summary.id));
  const original = note?.doc ?? EMPTY_NOTE;
  const { placed, created } = addValues(store, route.paragraphs, summary.id);
  const last = original.blocks.at(-1);
  const kept = last?.t === "p" && last.c.length === 0 && original.blocks.length > 1 ? original.blocks.slice(0, -1) : original.blocks;
  const doc: NoteDoc = { v: 1, blocks: [...kept, ...blocksFor(route.paragraphs, placed)] };
  writes.saveNote(uid, summary.id, doc);
  return {
    icon: "add",
    lead: "Added to",
    place: summary.title || "Untitled",
    to: { note: summary.id },
    details: created.length > 0 ? created.map((value) => ({ text: value.text, value: true })) : [{ text: `“${route.paragraphs[0]!.text}”` }],
    undo: () => {
      writes.saveNote(uid, summary.id, original);
      created.forEach((value) => store.remove(value.id));
    },
  };
}

const TIDY_TIMEOUT_MS = 25_000;

export async function tidy(paste: string): Promise<NoteDraft> {
  const { tidyPaste } = await import("@/features/ai/capture");
  return (await withTimeout(tidyPaste(paste), TIDY_TIMEOUT_MS)).draft;
}

const SPOT_TIMEOUT_MS = 12_000;

export function filingShelf({ queryClient, uid }: CaptureContext): Shelf | undefined {
  const collections = queryClient.getQueryData(collectionsQuery(uid).queryKey) ?? [];
  return collections.length > 0 ? shelfOf(collections, queryClient.getQueryData(rowsQuery(uid).queryKey) ?? []) : undefined;
}

export async function previewFiling(shelf: Shelf, draft: NoteDraft, today = new Date()): Promise<PreviewedFiling> {
  const { placeValue } = await import("@/features/ai/place");
  const values = valuesOf(draft);
  const sentenceOf = draft.paragraphs.flatMap((paragraph) => paragraph.values.map(() => paragraph.text));
  const collections = placeCollections(shelf);
  const found = await Promise.allSettled(
    filingCandidates(draft).map(async (index) => {
      const value = values[index]!;
      const answer = await withTimeout(placeValue({ sentence: sentenceOf[index]!, item: { text: value.quote, kind: value.kind, name: value.name, about: value.about }, collections }), SPOT_TIMEOUT_MS);
      return { index, answer, where: whereFrom(answer, shelf, value, today) };
    }),
  );
  const done = found.flatMap((result) => (result.status === "fulfilled" ? [result.value] : [])).sort((a, b) => a.index - b.index);
  const filled = new Set<string>();
  const answers = new Map(
    done.map(({ index, answer, where }) => {
      const spot = where.at === "collection" && where.field ? JSON.stringify([where.collection, where.row ?? "", where.field]) : undefined;
      const sure = answer.sure && !(spot && filled.has(spot));
      if (spot && sure) filled.add(spot);
      return [index, { collection: answer.collection, field: answer.field, row: answer.row, sure }] as const;
    }),
  );
  return {
    wheres: new Map(done.map(({ index, where }) => [index, where])),
    answers,
    shape: placeShape(shelf.collections, shelf.options),
  };
}

export async function spotFormulas(draft: NoteDraft): Promise<NoteDraft> {
  const spots = spotsFor(draft);
  if (spots.length === 0) return draft;
  const { suggestFormula } = await import("@/features/ai/formula");
  const values = valuesOf(draft);
  const stored = storedOf(values);
  const sentenceOf = draft.paragraphs.flatMap((paragraph) => paragraph.values.map(() => paragraph.text));
  const asInput = (value: StoredValue) => ({ name: value.name ?? "value", text: value.text, number: quantityOf(value)!, seconds: value.amount === undefined });
  const found = await Promise.allSettled(
    spots.map(async ({ index, inputs }) => {
      const shown = inputs.map((input) => stored[input]!);
      const suggested = await withTimeout(suggestFormula({ sentence: sentenceOf[index]!, value: asInput(stored[index]!), inputs: shown.map(asInput) }), SPOT_TIMEOUT_MS);
      return { index, formula: acceptFormula(suggested, quantityOf(stored[index]!)!, shown) };
    }),
  );
  return found.reduce((next, result) => {
    if (result.status === "rejected") {
      console.warn("Dittle could not check a pasted value for a formula", result.reason);
      return next;
    }
    return result.value.formula ? withSpotted(next, result.value.index, result.value.formula) : next;
  }, draft);
}

export function rawDraft(entry: string): NoteDraft {
  const { title, body } = shortTitle(entry);
  return { title, paragraphs: body ? body.split("\n").filter((line) => line.trim()).map((text) => ({ text: text.trim(), values: [] })) : [] };
}

export async function capture(context: CaptureContext, entry: string): Promise<Outcome> {
  const found = shownFor(context);
  let route: CaptureRoute;
  try {
    const { routeCapture } = await import("@/features/ai/capture");
    route = (await withTimeout(routeCapture(entry, found.shown), ROUTE_TIMEOUT_MS)).route;
  } catch (error) {
    console.warn("Dittle could not work out where a capture goes", error);
    return saveRaw(context, entry);
  }
  try {
    switch (route.action) {
      case "file":
        return await file(context, route, found);
      case "update":
        return update(context, route, found);
      case "add":
        return await add(context, route, found);
      case "note":
        return saveDraft(context, route.draft);
      case "open": {
        const saved = saveDraft(context, { title: route.title, paragraphs: [] });
        return { ...saved, open: saved.noteId };
      }
    }
  } catch (error) {
    console.warn("Dittle could not carry out a capture", error);
    return saveRaw(context, entry);
  }
}
