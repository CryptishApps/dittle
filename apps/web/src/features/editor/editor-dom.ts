import type { Editor } from "@tiptap/core";

export function onEditorDom(editor: Editor, attach: (dom: HTMLElement) => () => void): () => void {
  let detach: (() => void) | undefined;
  const mount = () => {
    detach?.();
    detach = attach(editor.view.dom);
  };
  if (editor.isInitialized) mount();
  else editor.on("create", mount);
  return () => {
    editor.off("create", mount);
    detach?.();
  };
}
