import { queryOptions } from "@tanstack/react-query";
import { live } from "@/lib/live-query";
import type { NoteDoc } from "./note-doc";
import type { Note, NoteSummary, StoredValue } from "./store";

export const loadStore = () => import("./store");

const forever = { staleTime: Number.POSITIVE_INFINITY, gcTime: 5 * 60_000 } as const;

export const notesQuery = (uid: string) =>
  queryOptions({
    queryKey: ["notes", uid],
    queryFn: live<NoteSummary[], ["notes", string]>(async (next, fail) => (await loadStore()).listenNotes(uid)(next, fail)),
    ...forever,
  });

export const noteQuery = (uid: string, id: string) =>
  queryOptions({
    queryKey: ["note", uid, id],
    queryFn: live<Note | null, ["note", string, string]>(async (next, fail) => (await loadStore()).listenNote(uid, id)(next, fail)),
    ...forever,
  });

export const valuesQuery = (uid: string) =>
  queryOptions({
    queryKey: ["values", uid],
    queryFn: live<StoredValue[], ["values", string]>(async (next, fail) => (await loadStore()).listenValues(uid)(next, fail)),
    ...forever,
  });

const later = (run: (store: Awaited<ReturnType<typeof loadStore>>) => void) => void loadStore().then(run);

export const writes = {
  createNote: (uid: string): string => {
    const id = crypto.randomUUID();
    later((store) => store.createNote(uid, id));
    return id;
  },
  saveNote: (uid: string, id: string, note: NoteDoc) => later((store) => store.saveNote(uid, id, note)),
  deleteNote: (uid: string, id: string) => later((store) => store.deleteNote(uid, id)),
  createValue: (uid: string, value: StoredValue) => later((store) => store.createValue(uid, value)),
  updateValue: (uid: string, id: string, patch: Partial<Omit<StoredValue, "id">>) => later((store) => store.updateValue(uid, id, patch)),
};
