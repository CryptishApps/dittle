import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, Outlet, useNavigate, useParams, useRouter } from "@tanstack/react-router";
import type { User } from "firebase/auth";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useDeviceModel, type DeviceModelStatus } from "@/features/ai/device-model";
import { loadAuth } from "@/lib/session";
import { Btn, ease, MIcon } from "@/ui/kit";
import { Wordmark } from "@/ui/Wordmark";
import { useCollectionSuggestions } from "@/features/collections/suggestions";
import { collectionsQuery, foldersQuery, loadStore, notesQuery, rowsQuery, startNote, valuesQuery, writes } from "./api";
import { NoteTree } from "./NoteTree";
import { dismissToast, showToast, useToast } from "./toast";
import type { Folder, NoteSummary } from "./store";

const subscribeOnline = (onChange: () => void) => {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
};

export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine);
}

export function NotesShell({ user }: { user: User }) {
  const { data: notes } = useSuspenseQuery(notesQuery(user.uid));
  const { data: folders } = useSuspenseQuery(foldersQuery(user.uid));
  const { data: collections } = useSuspenseQuery(collectionsQuery(user.uid));
  const { data: rows } = useSuspenseQuery(rowsQuery(user.uid));
  const { data: values } = useSuspenseQuery(valuesQuery(user.uid));
  const [creatingFolder, setCreatingFolder] = useState(false);
  const { noteId, collectionId } = useParams({ strict: false });
  const detail = Boolean(noteId || collectionId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const online = useOnline();
  const suggestions = useCollectionSuggestions(values, online);

  const createSuggested = (id: string) => {
    const accepted = suggestions.accept(id);
    if (!accepted) return;
    const { collection, rows: newRows, cells } = accepted.plan;
    writes.createCollection(user.uid, collection, newRows, cells);
    showToast(`Created ${collection.name} with ${newRows.length} rows`);
    void navigate({ to: "/notes/collections/$collectionId", params: { collectionId: collection.id } });
  };
  const [leaving, setLeaving] = useState(false);

  const router = useRouter();
  useEffect(() => {
    const id = window.requestIdleCallback?.(() => void router.loadRouteChunk(router.routesById["/_app/notes/$noteId"]));
    return () => window.cancelIdleCallback?.(id);
  }, [router]);

  const newNote = (folderId: string | null = null) => void navigate({ to: "/notes/$noteId", params: { noteId: startNote(queryClient, user.uid, folderId) } });

  const toast = useToast();

  const remove = async (note: NoteSummary) => {
    if (note.id === noteId) await navigate({ to: "/notes" });
    const undo = await writes.deleteNote(user.uid, note.id);
    showToast(`Deleted ${note.title ? `"${note.title}"` : "note"}`, undo);
  };

  const removeFolder = async (folder: Folder) => {
    const inside = notes.filter((note) => note.folderId === folder.id).map((note) => note.id);
    const undo = await writes.deleteFolder(user.uid, folder, inside);
    showToast(`Deleted folder "${folder.name}"${inside.length ? `, ${inside.length} ${inside.length === 1 ? "note" : "notes"} kept` : ""}`, undo);
  };

  const signOut = async () => {
    setLeaving(true);
    queryClient.clear();
    await (await loadStore()).forgetThisDevice();
    await (await loadAuth()).signOut();
    window.location.assign("/");
  };

  return (
    <div className="flex h-dvh bg-page">
      <aside className={`${detail ? "hidden md:flex" : "flex"} w-full shrink-0 flex-col border-line bg-side md:w-[288px] md:border-r`}>
        <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4">
          <Link to="/notes" aria-label="All notes">
            <Wordmark className="text-[14px]" />
          </Link>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCreatingFolder(true)}
              aria-label="New folder"
              title="New folder"
              className="grid size-7 place-items-center border border-line-strong bg-card text-soft hover:border-ink hover:text-ink"
            >
              <MIcon name="folder" className="size-3.5" />
            </button>
            <Btn primary onClick={() => newNote()}>
              <MIcon name="plus" className="size-3.5" />
              New
            </Btn>
          </div>
        </div>

        <nav aria-label="Notes" className="min-h-0 flex-1 overflow-y-auto py-2">
          {suggestions.suggestions.length > 0 && (
            <div className="mb-2 border-b border-line pb-2">
              <p className="flex items-center gap-2 px-4 pt-1 pb-1 text-[10.5px] tracking-[0.06em] text-faint uppercase">
                <span aria-hidden className="size-1.5 bg-accent" />
                Suggested collections
              </p>
              <ul>
                {suggestions.suggestions.map((suggestion) => (
                  <li key={suggestion.id} className="px-4 py-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-[13px] text-ink">{suggestion.proposal.name}</span>
                      <span className="shrink-0 text-[10.5px] text-faint">{suggestion.rowCount} rows</span>
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-soft">{suggestion.plan.collection.fields.map((field) => field.name).join(", ")}</p>
                    <div className="mt-1.5 flex gap-2">
                      <button
                        type="button"
                        onClick={() => createSuggested(suggestion.id)}
                        className="bg-ink px-2 py-1 text-[10.5px] tracking-[0.06em] text-page uppercase hover:opacity-90"
                      >
                        Create
                      </button>
                      <button
                        type="button"
                        onClick={() => suggestions.dismiss(suggestion.id)}
                        aria-label={`Dismiss ${suggestion.proposal.name}`}
                        className="border border-line-strong px-2 py-1 text-[10.5px] tracking-[0.06em] text-soft uppercase hover:border-ink hover:text-ink"
                      >
                        Not now
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {collections.length > 0 && (
            <div className="mb-2 border-b border-line pb-2">
              <p className="px-4 pt-1 pb-1 text-[10.5px] tracking-[0.06em] text-faint uppercase">Collections</p>
              <ul>
                {collections.map((collection) => {
                  const count = rows.filter((row) => row.collectionId === collection.id).length;
                  return (
                    <li key={collection.id}>
                      <Link
                        to="/notes/collections/$collectionId"
                        params={{ collectionId: collection.id }}
                        className="flex items-center gap-2 border-l-2 border-transparent py-1.5 pr-4 pl-4 text-[13px] text-ink hover:bg-panel [&.active]:border-ink [&.active]:bg-panel"
                      >
                        <MIcon name="chip" className="size-3.5 text-soft" />
                        <span className="truncate">{collection.name}</span>
                        <span className="ml-auto text-[10.5px] text-faint tabular-nums">{count}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <NoteTree
            uid={user.uid}
            notes={notes}
            folders={folders}
            creatingFolder={creatingFolder}
            onFolderCreated={() => setCreatingFolder(false)}
            onNewNote={newNote}
            onDeleteNote={(note) => void remove(note)}
            onDeleteFolder={(folder) => void removeFolder(folder)}
          />
        </nav>

        <footer className="shrink-0 border-t border-line px-4 py-3 text-[11.5px]">
          <DeviceModelLink />
          <p className="mt-1.5 flex items-center gap-2 text-soft">
            <span aria-hidden className={`size-1.5 ${online ? "bg-ink" : "bg-accent"}`} />
            {online ? "Online · synced" : "Offline · saved on this device"}
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="truncate text-faint">{user.displayName ?? user.email}</span>
            <button type="button" onClick={signOut} disabled={leaving} className="shrink-0 tracking-[0.04em] text-soft uppercase hover:text-ink">
              {leaving ? "Signing out" : "Sign out"}
            </button>
          </div>
        </footer>
      </aside>

      <main className={`${detail ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
        <Outlet />
      </main>

      <AnimatePresence>
        {toast && (
          <m.div
            key={toast.id}
            role="status"
            initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 6, transition: { duration: 0.15 } }}
            transition={{ duration: 0.3, ease }}
            className="fixed bottom-4 left-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-4 bg-ink py-2.5 pr-2.5 pl-4 text-[12.5px] text-page shadow-pop"
          >
            <span className="truncate">{toast.text}</span>
            {toast.undo && (
              <button
                type="button"
                onClick={() => {
                  toast.undo?.();
                  dismissToast();
                }}
                className="shrink-0 px-2 py-1 text-[11px] tracking-[0.06em] uppercase hover:bg-page/15"
              >
                Undo
              </button>
            )}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const MODEL_LABEL: Record<DeviceModelStatus, string> = {
  checking: "Checking",
  "no-api": "Cloud only in this browser",
  unavailable: "Cloud only on this device",
  downloadable: "Not downloaded",
  downloading: "Downloading",
  available: "Ready",
};

function DeviceModelLink() {
  const model = useDeviceModel();
  const dot = model.status === "available" ? "bg-ink" : model.status === "downloadable" ? "bg-accent" : "bg-faint";
  const percent = model.status === "downloading" && model.progress !== undefined ? ` ${Math.round(model.progress * 100)}%` : "";
  return (
    <Link to="/ai" className="flex items-center gap-2 text-soft hover:text-ink">
      <span aria-hidden className={`size-1.5 ${dot}`} />
      <span>
        Gemini Nano · {MODEL_LABEL[model.status]}
        {percent}
      </span>
      <MIcon name="right" className="ml-auto size-3" />
    </Link>
  );
}
