import { describe, expect, test } from "bun:test";
import type { Editor } from "@tiptap/core";
import { onEditorDom } from "./editor-dom";

function fakeEditor(initialized: boolean) {
  const handlers = new Map<string, () => void>();
  const dom = {} as HTMLElement;
  const editor = {
    isInitialized: initialized,
    get view() {
      if (!editor.isInitialized) throw new Error("The editor view is not available");
      return { dom };
    },
    on: (event: string, handler: () => void) => handlers.set(event, handler),
    off: (event: string) => handlers.delete(event),
  };
  const create = () => {
    editor.isInitialized = true;
    handlers.get("create")?.();
  };
  return { editor: editor as unknown as Editor, dom, create, handlers };
}

describe("onEditorDom", () => {
  test("attaches at once to a mounted editor and detaches on cleanup", () => {
    const { editor, dom } = fakeEditor(true);
    const seen: HTMLElement[] = [];
    let detached = 0;
    const cleanup = onEditorDom(editor, (element) => {
      seen.push(element);
      return () => detached++;
    });
    expect(seen).toEqual([dom]);
    cleanup();
    expect(detached).toBe(1);
  });

  test("waits for an editor that is not mounted yet", () => {
    const { editor, dom, create } = fakeEditor(false);
    const seen: HTMLElement[] = [];
    onEditorDom(editor, (element) => {
      seen.push(element);
      return () => undefined;
    });
    expect(seen).toEqual([]);
    create();
    expect(seen).toEqual([dom]);
  });

  test("stops waiting after cleanup", () => {
    const { editor, handlers } = fakeEditor(false);
    const cleanup = onEditorDom(editor, () => () => undefined);
    cleanup();
    expect(handlers.has("create")).toBe(false);
  });
});
