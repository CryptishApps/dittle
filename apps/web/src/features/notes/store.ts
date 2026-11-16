import {
  clearIndexedDbPersistence,
  collection,
  deleteDoc,
  doc,
  getDocFromCache,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  terminate,
  updateDoc,
  writeBatch,
  type DocumentData,
  type DocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firestore";
import type { Listen } from "@/lib/live-query";
import type { StoredValue } from "./fact";
import { EMPTY_NOTE, summarise, type NoteDoc } from "./note-doc";

export type NoteSummary = { id: string; title: string; preview: string; updatedAt: number; pending: boolean; folderId: string | null };
export type Folder = { id: string; name: string; createdAt: number };
export type Note = NoteSummary & { doc: NoteDoc };
export type { StoredValue } from "./fact";

const notes = (uid: string) => collection(db, "users", uid, "notes");
const values = (uid: string) => collection(db, "users", uid, "values");
const folders = (uid: string) => collection(db, "users", uid, "folders");

const write = (pending: Promise<void>) => void pending.catch((error: unknown) => console.error("Dittle could not save", error));

const millis = (value: unknown) => (value as Timestamp | null)?.toMillis?.() ?? Date.now();

function summary(snapshot: DocumentSnapshot<DocumentData>): NoteSummary {
  const data = snapshot.data({ serverTimestamps: "estimate" }) ?? {};
  return {
    id: snapshot.id,
    title: String(data.title ?? ""),
    preview: String(data.preview ?? ""),
    updatedAt: millis(data.updatedAt),
    pending: snapshot.metadata.hasPendingWrites,
    folderId: typeof data.folderId === "string" ? data.folderId : null,
  };
}

export const listenNotes =
  (uid: string): Listen<NoteSummary[]> =>
  async (next, fail) =>
    onSnapshot(query(notes(uid), orderBy("updatedAt", "desc")), (snapshot) => next(snapshot.docs.map(summary)), fail);

export const listenNote =
  (uid: string, id: string): Listen<Note | null> =>
  async (next, fail) =>
    onSnapshot(
      doc(notes(uid), id),
      { includeMetadataChanges: true },
      (snapshot) => next(snapshot.exists() ? { ...summary(snapshot), doc: (snapshot.data().doc as NoteDoc | undefined) ?? EMPTY_NOTE } : null),
      fail,
    );

export const listenValues =
  (uid: string): Listen<StoredValue[]> =>
  async (next, fail) =>
    onSnapshot(values(uid), (snapshot) => next(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as StoredValue)), fail);

export const listenFolders =
  (uid: string): Listen<Folder[]> =>
  async (next, fail) =>
    onSnapshot(
      folders(uid),
      (snapshot) =>
        next(
          snapshot.docs
            .map((item) => {
              const data = item.data({ serverTimestamps: "estimate" });
              return { id: item.id, name: String(data.name ?? ""), createdAt: millis(data.createdAt) };
            })
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true })),
        ),
      fail,
    );

export function createNote(uid: string, id: string, folderId: string | null = null): void {
  write(
    setDoc(doc(notes(uid), id), {
      schemaVersion: 1,
      doc: EMPTY_NOTE,
      ...summarise(EMPTY_NOTE),
      folderId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
}

export function moveNote(uid: string, id: string, folderId: string | null): void {
  write(updateDoc(doc(notes(uid), id), { folderId }));
}

export function createFolder(uid: string, id: string, name: string): void {
  write(setDoc(doc(folders(uid), id), { name, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
}

export function renameFolder(uid: string, id: string, name: string): void {
  write(updateDoc(doc(folders(uid), id), { name, updatedAt: serverTimestamp() }));
}

export function deleteFolder(uid: string, folder: Folder, noteIds: string[]): () => void {
  const batch = writeBatch(db);
  batch.delete(doc(folders(uid), folder.id));
  noteIds.forEach((noteId) => batch.update(doc(notes(uid), noteId), { folderId: null }));
  write(batch.commit());
  return () => {
    const undo = writeBatch(db);
    undo.set(doc(folders(uid), folder.id), { name: folder.name, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    noteIds.forEach((noteId) => undo.update(doc(notes(uid), noteId), { folderId: folder.id }));
    write(undo.commit());
  };
}

export function saveNote(uid: string, id: string, note: NoteDoc): void {
  write(updateDoc(doc(notes(uid), id), { schemaVersion: 1, doc: note, ...summarise(note), updatedAt: serverTimestamp() }));
}

export async function deleteNote(uid: string, id: string): Promise<() => void> {
  const ref = doc(notes(uid), id);
  const kept = await getDocFromCache(ref).then(
    (snapshot) => snapshot.data(),
    () => undefined,
  );
  write(deleteDoc(ref));
  return () => {
    if (kept) write(setDoc(ref, { ...kept, updatedAt: serverTimestamp() }));
  };
}

export function createValue(uid: string, value: StoredValue): void {
  const { id, ...fields } = value;
  write(setDoc(doc(values(uid), id), { ...fields, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
}

export function updateValue(uid: string, id: string, patch: Partial<Omit<StoredValue, "id">>): void {
  write(updateDoc(doc(values(uid), id), { ...patch, updatedAt: serverTimestamp() }));
}

export async function forgetThisDevice(): Promise<void> {
  await terminate(db);
  await clearIndexedDbPersistence(db);
}
