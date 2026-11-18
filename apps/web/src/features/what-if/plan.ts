import { MAX_OPTIONS, type Operation, type WhatIfOption } from "@/features/ai/what-if-answer";
import { recompute, withQuantity } from "@/features/formulas/apply";
import type { StoredValue } from "@/features/notes/fact";

export type TitledNote = { id: string; title: string; valueIds: string[] };

const CHANGEABLE = new Set<StoredValue["kind"]>(["money", "count", "number", "percent"]);

export function changeable(values: StoredValue[]): StoredValue[] {
  return values
    .filter((value) => value.amount !== undefined && !value.formula && !value.proposal && CHANGEABLE.has(value.kind))
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
    .slice(0, MAX_OPTIONS);
}

export const notesUsing = (valueId: string, notes: TitledNote[]) => notes.filter((note) => note.valueIds.includes(valueId)).map((note) => note.title || "Untitled");

export const optionsFor = (shown: StoredValue[], notes: TitledNote[]): WhatIfOption[] =>
  shown.map((value) => ({ text: value.text, kind: value.kind, name: value.name, about: value.subject?.label, notes: notesUsing(value.id, notes) }));

export function labelOf(value: Pick<StoredValue, "name" | "subject" | "text">): string {
  const words = value.name?.replaceAll("_", " ").trim() || value.subject?.label || value.text;
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function applyOperation(current: number, operation: Operation, number: number): number {
  const next = operation === "set" ? number : operation === "add" ? current + number : operation === "subtract" ? current - number : current * number;
  return Math.round(next * 100) / 100;
}

export type Effect = { value: StoredValue; from: string; to: string; notes: string[] };
export type WhatIfPreview = { changed: Effect & { amount: number }; follows: Effect[] };

export function previewWhatIf(value: StoredValue, operation: Operation, number: number, values: StoredValue[], notes: TitledNote[]): WhatIfPreview | null {
  if (value.amount === undefined) return null;
  const amount = applyOperation(value.amount, operation, number);
  if (!Number.isFinite(amount) || amount < 0) return null;
  const changed = { value, from: value.text, to: withQuantity(value, amount).text, amount, notes: notesUsing(value.id, notes) };
  const follows = recompute(value.id, values, new Map([[value.id, amount]])).flatMap((result): Effect[] => {
    const follower = values.find((candidate) => candidate.id === result.id);
    if (!follower || follower.text === result.text) return [];
    return [{ value: follower, from: follower.text, to: result.text, notes: notesUsing(follower.id, notes) }];
  });
  return { changed, follows };
}
