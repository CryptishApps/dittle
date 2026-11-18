import { describe, expect, test } from "bun:test";
import { recentNotes } from "./recent";
import type { Folder, NoteSummary } from "./store";

const note = (id: string, updatedAt: number, folderId: string | null = null): NoteSummary => ({ id, title: id, preview: "", text: "", updatedAt, pending: false, folderId, valueIds: [] });
const running: Folder = { id: "running", name: "Running", createdAt: 1 };

describe("recentNotes", () => {
  test("puts the most recently updated note first, whatever its folder", () => {
    const list = recentNotes([note("old", 100, "running"), note("newest", 300), note("middle", 200, "running")], [running]);
    expect(list.map((item) => item.note.id)).toEqual(["newest", "middle", "old"]);
  });

  test("labels each note with its folder, and with none when the folder is gone", () => {
    const list = recentNotes([note("filed", 200, "running"), note("orphan", 100, "deleted"), note("loose", 50)], [running]);
    expect(list.map((item) => item.folder?.name ?? null)).toEqual(["Running", null, null]);
  });

  test("keeps notes edited at the same moment in a stable order", () => {
    const list = recentNotes([note("b", 100), note("a", 100)], []);
    expect(list.map((item) => item.note.id)).toEqual(["a", "b"]);
  });

  test("leaves the input untouched", () => {
    const notes = [note("old", 1), note("new", 2)];
    recentNotes(notes, []);
    expect(notes.map((item) => item.id)).toEqual(["old", "new"]);
  });
});
