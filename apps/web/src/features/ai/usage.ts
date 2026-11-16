import { useSyncExternalStore } from "react";
import type { InferenceWhere } from "./hybrid";

export type AiCall = { task: string; where: InferenceWhere; ms: number; at: number };

let calls: AiCall[] = [];
const listeners = new Set<() => void>();

export function recordCall(call: AiCall): void {
  calls = [call, ...calls].slice(0, 50);
  listeners.forEach((listener) => listener());
}

export function useAiCalls(): AiCall[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => calls,
  );
}
