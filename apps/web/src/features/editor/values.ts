import { useSyncExternalStore } from "react";
import type { InferenceWhere } from "@/features/ai/hybrid";
import type { TagKind } from "@/features/ai/name-value";

export type TrackedValue = {
  id: string;
  text: string;
  kind?: TagKind;
  name?: string;
  naming: boolean;
  namedBy?: { where: InferenceWhere; ms: number };
};

export type ValueStore = {
  list: () => TrackedValue[];
  get: (id: string) => TrackedValue | undefined;
  add: (text: string) => TrackedValue;
  update: (id: string, patch: Partial<Omit<TrackedValue, "id">>) => void;
  subscribe: (listener: () => void) => () => void;
};

export function createValueStore(initial: TrackedValue[] = []): ValueStore {
  let values = initial;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());

  return {
    list: () => values,
    get: (id) => values.find((value) => value.id === id),
    add: (text) => {
      const value: TrackedValue = { id: crypto.randomUUID(), text, naming: false };
      values = [...values, value];
      emit();
      return value;
    },
    update: (id, patch) => {
      values = values.map((value) => (value.id === id ? { ...value, ...patch } : value));
      emit();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function useValues(store: ValueStore): TrackedValue[] {
  return useSyncExternalStore(store.subscribe, store.list);
}

export function nameInBackground(store: ValueStore, value: TrackedValue, sentence: string): void {
  store.update(value.id, { naming: true });
  void import("@/features/ai/name-value")
    .then(({ nameValue }) => nameValue(sentence, value.text))
    .then(
      ({ kind, name, where, ms }) => store.update(value.id, { kind, name, naming: false, namedBy: { where, ms } }),
      () => store.update(value.id, { naming: false }),
    );
}
