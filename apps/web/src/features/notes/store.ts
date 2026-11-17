import {
  arrayUnion,
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
import type { Collection, Row, StoredValue } from "./fact";
import { EMPTY_NOTE, relabel, summarise, valueIdsOf, type NoteDoc } from "./note-doc";

export type NoteSummary = { id: string; title: string; preview: string; updatedAt: number; pending: boolean; folderId: string | null; valueIds: string[] };
export type Folder = { id: string; name: string; createdAt: number };
export type Note = NoteSummary & { doc: NoteDoc; ignoredRequests: string[] };
export type { StoredValue } from "./fact";

const notes = (uid: string) => collection(db, "users", uid, "notes");
const values = (uid: string) => collection(db, "users", uid, "values");
const folders = (uid: string) => collection(db, "users", uid, "folders");
const collectionsOf = (uid: string) => collection(db, "users", uid, "collections");
const rowsOf = (uid: string) => collection(db, "users", uid, "entities");

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
    valueIds: Array.isArray(data.valueIds) ? data.valueIds.filter((item): item is string => typeof item === "string") : [],
  };
}

function note(snapshot: DocumentSnapshot<DocumentData>): Note {
  const data = snapshot.data() ?? {};
  const ignored: unknown = data.ignoredRequests;
  return {
    ...summary(snapshot),
    doc: (data.doc as NoteDoc | undefined) ?? EMPTY_NOTE,
    ignoredRequests: Array.isArray(ignored) ? ignored.filter((item): item is string => typeof item === "string") : [],
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
      (snapshot) => next(snapshot.exists() ? note(snapshot) : null),
      fail,
    );

export const listenValues =
  (uid: string): Listen<StoredValue[]> =>
  async (next, fail) =>
    onSnapshot(
      values(uid),
      (snapshot) =>
        next(
          snapshot.docs.map((item) => {
            const { createdAt: _created, updatedAt, ...data } = item.data({ serverTimestamps: "estimate" });
            return { ...data, text: String(data.text ?? ""), id: item.id, updatedAt: millis(updatedAt) } as StoredValue;
          }),
        ),
      fail,
    );

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

export function createNote(uid: string, id: string, folderId: string | null = null, start: NoteDoc = EMPTY_NOTE): void {
  write(
    setDoc(doc(notes(uid), id), {
      schemaVersion: 1,
      doc: start,
      ...summarise(start),
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
  write(updateDoc(doc(notes(uid), id), { schemaVersion: 1, doc: note, ...summarise(note), valueIds: valueIdsOf(note), updatedAt: serverTimestamp() }));
}

export function ignoreRequest(uid: string, id: string, text: string): void {
  write(updateDoc(doc(notes(uid), id), { ignoredRequests: arrayUnion(text) }));
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

export function deleteValue(uid: string, id: string): void {
  write(deleteDoc(doc(values(uid), id)));
}

export function updateValue(uid: string, id: string, patch: Partial<Omit<StoredValue, "id">>): void {
  write(updateDoc(doc(values(uid), id), { ...patch, updatedAt: serverTimestamp() }));
}

export async function forgetThisDevice(): Promise<void> {
  await terminate(db);
  await clearIndexedDbPersistence(db);
}

export async function relabelNotes(uid: string, valueId: string, label: string, noteIds: string[]): Promise<void> {
  for (const id of noteIds) {
    const snapshot = await getDocFromCache(doc(notes(uid), id)).catch(() => undefined);
    const stored = snapshot?.data()?.doc as NoteDoc | undefined;
    if (stored) saveNote(uid, id, relabel(stored, valueId, label));
  }
}

export const listenCollections =
  (uid: string): Listen<Collection[]> =>
  async (next, fail) =>
    onSnapshot(
      collectionsOf(uid),
      (snapshot) =>
        next(
          snapshot.docs
            .map((item) => {
              const data = item.data({ serverTimestamps: "estimate" });
              return { ...(data as Omit<Collection, "id" | "createdAt">), id: item.id, createdAt: millis(data.createdAt) };
            })
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
        ),
      fail,
    );

export const listenRows =
  (uid: string): Listen<Row[]> =>
  async (next, fail) =>
    onSnapshot(
      rowsOf(uid),
      (snapshot) =>
        next(
          snapshot.docs.map((item) => {
            const data = item.data({ serverTimestamps: "estimate" });
            return { ...(data as Omit<Row, "id" | "createdAt">), id: item.id, createdAt: millis(data.createdAt) };
          }),
        ),
      fail,
    );

export type CellWrite = { valueId: string; rowId: string; fieldId: string };

export function createCollection(uid: string, created: Omit<Collection, "createdAt">, rows: Omit<Row, "createdAt">[], cells: CellWrite[]): void {
  const batch = writeBatch(db);
  const { id, ...fields } = created;
  batch.set(doc(collectionsOf(uid), id), { ...fields, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  rows.forEach(({ id: rowId, ...row }) => batch.set(doc(rowsOf(uid), rowId), { ...row, createdAt: serverTimestamp() }, { merge: true }));
  cells.forEach((cell) => batch.update(doc(values(uid), cell.valueId), { "subject.entityId": cell.rowId, field: cell.fieldId, updatedAt: serverTimestamp() }));
  write(batch.commit());
}

export function placeCell(uid: string, row: Omit<Row, "createdAt">, cell: CellWrite): () => void {
  const batch = writeBatch(db);
  const { id: rowId, ...rest } = row;
  batch.set(doc(rowsOf(uid), rowId), { ...rest, createdAt: serverTimestamp() }, { merge: true });
  batch.update(doc(values(uid), cell.valueId), { "subject.entityId": cell.rowId, field: cell.fieldId, updatedAt: serverTimestamp() });
  write(batch.commit());
  return () => {
    const undo = writeBatch(db);
    undo.update(doc(values(uid), cell.valueId), { "subject.entityId": null, field: null, updatedAt: serverTimestamp() });
    write(undo.commit());
  };
}

export function deleteCollection(uid: string, id: string): void {
  write(deleteDoc(doc(collectionsOf(uid), id)));
}
