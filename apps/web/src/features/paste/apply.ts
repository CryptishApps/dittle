import type { QueryClient } from "@tanstack/react-query";
import { writes } from "@/features/notes/api";
import { relabelNotesUsing } from "@/features/notes/editor-services";
import type { PlannedChange, ValueState } from "./plan";

function put(queryClient: QueryClient, uid: string, id: string, state: ValueState, shownText: string) {
  writes.updateValue(uid, id, { ...state, history: state.history ?? [] });
  if (state.text !== shownText) relabelNotesUsing(queryClient, uid, id, state.text);
}

export function applyPlan(queryClient: QueryClient, uid: string, plan: PlannedChange[]): () => void {
  plan.forEach((change) => put(queryClient, uid, change.id, change.after, change.before.text));
  return () => plan.forEach((change) => put(queryClient, uid, change.id, change.before, change.after.text));
}
