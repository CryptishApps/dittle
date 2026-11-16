import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { live } from "@/lib/live-query";
import { EMPTY_NOTE, type NoteDoc } from "./note-doc";
import type { Folder, Note, NoteSummary, StoredValue } from "./store";

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

export const foldersQuery = (uid: string) =>
  queryOptions({
    queryKey: ["folders", uid],
    queryFn: live<Folder[], ["folders", string]>(async (next, fail) => (await loadStore()).listenFolders(uid)(next, fail)),
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
  createNote: (uid: string, folderId: string | null = null): string => {
    const id = crypto.randomUUID();
    later((store) => store.createNote(uid, id, folderId));
    return id;
  },
  moveNote: (uid: string, id: string, folderId: string | null) => later((store) => store.moveNote(uid, id, folderId)),
  createFolder: (uid: string, name: string): string => {
    const id = crypto.randomUUID();
    later((store) => store.createFolder(uid, id, name));
    return id;
  },
  renameFolder: (uid: string, id: string, name: string) => later((store) => store.renameFolder(uid, id, name)),
  deleteFolder: async (uid: string, folder: Folder, noteIds: string[]) => (await loadStore()).deleteFolder(uid, folder, noteIds),
  saveNote: (uid: string, id: string, note: NoteDoc) => later((store) => store.saveNote(uid, id, note)),
  deleteNote: async (uid: string, id: string) => (await loadStore()).deleteNote(uid, id),
  createValue: (uid: string, value: StoredValue) => later((store) => store.createValue(uid, value)),
  updateValue: (uid: string, id: string, patch: Partial<Omit<StoredValue, "id">>) => later((store) => store.updateValue(uid, id, patch)),
  deleteValue: (uid: string, id: string) => later((store) => store.deleteValue(uid, id)),
  relabelNotes: (uid: string, valueId: string, label: string, noteIds: string[]) => later((store) => void store.relabelNotes(uid, valueId, label, noteIds)),
};

export function startNote(queryClient: QueryClient, uid: string, folderId: string | null = null): string {
  const id = writes.createNote(uid, folderId);
  const query = noteQuery(uid, id);
  const seed: Note = { id, title: "", preview: "", updatedAt: Date.now(), pending: true, folderId, valueIds: [], doc: EMPTY_NOTE };
  queryClient.setQueryData<Note | null>(query.queryKey, seed);
  void queryClient.prefetchQuery({ ...query, staleTime: 0 });
  return id;
}
