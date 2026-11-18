import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Editor } from "@tiptap/react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { trackAllSpotted } from "@/features/editor/filing";
import { NoteEditorView, useNoteEditor } from "@/features/editor/NoteEditor";
import { spottedValues, type Spotted } from "@/features/editor/spotting";
import { createSyncedValueStore, createValueStore, describeInBackground } from "@/features/editor/values";
import { collectionsQuery, noteQuery, rowsQuery, startNote, writes } from "@/features/notes/api";
import { createEditorServices } from "@/features/notes/editor-services";
import { fromNoteDoc, noteWith, summarise, toNoteDoc, valueIdsOf } from "@/features/notes/note-doc";
import { ease } from "@/ui/kit";
import { Icon } from "./icons";
import { Heading, PRIMARY } from "./parts";
import { placeCollections, practiceExample, shelfOf, whereFrom, type Where } from "./practice";
import type { Recipe } from "./recipes";

const TITLE = "My day";

type Props = { uid: string; recipes: Recipe[]; today: Date; onDone: (noteId?: string) => void };

function useSpotted(editor: Editor | null): Spotted[] {
  const [spotted, setSpotted] = useState<Spotted[]>([]);
  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const bodyStart = editor.state.doc.firstChild?.nodeSize ?? 0;
      setSpotted(spottedValues(editor.state).filter((item) => item.from >= bodyStart));
    };
    update();
    editor.on("transaction", update);
    return () => void editor.off("transaction", update);
  }, [editor]);
  return spotted;
}

const keyOf = ({ value }: Spotted) => `${value.quote}\u0000${value.kind}`;

export default function PracticeStep({ uid, recipes, today, onDone }: Props) {
  const queryClient = useQueryClient();
  const still = useReducedMotion() ?? false;
  const [store] = useState(() => createValueStore());
  const [initial] = useState(() => fromNoteDoc(noteWith(TITLE)));
  const example = useMemo(() => practiceExample(recipes), [recipes]);
  const editor = useNoteEditor({ store, content: initial, label: "Practice note", autofocus: "end", placeholder: example });
  const spotted = useSpotted(editor);
  const collections = useQuery(collectionsQuery(uid)).data;
  const rows = useQuery(rowsQuery(uid)).data;
  const shelf = useMemo(() => shelfOf(collections ?? [], rows ?? []), [collections, rows]);
  const [wheres, setWheres] = useState<ReadonlyMap<string, Where>>(new Map());
  const asked = useRef(new Set<string>());
  const [typing, setTyping] = useState(false);
  const [empty, setEmpty] = useState(true);
  const [keeping, setKeeping] = useState(false);

  useEffect(() => {
    if (!editor) return;
    const check = () => {
      const { doc } = editor.state;
      setEmpty(!doc.textBetween(doc.firstChild?.nodeSize ?? 0, doc.content.size, " ").trim());
    };
    check();
    editor.on("update", check);
    return () => void editor.off("update", check);
  }, [editor]);

  useEffect(() => {
    if (shelf.collections.length === 0) return;
    for (const item of spotted) {
      const key = keyOf(item);
      if (!item.value.described || asked.current.has(key)) continue;
      asked.current.add(key);
      const { value, sentence } = item;
      void import("@/features/ai/place")
        .then(({ placeValue }) => placeValue({ sentence, item: { text: value.quote, kind: value.kind, name: value.name, about: value.about }, collections: placeCollections(shelf) }))
        .then(
          (answer) => whereFrom(answer, shelf, value, today),
          (): Where => ({ at: "note" }),
        )
        .then((where) => setWheres((current) => new Map(current).set(key, where)));
    }
  }, [spotted, shelf, today]);

  const typeExample = () => {
    if (!editor || typing) return;
    editor.chain().focus("end").run();
    if (still) {
      editor.chain().insertContent(example).run();
      return;
    }
    setTyping(true);
    const words = example.split(" ").map((word, at, all) => (at < all.length - 1 ? `${word} ` : word));
    let index = 0;
    const next = () => {
      if (editor.isDestroyed) return;
      editor.chain().insertContent(words[index]!).run();
      index += 1;
      if (index < words.length) window.setTimeout(next, 90);
      else setTyping(false);
    };
    next();
  };

  const keep = () => {
    if (!editor || keeping) return;
    setKeeping(true);
    const noteId = startNote(queryClient, uid, null, noteWith(TITLE));
    const added = trackAllSpotted(editor, store, noteId);
    const doc = toNoteDoc(editor.getJSON());
    for (const { naming, ...value } of store.list()) writes.createValue(uid, { ...value, origin: { sentence: value.text, ...value.origin, noteId } });
    queryClient.setQueryData(noteQuery(uid, noteId).queryKey, (current) => (current ? { ...current, ...summarise(doc), doc, valueIds: valueIdsOf(doc) } : current));
    writes.saveNote(uid, noteId, doc);
    const synced = createSyncedValueStore(queryClient, uid, writes);
    const services = createEditorServices({ queryClient, uid, noteId, store: synced, valuesInNote: () => valueIdsOf(doc) });
    for (const value of added) {
      if (value.subject || value.event !== undefined) services.onNewFact?.(value);
      else describeInBackground(synced, value, { sentence: value.origin?.sentence ?? value.text, noteTitle: TITLE, noteId }, services.onNewFact);
    }
    onDone(noteId);
  };

  const filed = spotted.filter((item) => wheres.get(keyOf(item))?.at === "collection").length;

  return (
    <div className="mx-auto max-w-[680px] px-5 pt-14 pb-24 sm:pt-20">
      <Heading
        eyebrow={
          <>
            <Icon name="sparkle" className="size-4" />
            Last step · just a test
          </>
        }
        title="Now tell Dittle about your day."
        sub="Write it the way you'd text a friend. Values light up as you type. Nothing here is saved unless you keep it."
      />
      <div className="mt-7 rounded-2xl border border-line bg-page px-5 pt-4 pb-5 transition-colors focus-within:border-line-strong sm:px-6 [&_.note-editor]:min-h-[132px] [&_.note-editor_h1]:text-[15px]! [&_.note-editor_h1]:font-medium! [&_.note-editor_h1]:tracking-normal! [&_.note-editor_h1]:text-faint [&_.note-editor_h1+*]:mt-2!">
        <NoteEditorView editor={editor} store={store} />
      </div>
      <div className="mt-2.5 flex min-h-6 flex-wrap items-center gap-x-1.5 text-[13.5px] text-faint">
        {empty ? (
          <>
            <span>Stuck?</span>
            <button type="button" onClick={typeExample} className="text-soft underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink hover:decoration-ink">
              Write the example for me
            </button>
          </>
        ) : spotted.length === 0 ? (
          <span>Keep going. Dittle looks for amounts, times, days, people and places.</span>
        ) : (
          <span>
            Found {spotted.length} {spotted.length === 1 ? "value" : "values"}
            {filed > 0 && `, ${filed} with a place to go`}
          </span>
        )}
      </div>

      <section aria-label="What Dittle found" aria-live="polite" className="mt-7">
        <ul>
          <AnimatePresence initial={false}>
            {spotted.map((item) => (
              <m.li
                key={item.value.id}
                layout="position"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease }}
                className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-4 gap-y-0.5 border-b border-line py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
              >
                <span className="rounded-[5px] bg-accent-tint px-1.5 text-[15px] text-accent-ink tabular-nums">{item.value.quote}</span>
                <span className="truncate text-[13.5px] text-faint">{[item.value.about, item.value.kind].filter(Boolean).join(" · ")}</span>
                <span className="col-span-2 text-[14px] sm:col-span-1 sm:text-right">
                  <Destination where={wheres.get(keyOf(item))} reading={!item.value.described} none={shelf.collections.length === 0} />
                </span>
              </m.li>
            ))}
          </AnimatePresence>
        </ul>
      </section>

      <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3">
        <button type="button" onClick={() => onDone()} disabled={keeping} className={PRIMARY}>
          Got it, clear this
        </button>
        <button type="button" onClick={keep} disabled={keeping || empty} className="text-[15px] text-soft underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink hover:decoration-ink disabled:opacity-40 disabled:no-underline">
          Keep it as a note
        </button>
      </div>
      <p className="mt-3 text-[13.5px] text-faint">Clearing it leaves nothing behind. Keeping it saves the note and files what it found.</p>
    </div>
  );
}

function Destination({ where, reading, none }: { where?: Where; reading: boolean; none: boolean }) {
  if (!where && (reading || !none)) {
    const text = reading ? "Reading" : "Finding its place";
    return (
      <span className="t-shimmer-text text-faint" data-text={text}>
        {text}
      </span>
    );
  }
  if (!where || where.at === "note") return <span className="text-faint">Stays in this note</span>;
  const target = [where.collection, where.row, where.field].filter(Boolean).join(" · ");
  return (
    <span className="inline-flex items-center gap-1.5 text-ink">
      <Icon name="table" className="size-3.5 text-faint" />
      {where.sure ? target : `Asks before adding to ${where.collection}`}
    </span>
  );
}
