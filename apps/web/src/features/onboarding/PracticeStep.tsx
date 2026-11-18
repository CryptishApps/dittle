import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Editor } from "@tiptap/react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { trackedTextOf } from "@/features/collections/logic";
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
import { placeCollections, practiceExample, sentenceIndex, shelfOf, whereFrom, withDays, type Where } from "./practice";
import type { Recipe } from "./recipes";

const TITLE = "My day";

type Props = { uid: string; recipes: Recipe[]; today: Date; onDone: (noteId?: string) => void };

type Found = Spotted & { group: string };

function useSpotted(editor: Editor | null): Found[] {
  const [spotted, setSpotted] = useState<Found[]>([]);
  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const { doc } = editor.state;
      const bodyStart = doc.firstChild?.nodeSize ?? 0;
      setSpotted(
        spottedValues(editor.state)
          .filter((item) => item.from >= bodyStart)
          .map((item) => {
            const at = doc.resolve(item.from);
            return { ...item, group: `${at.before()}:${sentenceIndex(item.sentence, at.parentOffset)}` };
          }),
      );
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
  const tracked = useRef<string[]>([]);
  const editor = useNoteEditor({ store, content: initial, label: "Practice note", autofocus: "end", placeholder: example, services: { trackedText: () => tracked.current } });
  const spotted = useSpotted(editor);
  const collections = useQuery(collectionsQuery(uid)).data;
  const rows = useQuery(rowsQuery(uid)).data;
  const shelf = useMemo(() => shelfOf(collections ?? [], rows ?? []), [collections, rows]);
  tracked.current = trackedTextOf(shelf.collections);
  const [wheres, setWheres] = useState<ReadonlyMap<string, Where>>(new Map());
  const asked = useRef(new Set<string>());
  const [empty, setEmpty] = useState(true);
  const [keeping, setKeeping] = useState(false);
  const [exampled, setExampled] = useState(false);

  useEffect(() => {
    if (!editor) return;
    const check = () => {
      const { doc } = editor.state;
      const blank = !doc.textBetween(doc.firstChild?.nodeSize ?? 0, doc.content.size, " ").trim();
      setEmpty(blank);
      if (blank) setExampled(false);
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

  const writeExample = () => {
    if (!editor) return;
    editor.chain().focus("end").insertContent(example).run();
    setExampled(true);
    if (still) return;
    const added = Array.from(editor.view.dom.children).slice(1);
    for (const element of added) element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
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

  const placed = withDays(spotted.map((item) => ({ group: item.group, where: wheres.get(keyOf(item)) })));
  const filed = placed.filter((where) => where?.at === "collection").length;
  const fade = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: still ? 0 : 0.2, ease } };
  const status = empty ? "empty" : spotted.length > 0 ? "found" : exampled ? "reading" : "looking";

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
      <div className="mt-2.5 grid min-h-6 text-[13.5px] text-faint">
        <AnimatePresence initial={false}>
          <m.p key={status} {...fade} className="col-start-1 row-start-1 flex flex-wrap items-center gap-x-1.5">
            {status === "empty" ? (
              <>
                <span>Stuck?</span>
                <button type="button" onClick={writeExample} className="text-soft underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink hover:decoration-ink">
                  Write the example for me
                </button>
              </>
            ) : status === "reading" ? (
              <span className="t-shimmer-text" data-text="Reading what you wrote">
                Reading what you wrote
              </span>
            ) : status === "looking" ? (
              <span>Keep going. Dittle looks for amounts, times, days, people and places{tracked.current.length > 0 ? ", and what your collections track" : ""}.</span>
            ) : (
              <span className="tabular-nums">
                Found {spotted.length} {spotted.length === 1 ? "value" : "values"}
                {filed > 0 && `, ${filed} with a place to go`}
              </span>
            )}
          </m.p>
        </AnimatePresence>
      </div>

      <section aria-label="What Dittle found" aria-live="polite" className="mt-7">
        <ul>
          <AnimatePresence initial={false}>
            {spotted.map((item, index) => (
              <m.li
                key={item.value.id}
                layout={still ? false : "position"}
                initial={{ opacity: 0, height: still ? "auto" : 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: still ? "auto" : 0 }}
                transition={{ duration: still ? 0 : 0.32, ease, opacity: { duration: still ? 0 : 0.24, ease } }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-0.5 border-b border-line py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
                  <span className="rounded-[5px] bg-accent-tint px-1.5 text-[15px] text-accent-ink tabular-nums">{item.value.quote}</span>
                  <Swap text={[item.value.about, item.value.kind].filter(Boolean).join(" · ")} still={still} className="text-[13.5px] text-faint" />
                  <span className="col-span-2 text-[14px] sm:col-span-1 sm:text-right">
                    <Destination where={placed[index]} reading={!item.value.described} none={shelf.collections.length === 0} still={still} />
                  </span>
                </div>
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

function Swap({ text, still, className = "", children }: { text: string; still: boolean; className?: string; children?: ReactNode }) {
  return (
    <span className={`grid min-w-0 ${className}`}>
      <AnimatePresence initial={false}>
        <m.span
          key={text}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: still ? 0 : 0.24, ease }}
          className="col-start-1 row-start-1 min-w-0 truncate"
        >
          {children ?? text}
        </m.span>
      </AnimatePresence>
    </span>
  );
}

function destinationOf(where: Where | undefined, reading: boolean, none: boolean): { text: string; waiting?: true; placed?: true } {
  if (!where && (reading || !none)) return { text: reading ? "Reading" : "Finding its place", waiting: true };
  if (!where || where.at === "note") return { text: "Stays in this note" };
  if (!where.sure) return { text: `Asks before adding to ${where.collection}`, placed: true };
  if (where.day) return { text: where.row ? `${where.collection} · ${where.row} · the day` : `Sets the day in ${where.collection}`, placed: true };
  return { text: [where.collection, where.row, where.field].filter(Boolean).join(" · "), placed: true };
}

function Destination({ where, reading, none, still }: { where?: Where; reading: boolean; none: boolean; still: boolean }) {
  const { text, waiting, placed } = destinationOf(where, reading, none);
  return (
    <Swap text={text} still={still}>
      {waiting ? (
        <span className="t-shimmer-text text-faint" data-text={text}>
          {text}
        </span>
      ) : placed ? (
        <span className="flex min-w-0 items-center gap-1.5 text-ink sm:justify-end">
          <Icon name="table" className="size-3.5 shrink-0 text-faint" />
          {text}
        </span>
      ) : (
        <span className="text-faint">{text}</span>
      )}
    </Swap>
  );
}
