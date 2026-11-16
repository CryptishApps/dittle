import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { EditorContent } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import { useNoteEditor } from "@/features/editor/NoteEditor";
import { createSyncedValueStore } from "@/features/editor/values";
import { MIcon } from "@/ui/kit";
import { noteQuery, writes } from "./api";
import { fromNoteDoc, summarise, toNoteDoc, type NoteDoc } from "./note-doc";

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
    autofocus: summarise(doc).title === "",
    onUpdate: (current) => {
      unsaved.current = toNoteDoc(current.getJSON());
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
    if (!editor || pending || unsaved.current || editor.isFocused) return;
    const incoming = canonical(doc);
    if (incoming === saved.current) return;
    saved.current = incoming;
    editor.commands.setContent(fromNoteDoc(doc), { emitUpdate: false });
  }, [editor, doc, pending]);

  return (
    <>
      <NoteBar />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[680px] px-6 pt-10 pb-32 sm:px-10">
          <EditorContent editor={editor} />
        </div>
      </div>
    </>
  );
}

function NoteBar() {
  return (
    <div className="flex h-12 shrink-0 items-center border-b border-line px-4 text-[11px] tracking-[0.04em] uppercase md:hidden">
      <Link to="/notes" className="inline-flex items-center gap-1.5 text-soft hover:text-ink">
        <MIcon name="left" className="size-3.5" />
        Notes
      </Link>
    </div>
  );
}

function MissingNote() {
  return (
    <div className="grid flex-1 place-items-center px-6 text-center">
      <div>
        <p className="text-[13px] text-soft">This note doesn't exist any more.</p>
        <Link to="/notes" className="mt-4 inline-block text-[12px] text-ink underline underline-offset-4">
          Back to your notes
        </Link>
      </div>
    </div>
  );
}
