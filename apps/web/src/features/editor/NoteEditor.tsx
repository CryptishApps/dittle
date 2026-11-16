import { EditorContent, useEditor, type Content } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { ValueTag } from "./value-tag";
import { nameInBackground, type ValueStore } from "./values";

type NoteEditorProps = {
  store: ValueStore;
  content?: Content;
  label: string;
};

export function NoteEditor({ store, content, label }: NoteEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false, horizontalRule: false }),
      Placeholder.configure({ placeholder: "Write here. Type @ to tag a value." }),
      ValueTag({ store, onCreate: (value, sentence) => nameInBackground(store, value, sentence) }),
    ],
    content,
    editorProps: { attributes: { class: "note-editor", "aria-label": label } },
  });

  return <EditorContent editor={editor} />;
}
