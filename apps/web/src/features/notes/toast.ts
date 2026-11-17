import { useSyncExternalStore } from "react";

export type ToastAction = { label: string; run?: () => void; primary?: boolean };
export type Toast = { id: number; text: string; actions: ToastAction[] };

const SHOW_MS = 6000;
const ASK_MS = 12_000;

let current: Toast | undefined;
let timer: number | undefined;
let showFor = SHOW_MS;
let nextId = 0;
const listeners = new Set<() => void>();

function set(next: Toast | undefined) {
  current = next;
  listeners.forEach((listener) => listener());
}

function open(text: string, actions: ToastAction[], ms: number) {
  window.clearTimeout(timer);
  nextId += 1;
  set({ id: nextId, text, actions });
  showFor = ms;
  timer = window.setTimeout(() => set(undefined), ms);
}

export function holdToast(held: boolean): void {
  window.clearTimeout(timer);
  if (!held && current) timer = window.setTimeout(() => set(undefined), showFor);
}

export function showToast(text: string, undo?: () => void): void {
  open(text, undo ? [{ label: "Undo", run: undo }] : [], SHOW_MS);
}

export function askToast(text: string, actions: ToastAction[]): void {
  open(text, actions, ASK_MS);
}

export function dismissToast(): void {
  window.clearTimeout(timer);
  set(undefined);
}

export function useToast(): Toast | undefined {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
  );
}
