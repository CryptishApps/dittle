import { useSyncExternalStore } from "react";

export type Toast = { id: number; text: string; undo?: () => void };

let current: Toast | undefined;
let timer: number | undefined;
const listeners = new Set<() => void>();

function set(next: Toast | undefined) {
  current = next;
  listeners.forEach((listener) => listener());
}

export function showToast(text: string, undo?: () => void): void {
  window.clearTimeout(timer);
  set({ id: Date.now(), text, undo });
  timer = window.setTimeout(() => set(undefined), 6000);
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
