import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { NoteEditorView, useNoteEditor } from "@/features/editor/NoteEditor";
import { createSyncedValueStore } from "@/features/editor/values";
import { btnClass, MIcon } from "@/ui/kit";
import { foldersQuery, noteQuery, writes } from "./api";
import { createEditorServices } from "./editor-services";
import { fromNoteDoc, summarise, toNoteDoc, valueIdsOf, type NoteDoc } from "./note-doc";
import { MenuItem, RowMenu } from "./NoteTree";
import { showToast } from "./toast";
import { ValuePanel } from "./ValuePanel";

const SAVE_AFTER_MS = 800;

const canonical = (value: unknown): string =>
  JSON.stringify(value, (_, item: unknown) =>
    item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item,
  );

export function NotePage({ uid, noteId }: { uid: string; noteId: string }) {
  const { data: note } = useSuspenseQuery(noteQuery(uid, noteId));
  if (!note) return <MissingNote />;
  return <OpenNote uid={uid} noteId={noteId} doc={note.doc} pending={note.pending} />;
}

function OpenNote({ uid, noteId, doc, pending }: { uid: string; noteId: string; doc: NoteDoc; pending: boolean }) {
  const queryClient = useQueryClient();
  const [store] = useState(() => createSyncedValueStore(queryClient, uid, writes));
  const latest = useRef<NoteDoc>(doc);
  const [openValue, setOpenValue] = useState<{ id: string; from: "pointer" | "keyboard" }>();
  const [services] = useState(() => ({
    ...createEditorServices({ queryClient, uid, noteId, store, valuesInNote: () => valueIdsOf(latest.current) }),
    openValue: (id: string, from: "pointer" | "keyboard") => setOpenValue({ id, from }),
  }));
  const [initial] = useState(() => fromNoteDoc(doc));
  const saved = useRef(canonical(doc));
  const unsaved = useRef<NoteDoc | undefined>(undefined);
  const timer = useRef<number | undefined>(undefined);

  const flush = () => {
    window.clearTimeout(timer.current);
    const next = unsaved.current;
    if (!next) return;
    unsaved.current = undefined;
    saved.current = canonical(next);
    writes.saveNote(uid, noteId, next);
  };

  const editor = useNoteEditor({
    store,
    content: initial,
    label: "Note",
    services,
    autofocus: startAt(doc),
    onUpdate: (current) => {
      unsaved.current = toNoteDoc(current.getJSON());
      latest.current = unsaved.current;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, SAVE_AFTER_MS);
    },
  });

  useEffect(() => {
    const onHidden = () => document.visibilityState === "hidden" && flush();
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHidden);
      flush();
    };
  }, []);

  useEffect(() => {
    if (!editor || pending || unsaved.current) return;
    const incoming = canonical(doc);
    if (incoming === saved.current) return;
    saved.current = incoming;
    const { from, to } = editor.state.selection;
    editor.commands.setContent(fromNoteDoc(doc), { emitUpdate: false });
    if (!editor.isFocused) return;
    const end = editor.state.doc.content.size;
    editor.commands.setTextSelection({ from: Math.min(from, end), to: Math.min(to, end) });
  }, [editor, doc, pending]);

  return (
    <div className="flex min-h-0 flex-1">
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[760px] px-5 pb-32 sm:px-8">
          <NoteBar uid={uid} noteId={noteId} />
          <article className="pt-3 sm:pt-5">
            <NoteEditorView editor={editor} store={store} services={services} />
          </article>
        </div>
      </div>
      <AnimatePresence>
        {editor && openValue && (
          <ValuePanel
            key={openValue.id}
            uid={uid}
            noteId={noteId}
            valueId={openValue.id}
            focusOnOpen={openValue.from === "keyboard"}
            editor={editor}
            store={store}
            services={services}
            onClose={() => {
              setOpenValue(undefined);
              editor.commands.focus();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function startAt(doc: NoteDoc): "start" | "end" | false {
  const { title, preview } = summarise(doc);
  if (!title) return "start";
  return preview ? false : "end";
}

function NoteBar({ uid, noteId }: { uid: string; noteId: string }) {
  const { data: note } = useSuspenseQuery(noteQuery(uid, noteId));
  const { data: folders } = useSuspenseQuery(foldersQuery(uid));
  const folder = folders.find((item) => item.id === note?.folderId);
  const navigate = useNavigate();
  const remove = async () => {
    await navigate({ to: "/notes" });
    const undo = await writes.deleteNote(uid, noteId);
    showToast(`Deleted ${note?.title ? `"${note.title}"` : "note"}`, undo);
  };
  return (
    <nav aria-label="Breadcrumb" className="flex h-14 items-center gap-1.5 pt-4 text-[14px] text-faint sm:pt-6">
      <Link to="/notes" className="shrink-0 transition-colors hover:text-ink">
        Home
      </Link>
      {folder && (
        <>
          <MIcon name="chevron" className="size-3.5 shrink-0" />
          <span className="min-w-0 truncate">{folder.name}</span>
        </>
      )}
      <MIcon name="chevron" className="size-3.5 shrink-0" />
      <span aria-current="page" className="min-w-0 truncate text-soft">
        {note?.title || "Untitled"}
      </span>
      <span className="ml-auto">
        <RowMenu label="More actions for this note">
          <MenuItem onSelect={() => void remove()} danger>
            Delete note
          </MenuItem>
        </RowMenu>
      </span>
    </nav>
  );
}

function MissingNote() {
  return (
    <div className="grid flex-1 place-items-center px-6 text-center">
      <div>
        <p className="text-[22px] font-semibold tracking-[-0.02em]">This note doesn't exist any more.</p>
        <Link to="/notes" className={`${btnClass({ variant: "primary", size: "md" })} mt-6`}>
          Back to your notes
        </Link>
      </div>
    </div>
  );
}
