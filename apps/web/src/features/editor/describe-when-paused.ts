import { Extension } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { VALUE_NODE } from "./value-node";
import type { TrackedValue, ValueStore } from "./values";

type Options = {
  store: ValueStore;
  pauseMs: number;
  describe: (value: TrackedValue, context: { sentence: string; noteTitle: string }) => void;
};

type DescribeStorage = { add: (value: TrackedValue) => void };

declare module "@tiptap/core" {
  interface Storage {
    describeWhenPaused: DescribeStorage;
  }
}

export function paragraphWith(doc: PMNode, valueId: string, store: ValueStore): string | undefined {
  let found: string | undefined;
  const leaf = (node: PMNode) => (node.type.name === VALUE_NODE ? (store.get(node.attrs.id)?.text ?? node.attrs.label ?? "") : "");
  doc.descendants((node, pos) => {
    if (found !== undefined) return false;
    if (node.type.name !== VALUE_NODE || node.attrs.id !== valueId) return true;
    const block = doc.resolve(pos).parent;
    found = block.textBetween(0, block.content.size, undefined, leaf).trim();
    return false;
  });
  return found;
}

export const DescribeWhenPaused = Extension.create<Options, DescribeStorage>({
  name: "describeWhenPaused",

  addOptions() {
    return { store: undefined as unknown as ValueStore, pauseMs: 1500, describe: () => undefined };
  },

  addStorage() {
    return { add: () => undefined };
  },

  onCreate() {
    const { store, pauseMs, describe } = this.options;
    const editor = this.editor;
    const pending = new Map<string, TrackedValue>();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const flush = () => {
      clearTimeout(timer);
      timer = undefined;
      const noteTitle = editor.state.doc.firstChild?.textContent ?? "";
      for (const value of pending.values()) {
        const sentence = paragraphWith(editor.state.doc, value.id, store);
        if (sentence) describe(value, { sentence, noteTitle });
      }
      pending.clear();
    };
    const wait = () => {
      clearTimeout(timer);
      timer = setTimeout(flush, pauseMs);
    };

    this.storage.add = (value) => {
      pending.set(value.id, value);
      store.update(value.id, { naming: true });
      wait();
    };
    editor.on("update", () => pending.size > 0 && wait());
    editor.on("destroy", flush);
  },
});
