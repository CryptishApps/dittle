import { Extension } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { Document } from "@tiptap/extension-document";

export const TitleDocument = Document.extend({ content: "heading block+" });

export const TitleKeys = Extension.create({
  name: "titleKeys",
  priority: 150,

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { doc, selection } = editor.state;
        if (selection.$from.index(0) !== 0) return false;
        const bodyStart = doc.child(0).nodeSize;
        const first = doc.child(1);
        if (first.type.name === "paragraph" && first.content.size === 0) return editor.commands.setTextSelection(bodyStart + 1);
        return editor.chain().insertContentAt(bodyStart, { type: "paragraph" }).setTextSelection(bodyStart + 1).run();
      },
      Tab: ({ editor }) => {
        const { doc, selection } = editor.state;
        if (selection.$from.index(0) !== 0) return false;
        const target = TextSelection.findFrom(doc.resolve(doc.child(0).nodeSize), 1, true);
        return target ? editor.chain().setTextSelection(target.from).scrollIntoView().run() : editor.commands.focus("end");
      },
      Backspace: ({ editor }) => {
        const { doc, selection } = editor.state;
        const { $from, empty } = selection;
        if (!empty || $from.depth !== 1 || $from.index(0) !== 1 || $from.parentOffset !== 0) return false;
        const titleEnd = doc.child(0).nodeSize - 1;
        if ($from.parent.content.size === 0 && doc.childCount > 2) {
          return editor.chain().deleteRange({ from: $from.before(), to: $from.after() }).setTextSelection(titleEnd).run();
        }
        return editor.commands.setTextSelection(titleEnd);
      },
    };
  },
});
