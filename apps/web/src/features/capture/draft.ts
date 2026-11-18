import type { DraftParagraph, DraftValue } from "@/features/ai/capture-answer";
import { acceptFormula, quantityOf } from "@/features/formulas/apply";
import type { FactFields, StoredValue } from "@/features/notes/fact";
import type { Block, Inline } from "@/features/notes/note-doc";

export type Placed = { id: string; quote: string };

export function inlinesFor(text: string, placed: Placed[]): Inline[] {
  const spots = placed
    .map((value) => ({ ...value, at: text.indexOf(value.quote) }))
    .filter((spot) => spot.at >= 0)
    .sort((a, b) => a.at - b.at);
  const inlines: Inline[] = [];
  let cursor = 0;
  for (const spot of spots) {
    if (spot.at < cursor) continue;
    if (spot.at > cursor) inlines.push({ t: "text", text: text.slice(cursor, spot.at) });
    inlines.push({ t: "value", id: spot.id, label: spot.quote });
    cursor = spot.at + spot.quote.length;
  }
  if (cursor < text.length) inlines.push({ t: "text", text: text.slice(cursor) });
  return inlines;
}

export function blocksFor(paragraphs: DraftParagraph[], placed: Placed[][]): Block[] {
  return paragraphs.map((paragraph, index) => ({ t: "p", c: inlinesFor(paragraph.text, placed[index] ?? []) }));
}

export function factOf(value: DraftValue, sentence: string, noteId?: string): Omit<FactFields, "text"> {
  return {
    kind: value.kind,
    name: value.name,
    ...(value.about && { subject: { label: value.about } }),
    event: value.event,
    ...(value.when && { when: value.when }),
    conditions: [],
    remarks: [],
    ...(value.amount !== undefined && { amount: value.amount, before: value.before ?? "", after: value.after ?? "" }),
    ...(value.seconds !== undefined && { seconds: value.seconds }),
    ...(value.unit && { unit: value.unit }),
    origin: { ...(noteId && { noteId }), sentence },
  };
}

export type Formulas = Map<number, NonNullable<FactFields["formula"]>>;

export function formulasFor(values: DraftValue[], ids: string[] = values.map((_, index) => String(index))): Formulas {
  const inputs: StoredValue[] = values.map((value, index) => ({ id: ids[index]!, text: value.quote, amount: value.amount, seconds: value.seconds }));
  const found: Formulas = new Map();
  values.forEach((value, index) => {
    const target = quantityOf(value);
    if (!value.formula || target === undefined) return;
    const formula = acceptFormula(value.formula, target, inputs);
    if (formula && !formula.inputs.includes(ids[index]!)) found.set(index, formula);
  });
  return found;
}

export function shortTitle(entry: string, limit = 60): { title: string; body: string } {
  const flat = entry.replaceAll("\n", " ").trim();
  if (flat.length <= limit) return { title: flat, body: entry === flat ? "" : entry };
  const cut = flat.lastIndexOf(" ", limit);
  return { title: `${flat.slice(0, cut > limit / 2 ? cut : limit)}…`, body: entry };
}
