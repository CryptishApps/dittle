import { queryOptions, type FetchQueryOptions, type QueryClient, type QueryKey } from "@tanstack/react-query";
import { afterFirstPaint } from "@/lib/first-paint";
import { ensureLive, live } from "@/lib/live-query";
import { EMPTY_NOTE, summarise, type NoteDoc } from "./note-doc";
import type { CalculatedColumn, Collection, Glance, Row } from "./fact";
import type { CellPlacement, CellWrite, Folder, Note, NoteSummary, StarterSeed, StoredValue } from "./store";

export const loadStore = () => import("./store");

export const KEPT_SHAPES_VERSION = "4";

export const cachedThenLive = <T, Key extends QueryKey>(queryClient: QueryClient, options: FetchQueryOptions<T, Error, T, Key>): Promise<T> =>
  ensureLive(queryClient, options, afterFirstPaint);

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

export const collectionsQuery = (uid: string) =>
  queryOptions({
    queryKey: ["collections", uid],
    queryFn: live<Collection[], ["collections", string]>(async (next, fail) => (await loadStore()).listenCollections(uid)(next, fail)),
    ...forever,
  });

export const rowsQuery = (uid: string) =>
  queryOptions({
    queryKey: ["rows", uid],
    queryFn: live<Row[], ["rows", string]>(async (next, fail) => (await loadStore()).listenRows(uid)(next, fail)),
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
  createNote: (uid: string, folderId: string | null = null, start?: NoteDoc): string => {
    const id = crypto.randomUUID();
    later((store) => store.createNote(uid, id, folderId, start));
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
  ignoreRequest: (uid: string, id: string, text: string) => later((store) => store.ignoreRequest(uid, id, text)),
  deleteNote: async (uid: string, id: string) => (await loadStore()).deleteNote(uid, id),
  createValue: (uid: string, value: StoredValue) => later((store) => store.createValue(uid, value)),
  updateValue: (uid: string, id: string, patch: Partial<Omit<StoredValue, "id">>) => later((store) => store.updateValue(uid, id, patch)),
  deleteValue: (uid: string, id: string) => later((store) => store.deleteValue(uid, id)),
  createCollection: (uid: string, created: Omit<Collection, "createdAt">, rows: Omit<Row, "createdAt">[], cells: CellWrite[]) =>
    later((store) => store.createCollection(uid, created, rows, cells)),
  placeCell: async (uid: string, placement: CellPlacement) => (await loadStore()).placeCell(uid, placement),
  deleteCollection: (uid: string, id: string) => later((store) => store.deleteCollection(uid, id)),
  saveColumns: (uid: string, collectionId: string, columns: CalculatedColumn[]) => later((store) => store.saveColumns(uid, collectionId, columns)),
  setGlance: (uid: string, collectionId: string, glance: Glance) => later((store) => store.setGlance(uid, collectionId, glance)),
  relabelNotes: (uid: string, valueId: string, label: string, noteIds: string[]) => later((store) => void store.relabelNotes(uid, valueId, label, noteIds)),
  seedStarter: async (uid: string, seed: StarterSeed) => (await loadStore()).seedStarter(uid, seed),
};

export function startNote(queryClient: QueryClient, uid: string, folderId: string | null = null, start: NoteDoc = EMPTY_NOTE): string {
  const id = writes.createNote(uid, folderId, start);
  const query = noteQuery(uid, id);
  const seed: Note = { id, ...summarise(start), updatedAt: Date.now(), pending: true, folderId, valueIds: [], doc: start, ignoredRequests: [] };
  queryClient.setQueryData<Note | null>(query.queryKey, seed);
  void cachedThenLive(queryClient, query);
  return id;
}

let kept: { uid: string; restored: Promise<void> } | undefined;

export function keepNotesOnDevice(queryClient: QueryClient, uid: string): Promise<{ restored: boolean }> {
  if (kept?.uid !== uid) {
    kept = { uid, restored: import("@/lib/query-cache").then((cache) => cache.keepOnDevice(queryClient, { owner: uid, shapes: KEPT_SHAPES_VERSION })) };
  }
  return kept.restored.then(() => ({ restored: queryClient.getQueryData(notesQuery(uid).queryKey) !== undefined }));
}

export async function forgetNotesOnDevice(): Promise<void> {
  kept = undefined;
  await Promise.allSettled([import("@/lib/query-cache").then((cache) => cache.forgetOnDevice()), loadStore().then((store) => store.forgetThisDevice())]);
}
