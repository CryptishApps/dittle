import type { Editor } from "@tiptap/react";
import { changeEverywhere, relabelInEditor, repoint } from "./linking";
import type { EditorServices } from "./services";
import type { TrackedValue, ValueStore } from "./values";

export type ChangeScope = "everywhere" | "here";

export function applyEverywhere(editor: Editor, store: ValueStore, services: EditorServices, factId: string, text: string, amount?: number): void {
  for (const change of changeEverywhere(store, factId, text, amount)) {
    relabelInEditor(editor, change.id, change.text);
    services.onChanged?.(change.id, change.text);
  }
}

export function changeValue(editor: Editor, store: ValueStore, services: EditorServices, value: TrackedValue, text: string, scope: ChangeScope, amount?: number): void {
  if (text === value.text) return;
  if (scope === "everywhere") return applyEverywhere(editor, store, services, value.id, text, amount);
  const { id: _id, text: _text, naming: _naming, proposal: _proposal, updatedAt: _updatedAt, ...context } = value;
  const forked = store.add(text, {
    ...context,
    ...(amount !== undefined && { amount }),
    formula: undefined,
    notSame: [...(value.notSame ?? []), value.id],
    history: [{ text: value.text, at: Date.now() }],
  });
  repoint(editor, value.id, forked.id, text);
  store.update(value.id, { notSame: [...(value.notSame ?? []), forked.id] });
}
