import { hashKey, type QueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { valuesQuery, type writes } from "@/features/notes/api";
import type { FactFields, StoredValue } from "@/features/notes/fact";

export type TrackedValue = StoredValue & { naming: boolean };

export type ValueStore = {
  list: () => TrackedValue[];
  get: (id: string) => TrackedValue | undefined;
  add: (text: string, fields?: Omit<FactFields, "text">) => TrackedValue;
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
    add: (text, fields) => {
      const value: TrackedValue = { ...fields, id: crypto.randomUUID(), text, naming: false };
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

type ValueWrites = Pick<typeof writes, "createValue" | "updateValue">;

export function createSyncedValueStore(client: QueryClient, uid: string, writes: ValueWrites): ValueStore {
  const { queryKey } = valuesQuery(uid);
  const queryHash = hashKey(queryKey);
  const naming = new Set<string>();
  const listeners = new Set<() => void>();
  let source: StoredValue[] | undefined;
  let values: TrackedValue[] = [];

  const emit = () => {
    source = undefined;
    listeners.forEach((listener) => listener());
  };
  const list = () => {
    const current = client.getQueryData(queryKey) ?? [];
    if (current !== source) {
      source = current;
      values = current.map((value) => ({ ...value, naming: naming.has(value.id) }));
    }
    return values;
  };

  return {
    list,
    get: (id) => list().find((value) => value.id === id),
    add: (text, fields) => {
      const value = { ...fields, id: crypto.randomUUID(), text };
      writes.createValue(uid, value);
      return { ...value, naming: false };
    },
    update: (id, { naming: isNaming, ...patch }) => {
      if (isNaming !== undefined) {
        if (isNaming) naming.add(id);
        else naming.delete(id);
      }
      if (Object.keys(patch).length > 0) writes.updateValue(uid, id, patch);
      emit();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      const stop = client.getQueryCache().subscribe((event) => {
        if (event.type === "updated" && event.query.queryHash === queryHash) listener();
      });
      return () => {
        listeners.delete(listener);
        stop();
      };
    },
  };
}

export function useValues(store: ValueStore): TrackedValue[] {
  return useSyncExternalStore(store.subscribe, store.list);
}

export type TagContext = { sentence: string; noteTitle: string; noteId?: string };

export function describeInBackground(store: ValueStore, value: TrackedValue, { sentence, noteTitle, noteId }: TagContext): void {
  store.update(value.id, { naming: true, origin: { noteId, sentence } });
  void import("@/features/ai/describe")
    .then(({ describeTag, DESCRIBE_PROMPT_VERSION }) =>
      describeTag({ paragraph: sentence, noteTitle, tagged: value.text }).then((described) => ({ described, v: DESCRIBE_PROMPT_VERSION })),
    )
    .then(
      ({ described: { kind, name, about, event, when, conditions, remarks, where, ms }, v }) =>
        store.update(value.id, {
          kind,
          name,
          subject: about ? { label: about } : undefined,
          event,
          when,
          conditions,
          remarks,
          naming: false,
          describedBy: { where, ms, v },
        }),
      () => store.update(value.id, { naming: false }),
    );
}
