import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor, type Content, type Editor } from "@tiptap/react";
import { useEffect, useRef } from "react";
import { StarterKit } from "@tiptap/starter-kit";
import { deviceModelStatus } from "@/features/ai/device-model";
import { findLinks, repoint } from "./linking";
import type { EditorServices } from "./services";
import { Spotting, type FoundValue } from "./spotting";
import { TitleDocument, TitleKeys } from "./title-body";
import { ValueCard } from "./ValueCard";
import { ValueTag } from "./value-tag";
import { describeInBackground, type TrackedValue, type ValueStore } from "./values";

type NoteEditorOptions = {
  store: ValueStore;
  content?: Content;
  label: string;
  services?: EditorServices;
  autofocus?: boolean;
  onUpdate?: (editor: Editor) => void;
};

export function useNoteEditor({ store, content, label, services = {}, autofocus = false, onUpdate }: NoteEditorOptions): Editor | null {
  const { noteId, noteTitleOf = () => undefined } = services;
  const holder = useRef<Editor | null>(null);

  const linkFound = (sentence: string, found: FoundValue[]) =>
    findLinks({
      sentence,
      probes: found.map((value) => ({ text: value.quote, kind: value.kind, name: value.name, about: value.about, conditions: value.conditions, remarks: value.remarks, when: value.when, event: value.event })),
      values: store.list(),
      noteId,
      noteTitle: noteTitleOf,
    });

  const linkTag = async (value: TrackedValue) => {
    const [target] = await findLinks({
      sentence: value.origin?.sentence ?? value.text,
      probes: [{ ...value, about: value.subject?.label }],
      values: store.list(),
      noteId,
      noteTitle: noteTitleOf,
    });
    const editor = holder.current;
    if (!target) return services.onNewFact?.(value);
    if (!editor || editor.isDestroyed) return;
    if (target.changed) return store.update(value.id, { proposal: { factId: target.factId } });
    repoint(editor, value.id, target.factId, store.get(target.factId)?.text ?? value.text);
    store.remove(value.id);
  };

  const editor = useEditor({
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
        link: linkFound,
      }),
      ValueTag({ store, onCreate: (value, context) => describeInBackground(store, value, { ...context, noteId }, (described) => void linkTag(described).catch(() => undefined)) }),
    ],
    content,
    autofocus: autofocus && "start",
    editorProps: { attributes: { class: "note-editor", "aria-label": label } },
    onUpdate: ({ editor }) => onUpdate?.(editor),
  }, []);
  useEffect(() => {
    holder.current = editor;
  }, [editor]);
  return editor;
}

type NoteEditorViewProps = { editor: Editor | null; store: ValueStore; services?: EditorServices };

export function NoteEditorView({ editor, store, services }: NoteEditorViewProps) {
  return (
    <>
      <EditorContent editor={editor} />
      {editor && <ValueCard editor={editor} store={store} services={services} />}
    </>
  );
}

export function NoteEditor(options: NoteEditorOptions) {
  return <NoteEditorView editor={useNoteEditor(options)} store={options.store} services={options.services} />;
}
