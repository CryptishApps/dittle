import type { TagKind } from "@/features/ai/describe";
import { parseIsoDuration } from "@/features/formulas/duration";
import { isCurrency, isMeasure } from "@/features/formulas/units";
import type { CollectionField } from "@/features/notes/fact";
import type { Entry, Part, Recipe, Sample, SampleValue } from "./recipes";

export type ReadValue = { field: string; quote: string; amount?: string; before?: string; after?: string; unit?: string; duration?: string };
export type ReadEntry = { day?: string; label?: string; values: ReadValue[] };

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const SUMMABLE = new Set<TagKind>(["money", "count", "number", "percent"]);

export const fieldKey = (index: number) => `f${index + 1}`;

function valueFrom(raw: ReadValue, field: CollectionField, entry: number): SampleValue | undefined {
  const quote = raw.quote.trim();
  if (!quote) return undefined;
  const value: SampleValue = { v: quote, f: field.id, e: entry };
  const amount = raw.amount === undefined || raw.amount === "" ? Number.NaN : Number(raw.amount);
  if (SUMMABLE.has(field.kind) && Number.isFinite(amount)) Object.assign(value, { amount, before: raw.before ?? "", after: raw.after ?? "" });
  if (isMeasure(raw.unit) || (field.kind === "money" && isCurrency(raw.unit))) value.unit = raw.unit;
  if (field.kind === "duration" && raw.duration) {
    const seconds = parseIsoDuration(raw.duration);
    if (seconds !== undefined) value.seconds = seconds;
  }
  return value;
}

export function sampleFromReading(sentence: string, entries: ReadEntry[], { fields, key }: Recipe["collection"]): Sample | undefined {
  const found: { at: number; value: SampleValue }[] = [];
  const kept: Entry[] = [];
  for (const entry of entries) {
    const index = kept.length;
    const before = found.length;
    for (const raw of entry.values) {
      const field = fields[Number(raw.field.slice(1)) - 1];
      const value = field && valueFrom(raw, field, index);
      if (!value) continue;
      let at = sentence.indexOf(value.v);
      while (at >= 0 && found.some((other) => at < other.at + other.value.v.length && other.at < at + value.v.length)) at = sentence.indexOf(value.v, at + 1);
      if (at >= 0) found.push({ at, value });
    }
    if (found.length === before) continue;
    const day = entry.day && ISO_DAY.test(entry.day) ? { iso: entry.day } : key.by === "when" ? { ago: 0 } : undefined;
    kept.push({ ...(day && { day }), ...(entry.label?.trim() && { label: entry.label.trim() }) });
  }
  if (found.length === 0) return undefined;
  found.sort((a, b) => a.at - b.at);
  const parts: Part[] = [];
  let cursor = 0;
  for (const { at, value } of found) {
    if (at > cursor) parts.push(sentence.slice(cursor, at));
    parts.push(value);
    cursor = at + value.v.length;
  }
  if (cursor < sentence.length) parts.push(sentence.slice(cursor));
  return { chip: sentence, parts, entries: kept };
}
