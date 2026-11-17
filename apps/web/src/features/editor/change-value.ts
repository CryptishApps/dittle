import type { Editor } from "@tiptap/react";
import { changeEverywhere, relabelInEditor, repoint, type Quantity } from "./linking";
import type { EditorServices } from "./services";
import type { TrackedValue, ValueStore } from "./values";

export type ChangeScope = "everywhere" | "here";

export function applyEverywhere(editor: Editor, store: ValueStore, services: EditorServices, factId: string, text: string, quantity?: Quantity): void {
  for (const change of changeEverywhere(store, factId, text, quantity)) {
    relabelInEditor(editor, change.id, change.text);
    services.onChanged?.(change.id, change.text);
  }
}

export function changeValue(editor: Editor, store: ValueStore, services: EditorServices, value: TrackedValue, text: string, scope: ChangeScope, quantity: Quantity = {}): void {
  if (text === value.text) return;
  if (scope === "everywhere") return applyEverywhere(editor, store, services, value.id, text, quantity);
  const { id: _id, text: _text, naming: _naming, proposal: _proposal, updatedAt: _updatedAt, ...context } = value;
  const forked = store.add(text, {
    ...context,
    ...(quantity.amount !== undefined && { amount: quantity.amount }),
    ...(quantity.seconds !== undefined && { seconds: quantity.seconds }),
    formula: undefined,
    notSame: [...(value.notSame ?? []), value.id],
    history: [{ text: value.text, at: Date.now() }],
  });
  repoint(editor, value.id, forked.id, text);
  store.update(value.id, { notSame: [...(value.notSame ?? []), forked.id] });
}
