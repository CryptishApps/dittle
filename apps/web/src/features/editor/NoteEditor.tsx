import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor, type Content, type Editor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { ValueTag } from "./value-tag";
import { nameInBackground, type ValueStore } from "./values";

type NoteEditorOptions = {
  store: ValueStore;
  content?: Content;
  label: string;
  autofocus?: boolean;
  onUpdate?: (editor: Editor) => void;
};

export function useNoteEditor({ store, content, label, autofocus = false, onUpdate }: NoteEditorOptions): Editor | null {
  return useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: false,
        orderedList: false,
        strike: false,
        underline: false,
      }),
      TaskList,
      TaskItem.configure({ nested: false }),
      Placeholder.configure({
        showOnlyCurrent: false,
        placeholder: ({ editor, node, pos }) => {
          if (pos === 0) return node.type.name === "heading" ? "Untitled" : "";
          return node.type.name === "paragraph" && pos === editor.state.doc.firstChild?.nodeSize ? "Write here. Type @ to tag a value." : "";
        },
      }),
      ValueTag({ store, onCreate: (value, sentence) => nameInBackground(store, value, sentence) }),
    ],
    content,
    autofocus: autofocus && "start",
    editorProps: { attributes: { class: "note-editor", "aria-label": label } },
    onUpdate: ({ editor }) => onUpdate?.(editor),
  });
}

export function NoteEditor(options: NoteEditorOptions) {
  return <EditorContent editor={useNoteEditor(options)} />;
}
