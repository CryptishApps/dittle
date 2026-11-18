import type { Folder, NoteSummary } from "./store";

export type RecentNote = { note: NoteSummary; folder: Folder | null };

export function recentNotes(notes: NoteSummary[], folders: Folder[]): RecentNote[] {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  return [...notes]
    .sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id))
    .map((note) => ({ note, folder: (note.folderId && byId.get(note.folderId)) || null }));
}
