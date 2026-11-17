import { Mention, type MentionOptions } from "@tiptap/extension-mention";
import { renderMenu } from "./suggestion-menu";
import { menuItems, ValueMenu, type MenuItem } from "./ValueMenu";
import { VALUE_NODE } from "./value-node";
import type { TrackedValue, ValueStore } from "./values";

type ValueTagOptions = {
  store: ValueStore;
  onCreate: (value: TrackedValue) => void;
};

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
          dom.dataset.proposal = String(Boolean(value?.proposal));
          dom.dataset.derived = String(Boolean(value?.formula));
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
        if (editor.state.selection.$to.nodeAfter?.text?.startsWith(" ")) range.to += 1;
        editor
          .chain()
          .focus()
          .insertContentAt(range, [
            { type: VALUE_NODE, attrs: { id: value.id, label: value.text, mentionSuggestionChar: "@" } },
            { type: "text", text: " " },
          ])
          .run();
        if (item.kind === "new") onCreate(value);
      },
      render: renderMenu(ValueMenu),
    },
  });
}
