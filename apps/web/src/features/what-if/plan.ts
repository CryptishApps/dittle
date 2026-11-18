import { MAX_OPTIONS, type Operation, type WhatIfOption } from "@/features/ai/what-if-answer";
import { formatAmount, recompute, withQuantity } from "@/features/formulas/apply";
import type { StoredValue } from "@/features/notes/fact";

export type TitledNote = { id: string; title: string; valueIds: string[] };

const CHANGEABLE = new Set<StoredValue["kind"]>(["money", "count", "number", "percent"]);

export function changeable(values: StoredValue[]): StoredValue[] {
  const followers = (id: string) => values.filter((value) => value.formula?.inputs.includes(id)).length;
  return values
    .filter((value) => value.event === false && value.amount !== undefined && !value.formula && !value.proposal && CHANGEABLE.has(value.kind))
    .map((value) => ({ value, followers: followers(value.id) }))
    .sort((a, b) => b.followers - a.followers || (b.value.updatedAt ?? 0) - (a.value.updatedAt ?? 0))
    .map(({ value }) => value)
    .slice(0, MAX_OPTIONS);
}

export const notesUsing = (valueId: string, notes: TitledNote[]) => notes.filter((note) => note.valueIds.includes(valueId)).map((note) => note.title || "Untitled");

export const optionsFor = (shown: StoredValue[], notes: TitledNote[]): WhatIfOption[] =>
  shown.map((value) => ({ text: value.text, kind: value.kind, name: value.name, about: value.subject?.label, notes: notesUsing(value.id, notes) }));

export function labelOf(value: Pick<StoredValue, "name" | "subject" | "text">): string {
  const words = value.name?.replaceAll("_", " ").trim() || value.subject?.label || value.text;
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function exampleAmount(value: StoredValue & { amount: number }): number {
  if (value.kind === "count") return value.amount + 2;
  if (value.kind === "percent") return value.amount + 5;
  return value.amount < 5 ? value.amount + 1 : Math.round(value.amount * 1.2);
}

export function exampleQuestion(value: StoredValue): string {
  if (value.amount === undefined) return `What if ${labelOf(value)} changes?`;
  return `What if ${labelOf(value)} goes from ${value.text} to ${formatAmount(value, exampleAmount({ ...value, amount: value.amount }))}?`;
}

const LIST = new Intl.ListFormat("en-GB", { type: "conjunction" });

function brief(words: string[], more: (count: number) => string): string {
  if (words.length <= 3) return LIST.format(words);
  return `${words.slice(0, 2).join(", ")} and ${more(words.length - 2)}`;
}

export function scopeOf(shown: StoredValue[], notes: TitledNote[]): string {
  const labels = [...new Set(shown.map(labelOf))];
  const titles = [...new Set(shown.flatMap((value) => notesUsing(value.id, notes)))];
  const where = titles.length > 0 ? ` in ${brief(titles, (count) => `${count} more ${count === 1 ? "note" : "notes"}`)}` : "";
  return `Tries it on ${brief(labels, (count) => `${count} more`)}${where}`;
}

export const inNotes = (titles: string[]) => (titles.length > 0 ? `in ${LIST.format(titles)}` : "");

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
