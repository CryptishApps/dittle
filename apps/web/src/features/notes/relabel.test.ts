import { describe, expect, mock, test } from "bun:test";
import type { NoteDoc } from "./note-doc";

const saved = new Map<string, NoteDoc>();
const ref = (...path: string[]) => ({ path: path.join("/") });
const unused = () => {
  throw new Error("not used in this test");
};

mock.module("@/lib/firestore", () => ({ db: {} }));
mock.module("firebase/firestore", () => ({
  arrayUnion: unused,
  clearIndexedDbPersistence: unused,
  collection: (_db: unknown, ...path: string[]) => path.join("/"),
  deleteDoc: unused,
  doc: (parent: string, id: string) => {
    if (id === "broken") throw new Error("broken note");
    return ref(parent, id);
  },
  getDocFromCache: async ({ path }: { path: string }) => {
    await Promise.resolve();
    const stored = saved.get(path);
    return { data: () => (stored ? { doc: stored } : undefined) };
  },
  getDocsFromServer: unused,
  onSnapshot: unused,
  orderBy: unused,
  query: unused,
  serverTimestamp: () => "now",
  setDoc: unused,
  terminate: unused,
  updateDoc: async ({ path }: { path: string }, fields: { doc: NoteDoc }) => {
    saved.set(path, fields.doc);
  },
  writeBatch: unused,
}));

const { relabelNotes } = await import("./store");

const labelsIn = (id: string) =>
  saved
    .get(`users/u/notes/${id}`)
    ?.blocks.flatMap((block) => ("c" in block ? block.c : []))
    .flatMap((inline) => (inline.t === "value" ? [inline.label] : []));

const villa: NoteDoc = {
  v: 1,
  blocks: [
    {
      t: "p",
      c: [
        { t: "value", id: "group", label: "6" },
        { t: "text", text: " of us, so " },
        { t: "value", id: "share", label: "€280" },
        { t: "text", text: " each." },
      ],
    },
  ],
};

describe("relabelNotes", () => {
  test("two changes to one note both stick", async () => {
    saved.set("users/u/notes/villa", villa);
    await Promise.all([relabelNotes("u", "group", "8", ["villa"]), relabelNotes("u", "share", "€210", ["villa"])]);
    expect(labelsIn("villa")).toEqual(["8", "€210"]);
  });

  test("a failed change does not stop later ones", async () => {
    saved.set("users/u/notes/villa", villa);
    await expect(relabelNotes("u", "group", "8", ["broken"])).rejects.toThrow();
    await relabelNotes("u", "share", "€210", ["villa"]);
    expect(labelsIn("villa")).toEqual(["6", "€210"]);
  });
});
