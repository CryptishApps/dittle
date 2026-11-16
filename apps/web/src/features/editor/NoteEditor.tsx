import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor, type Content, type Editor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { deviceModelStatus } from "@/features/ai/device-model";
import { Spotting } from "./spotting";
import { TitleDocument, TitleKeys } from "./title-body";
import { ValueCard } from "./ValueCard";
import { ValueTag } from "./value-tag";
import { describeInBackground, type ValueStore } from "./values";

type NoteEditorOptions = {
  store: ValueStore;
  content?: Content;
  label: string;
  noteId?: string;
  autofocus?: boolean;
  onUpdate?: (editor: Editor) => void;
};

export function useNoteEditor({ store, content, label, noteId, autofocus = false, onUpdate }: NoteEditorOptions): Editor | null {
  return useEditor({
    extensions: [
      TitleDocument,
      TitleKeys,
      StarterKit.configure({
        document: false,
        trailingNode: { node: "paragraph" },
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
        placeholder: ({ pos }) => (pos === 0 ? "Untitled" : "Write here. Type @ to tag a value."),
      }),
      Spotting.configure({
        find: (input) => import("@/features/ai/describe").then(({ findValues }) => findValues(input)),
        describe: (input) => import("@/features/ai/describe").then(({ describeValues }) => describeValues(input)),
        continuous: () => deviceModelStatus() === "available",
      }),
      ValueTag({ store, onCreate: (value, context) => describeInBackground(store, value, { ...context, noteId }) }),
    ],
    content,
    autofocus: autofocus && "start",
    editorProps: { attributes: { class: "note-editor", "aria-label": label } },
    onUpdate: ({ editor }) => onUpdate?.(editor),
  }, []);
}

export function NoteEditorView({ editor, store }: { editor: Editor | null; store: ValueStore }) {
  return (
    <>
      <EditorContent editor={editor} />
      {editor && <ValueCard editor={editor} store={store} />}
    </>
  );
}

export function NoteEditor(options: NoteEditorOptions) {
  return <NoteEditorView editor={useNoteEditor(options)} store={options.store} />;
}
