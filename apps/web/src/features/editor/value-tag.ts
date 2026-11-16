import { Mention, type MentionOptions } from "@tiptap/extension-mention";
import type { Node as PMNode } from "@tiptap/pm/model";
import { ReactRenderer, type Editor, type Range } from "@tiptap/react";
import { menuItems, ValueMenu, type MenuHandle, type MenuItem } from "./ValueMenu";
import type { TagContext, TrackedValue, ValueStore } from "./values";

export const VALUE_NODE = "value";

type ValueTagOptions = {
  store: ValueStore;
  onCreate: (value: TrackedValue, context: Omit<TagContext, "noteId">) => void;
};

function sentenceWith(editor: Editor, range: Range, text: string, store: ValueStore): string {
  const $from = editor.state.doc.resolve(range.from);
  const block = $from.parent;
  const start = $from.start();
  const leaf = (node: PMNode) => (node.type.name === VALUE_NODE ? (store.get(node.attrs.id)?.text ?? node.attrs.label ?? "") : "");
  const before = block.textBetween(0, range.from - start, undefined, leaf);
  const after = block.textBetween(Math.min(range.to - start, block.content.size), block.content.size, undefined, leaf);
  return `${before}${text}${after}`.trim();
}

export function ValueTag({ store, onCreate }: ValueTagOptions) {
  return Mention.extend<MentionOptions<MenuItem, MenuItem>>({
    name: VALUE_NODE,
    priority: 200,

    addNodeView() {
      return ({ node }) => {
        const dom = document.createElement("span");
        dom.className = "value-tag";
        dom.dataset.id = node.attrs.id;
        const paint = () => {
          const value = store.get(node.attrs.id);
          dom.textContent = value?.text ?? node.attrs.label;
          dom.dataset.naming = String(value?.naming ?? false);
          dom.title = value?.name ? `${value.name.replaceAll("_", " ")} · ${value.kind}` : "";
        };
        paint();
        return { dom, destroy: store.subscribe(paint) };
      };
    },
  }).configure({
    HTMLAttributes: { class: "value-tag" },
    renderText: ({ node }) => store.get(node.attrs.id)?.text ?? node.attrs.label,
    renderHTML: ({ node, options }) => ["span", { ...options.HTMLAttributes, "data-id": node.attrs.id }, store.get(node.attrs.id)?.text ?? node.attrs.label],
    suggestion: {
      char: "@",
      allowSpaces: true,
      allowedPrefixes: [" "],
      decorationClass: "value-draft",
      placement: "bottom-start",
      offset: { mainAxis: 6, crossAxis: 0 },
      allow: ({ state, range }) => !state.doc.textBetween(range.from + 1, Math.min(range.from + 2, range.to)).startsWith(" "),
      items: ({ query }) => menuItems(store.list(), query),
      command: ({ editor, range, props: item }) => {
        const value = item.kind === "existing" ? item.value : store.add(item.text);
        const sentence = sentenceWith(editor, range, value.text, store);
        if (editor.state.selection.$to.nodeAfter?.text?.startsWith(" ")) range.to += 1;
        editor
          .chain()
          .focus()
          .insertContentAt(range, [
            { type: VALUE_NODE, attrs: { id: value.id, label: value.text, mentionSuggestionChar: "@" } },
            { type: "text", text: " " },
          ])
          .run();
        if (item.kind === "new") onCreate(value, { sentence, noteTitle: editor.state.doc.firstChild?.textContent ?? "" });
      },
      render: () => {
        let menu: ReactRenderer<MenuHandle> | undefined;
        let unmount: (() => void) | undefined;
        return {
          onStart: (props) => {
            menu = new ReactRenderer(ValueMenu, { props, editor: props.editor, className: "z-50" });
            unmount = props.mount(menu.element);
          },
          onUpdate: (props) => menu?.updateProps(props),
          onKeyDown: ({ event }) => menu?.ref?.onKeyDown(event) ?? false,
          onExit: () => {
            unmount?.();
            menu?.destroy();
            menu = undefined;
          },
        };
      },
    },
  });
}
