import { columnAverage, columnValue, numericFields } from "@/features/collections/columns";
import { dayLabel } from "@/features/collections/format";
import { freeRowId } from "@/features/collections/logic";
import { scalesOf, withUnits } from "@/features/collections/scale";
import { daysUntil, summariseCollection } from "@/features/collections/summary";
import { formatAmount } from "@/features/formulas/apply";
import type { Collection, Glance, Row, StoredValue } from "@/features/notes/fact";
import type { Block, Inline, NoteDoc } from "@/features/notes/note-doc";
import { localIso, resolveDay, sentenceOf, type ChangeTo, type GlanceOption, type Recipe, type Sample, type SampleValue } from "./recipes";

export type NewRow = Omit<Row, "createdAt">;

export type PlannedChange = { sentence: string; valueId: string; to: ChangeTo };

export type Seed = {
  folder: { id: string; name: string };
  note: { id: string; doc: NoteDoc };
  values: StoredValue[];
  collection: Omit<Collection, "createdAt">;
  rows: NewRow[];
  changes: PlannedChange[];
};

const snake = (text: string) => text.trim().toLowerCase().replaceAll(/[^a-z0-9]+/g, "_");

export function buildSeed(recipe: Recipe, samples: Sample[], glance: Glance | undefined, today: Date, newId: () => string = () => crypto.randomUUID()): Seed {
  const collectionId = newId();
  const noteId = newId();
  const byDay = recipe.collection.key.by === "when";
  const rows: NewRow[] = [];
  const values: StoredValue[] = [];
  const changes: PlannedChange[] = [];
  const blocks: Block[] = [{ t: "h", level: 1, c: [{ t: "text", text: recipe.noteTitle }] }];

  for (const sample of samples) {
    const sentence = sentenceOf(sample.parts);
    const rowIds = sample.entries.map((entry) => {
      const period = entry.day ? resolveDay(entry.day, today) : undefined;
      const row: NewRow =
        byDay && period
          ? { id: freeRowId(`${collectionId}.${period}`, (id) => rows.some((taken) => taken.id === id)), collectionId, label: period, period }
          : { id: `${collectionId}.${newId()}`, collectionId, label: entry.label ?? recipe.collection.rowLabel };
      rows.push(row);
      return row.id;
    });
    const inlines: Inline[] = sample.parts.map((part) => {
      if (typeof part === "string") return { t: "text", text: part };
      const value = valueOf(recipe, sample, part, rowIds, today, values, { noteId, sentence }, newId);
      values.push(value);
      return { t: "value", id: value.id, label: value.text };
    });
    blocks.push({ t: "p", c: inlines });
    if (sample.change) {
      const { e = 0, f } = sample.change;
      const target = values.find((value) => value.subject?.entityId === rowIds[e] && value.field === f);
      if (target) changes.push({ sentence: sample.change.sentence, valueId: target.id, to: sample.change.to });
    }
  }

  const fallback = changes.length === 0 ? fallbackChange(values) : undefined;
  return {
    folder: { id: newId(), name: recipe.folder },
    note: { id: noteId, doc: { v: 1, blocks } },
    values,
    collection: { id: collectionId, ...recipe.collection, ...(glance && { glance }) },
    rows,
    changes: fallback ? [fallback] : changes,
  };
}

function valueOf(
  recipe: Recipe,
  sample: Sample,
  part: SampleValue,
  rowIds: string[],
  today: Date,
  placed: StoredValue[],
  origin: { noteId: string; sentence: string },
  newId: () => string,
): StoredValue {
  const entry = sample.entries[part.e ?? 0] ?? {};
  const field = recipe.collection.fields.find((candidate) => candidate.id === part.f);
  const rowId = rowIds[part.e ?? 0];
  const byDay = recipe.collection.key.by === "when";
  const on = part.on ?? (field?.kind === "date" || byDay ? entry.day : undefined);
  const free = field && rowId && !placed.some((value) => value.subject?.entityId === rowId && value.field === field.id);
  const about = entry.label ?? recipe.collection.rowLabel;
  return {
    id: newId(),
    text: part.v,
    kind: field?.kind ?? "text",
    name: snake(`${recipe.collection.rowLabel} ${field?.name ?? part.f}`),
    subject: free ? { label: about, entityId: rowId } : { label: about },
    ...(free && { field: field.id }),
    event: byDay,
    ...(on && { when: { on: resolveDay(on, today), grain: "day" as const } }),
    conditions: [],
    remarks: [],
    origin,
    ...(part.amount !== undefined && { amount: part.amount, before: part.before ?? "", after: part.after ?? "" }),
    ...(part.unit && { unit: part.unit }),
    ...(part.seconds !== undefined && { seconds: part.seconds }),
  };
}

export function fallbackChange(values: StoredValue[]): PlannedChange | undefined {
  const target = values.find((value) => value.field && value.amount !== undefined && value.amount > 0);
  if (!target || target.amount === undefined) return undefined;
  const amount = target.amount >= 5 ? Math.round(target.amount * 1.2) : target.amount + 1;
  const text = formatAmount(target, amount);
  return { sentence: `Actually it's ${text}, not ${target.text}`, valueId: target.id, to: { text, amount } };
}

export type TableView = { headers: string[]; rows: { id: string; label: string; cells: string[] }[] };

const withTimes = (rows: NewRow[]): Row[] => rows.map((row, index) => ({ ...row, createdAt: index }));

export function tableOf(collection: Omit<Collection, "createdAt">, rows: NewRow[], values: StoredValue[]): TableView {
  const byDay = collection.key.by === "when";
  const shown = collection.fields.filter((field) => !(byDay && field.kind === "date"));
  const cells = withUnits(values.filter((value) => value.field));
  const scales = scalesOf(collection.fields, cells);
  const ordered = byDay ? [...rows].sort((a, b) => (b.period ?? "").localeCompare(a.period ?? "") || a.id.localeCompare(b.id)) : rows;
  return {
    headers: [byDay ? "Day" : capitalise(collection.rowLabel), ...shown.map((field) => capitalise(field.name)), ...(collection.columns ?? []).map((column) => column.name)],
    rows: ordered.map((row) => {
      const cellOf = (fieldId: string) => cells.find((value) => value.subject?.entityId === row.id && value.field === fieldId);
      return {
        id: row.id,
        label: row.period ? dayLabel(row.period) : row.label,
        cells: [
          ...shown.map((field) => cellOf(field.id)?.text ?? ""),
          ...(collection.columns ?? []).map((column) => columnValue(column, cellOf, scales)?.text ?? ""),
        ],
      };
    }),
  };
}

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const weekOf = (today: Date) => {
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  return { from: localIso(monday), to: localIso(sunday) };
};

export function glanceValue(glance: Glance, collection: Omit<Collection, "createdAt">, rows: NewRow[], values: StoredValue[], today: Date): string | undefined {
  const full = { ...collection, createdAt: 0 };
  const mine = rows.filter((row) => row.collectionId === collection.id);
  const cells = values.filter((value) => mine.some((row) => row.id === value.subject?.entityId) && value.field);
  if (glance === "count") {
    if (collection.key.by !== "when") return String(mine.length);
    const { from, to } = weekOf(today);
    const days = new Set(mine.flatMap((row) => (row.period && row.period >= from && row.period <= to ? [row.period] : [])));
    return numericFields(collection.fields).length === 0 ? `${days.size} of 7` : String(days.size);
  }
  if (glance === "countdown") {
    const from = localIso(today);
    const next = cells
      .flatMap((value) => (value.kind === "date" && value.when && value.when.on.slice(0, 10) >= from ? [value.when.on.slice(0, 10)] : []))
      .sort()[0];
    if (!next) return undefined;
    const days = daysUntil(next, today);
    return days === 0 ? "Today" : days === 1 ? "1 day" : `${days} days`;
  }
  const summary = summariseCollection(full, withTimes(mine), cells, today);
  if (glance === "total") return summary.totals[0]?.text;
  const column = collection.columns?.[0];
  if (column) {
    const scales = scalesOf(collection.fields, withUnits(cells));
    const all = mine.flatMap((row) => columnValue(column, (fieldId) => cells.find((value) => value.subject?.entityId === row.id && value.field === fieldId), scales) ?? []);
    return all.length === 1 ? all[0]!.text : columnAverage(all)?.text;
  }
  return summary.totals[0]?.average ?? summary.totals[0]?.text;
}

export function glancesFor(recipe: Pick<Recipe, "collection">): GlanceOption[] {
  const numeric = numericFields(recipe.collection.fields)[0];
  const dated = recipe.collection.fields.some((field) => field.kind === "date") && recipe.collection.key.by === "name";
  const name = recipe.collection.name;
  return [
    ...(numeric ? [{ glance: "total" as const, label: `${capitalise(numeric.name)} in total` }] : []),
    { glance: "count", label: `${name}${recipe.collection.key.by === "when" ? " this week" : ""}` },
    ...(dated ? [{ glance: "countdown" as const, label: "Days to the next date" }] : []),
  ];
}

export type ChangeLine =
  | { at: "note"; title: string; lead: string; from: string; to: string; tail: string }
  | { at: "row"; title: string; label: string; from: string; to: string }
  | { at: "home"; title: string; label: string; from: string; to: string };

export function applyTo(values: StoredValue[], change: Pick<PlannedChange, "valueId" | "to">): StoredValue[] {
  return values.map((value) =>
    value.id === change.valueId
      ? { ...value, text: change.to.text, ...(change.to.amount !== undefined && { amount: change.to.amount }), ...(change.to.seconds !== undefined && { seconds: change.to.seconds }) }
      : value,
  );
}

type PreviewInput = { seed: Pick<Seed, "collection" | "rows" | "values">; noteTitle: string; change: PlannedChange; glance?: GlanceOption; today: Date };

export function previewChange({ seed, noteTitle, change, glance, today }: PreviewInput): ChangeLine[] {
  const { collection, rows, values } = seed;
  const target = values.find((value) => value.id === change.valueId);
  if (!target) return [];
  const after = applyTo(values, change);
  const sentence = target.origin?.sentence ?? target.text;
  const at = sentence.indexOf(target.text);
  const lines: ChangeLine[] = [
    {
      at: "note",
      title: noteTitle,
      lead: at >= 0 ? sentence.slice(0, at) : "",
      from: target.text,
      to: change.to.text,
      tail: at >= 0 ? sentence.slice(at + target.text.length) : "",
    },
  ];
  const row = rows.find((item) => item.id === target.subject?.entityId);
  const field = collection.fields.find((item) => item.id === target.field);
  if (row && field) {
    const title = `${collection.name} · ${row.period ? dayLabel(row.period) : row.label}`;
    lines.push({ at: "row", title, label: capitalise(field.name), from: target.text, to: change.to.text });
    const scales = (list: StoredValue[]) => scalesOf(collection.fields, withUnits(list.filter((value) => value.field)));
    const cellOf = (list: StoredValue[]) => (fieldId: string) => list.find((value) => value.subject?.entityId === row.id && value.field === fieldId);
    for (const column of collection.columns ?? []) {
      if (!column.inputs.includes(field.id)) continue;
      const from = columnValue(column, cellOf(values), scales(values))?.text;
      const to = columnValue(column, cellOf(after), scales(after))?.text;
      if (from && to && from !== to) lines.push({ at: "row", title, label: column.name, from, to });
    }
  }
  if (glance) {
    const from = glanceValue(glance.glance, collection, rows, values, today);
    const to = glanceValue(glance.glance, collection, rows, after, today);
    if (from && to && from !== to) lines.push({ at: "home", title: `Home · ${collection.name}`, label: glance.label, from, to });
  }
  return lines;
}
