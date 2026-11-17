import { MAX_TRACKED, type UpdateTracked } from "@/features/ai/update-answer";
import { changeEverywhere, type Quantity } from "@/features/editor/linking";
import { createValueStore } from "@/features/editor/values";
import type { StoredValue } from "@/features/notes/fact";
import type { NoteSummary } from "@/features/notes/store";

export type ChosenUpdate = { id: string; text: string; quantity: Quantity; when?: StoredValue["when"] };
export type ValueState = Pick<StoredValue, "text" | "amount" | "seconds" | "when" | "history">;
export type PlannedChange = { id: string; before: ValueState; after: ValueState };

const stateOf = ({ text, amount, seconds, when, history }: StoredValue): ValueState => ({ text, amount, seconds, when, history });

const same = (a: StoredValue, b: StoredValue) => a.text === b.text && a.amount === b.amount && a.seconds === b.seconds && a.when?.on === b.when?.on;

export function trackedOptions(values: StoredValue[], notes: Pick<NoteSummary, "id" | "title" | "valueIds">[]): { ids: string[]; tracked: UpdateTracked[] } {
  const used = new Set(notes.flatMap((note) => note.valueIds));
  const shown = values
    .filter((value) => value.text && value.kind && !value.proposal && !value.formula && used.has(value.id))
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
    .slice(0, MAX_TRACKED);
  return {
    ids: shown.map((value) => value.id),
    tracked: shown.map((value) => ({
      text: value.text,
      kind: value.kind,
      name: value.name,
      about: value.subject?.label,
      noteTitle: notes.find((note) => note.id === value.origin?.noteId)?.title || undefined,
      when: value.when,
      amount: value.amount,
      seconds: value.seconds,
      before: value.before,
      after: value.after,
      unit: value.unit,
    })),
  };
}

export function planUpdates(values: StoredValue[], chosen: ChosenUpdate[]): PlannedChange[] {
  const local = createValueStore(values.map((value) => ({ ...value, naming: false })));
  for (const update of chosen) {
    changeEverywhere(local, update.id, update.text, update.quantity);
    if (update.when) local.update(update.id, { when: update.when });
  }
  const original = new Map(values.map((value) => [value.id, value]));
  return local.list().flatMap((next) => {
    const before = original.get(next.id);
    return before && !same(before, next) ? [{ id: next.id, before: stateOf(before), after: stateOf(next) }] : [];
  });
}
