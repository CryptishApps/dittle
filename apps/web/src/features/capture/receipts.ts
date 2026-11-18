import { useSyncExternalStore } from "react";
import type { Outcome } from "./apply";

export type Receipt = { id: string; said: string; at: number; state: "working" | "done" | "undone"; outcome?: Outcome };

const KEEP = 6;

let receipts: Receipt[] = [];
const listeners = new Set<() => void>();

function set(next: Receipt[]) {
  receipts = next;
  listeners.forEach((listener) => listener());
}

export function startReceipt(said: string): string {
  const id = crypto.randomUUID();
  set([{ id, said, at: Date.now(), state: "working" as const }, ...receipts].slice(0, KEEP));
  return id;
}

export function finishReceipt(id: string, outcome: Outcome): void {
  set(receipts.map((receipt) => (receipt.id === id ? { ...receipt, state: "done", outcome } : receipt)));
}

export function undoReceipt(id: string): void {
  const receipt = receipts.find((item) => item.id === id);
  if (receipt?.state !== "done" || !receipt.outcome) return;
  receipt.outcome.undo();
  set(receipts.map((item) => (item.id === id ? { ...item, state: "undone" } : item)));
}

export function useReceipts(): Receipt[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => receipts,
  );
}
