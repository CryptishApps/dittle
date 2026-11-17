import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor, type Content, type Editor } from "@tiptap/react";
import { useEffect, useRef } from "react";
import { StarterKit } from "@tiptap/starter-kit";
import { remembered } from "@/features/ai/cache";
import { deviceModelStatus } from "@/features/ai/device-model";
import { DESCRIBE_PROMPT_VERSION } from "@/features/ai/prompt-versions";
import { findLinks, repoint } from "./linking";
import { DescribeWhenPaused } from "./describe-when-paused";
import { Requests } from "./requests";
import { RequestPreview } from "./RequestPreview";
import { SlashCommands } from "./slash-commands";
import type { EditorServices } from "./services";
import { Spotting, type FoundValue } from "./spotting";
import { TitleDocument, TitleKeys } from "./title-body";
import { ValueCard } from "./ValueCard";
import { ValueTag } from "./value-tag";
import { describeInBackground, type TrackedValue, type ValueStore } from "./values";

const today = () => new Date().toDateString();
const TAG_DESCRIBE_PAUSE_MS = 1500;

const rememberedFind = remembered(
  `find:${DESCRIBE_PROMPT_VERSION}`,
  (input: { paragraph: string; noteTitle: string }) => import("@/features/ai/describe").then(({ findValues }) => findValues(input)),
  (input) => input.paragraph,
);

const rememberedDescribe = remembered(
  `describe:${DESCRIBE_PROMPT_VERSION}`,
  (input: { paragraph: string; noteTitle: string; quotes: string[] }) => import("@/features/ai/describe").then(({ describeValues }) => describeValues(input)),
  (input) => [input.paragraph, input.noteTitle, input.quotes, today()],
);

type NoteEditorOptions = {
  store: ValueStore;
  content?: Content;
  label: string;
  services?: EditorServices;
  autofocus?: "start" | "end" | false;
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
        placeholder: ({ pos }) => (pos === 0 ? "Untitled" : "Write here. Type / for commands."),
      }),
      Spotting.configure({
        find: rememberedFind,
        describe: rememberedDescribe,
        continuous: () => deviceModelStatus() === "available",
        link: linkFound,
        onRequests: (block, requests) => holder.current?.storage.requests.found(block, requests),
      }),
      Requests.configure({
        write: (input) => import("@/features/ai/write").then(({ writeRequest }) => writeRequest(input)),
        ignored: () => services.ignoredRequests?.() ?? [],
        onIgnore: (text) => services.ignoreRequest?.(text),
      }),
      SlashCommands,
      ValueTag({ store, onCreate: (value) => holder.current?.storage.describeWhenPaused.add(value) }),
      DescribeWhenPaused.configure({
        store,
        pauseMs: TAG_DESCRIBE_PAUSE_MS,
        describe: (value, context) => describeInBackground(store, value, { ...context, noteId }, (described) => void linkTag(described).catch(() => undefined)),
      }),
    ],
    content,
    autofocus,
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
      {editor && <RequestPreview editor={editor} />}
    </>
  );
}

export function NoteEditor(options: NoteEditorOptions) {
  return <NoteEditorView editor={useNoteEditor(options)} store={options.store} services={options.services} />;
}
