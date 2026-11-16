import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, Outlet, useNavigate, useParams, useRouter } from "@tanstack/react-router";
import type { User } from "firebase/auth";
import { AnimatePresence, m } from "motion/react";
import { DropdownMenu } from "radix-ui";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useDeviceModel, type DeviceModelStatus } from "@/features/ai/device-model";
import { loadAuth } from "@/lib/session";
import { Btn, ease, MIcon } from "@/ui/kit";
import { Wordmark } from "@/ui/Wordmark";
import { loadStore, notesQuery, startNote, writes } from "./api";
import type { NoteSummary } from "./store";

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

const ago = new Intl.RelativeTimeFormat("en", { numeric: "auto", style: "narrow" });
const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

function edited(at: number): string {
  const minutes = Math.round((Date.now() - at) / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return ago.format(-minutes, "minute");
  if (minutes < 24 * 60) return ago.format(-Math.round(minutes / 60), "hour");
  return day.format(at);
}

export function NotesShell({ user }: { user: User }) {
  const { data: notes } = useSuspenseQuery(notesQuery(user.uid));
  const { noteId } = useParams({ strict: false });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const online = useOnline();
  const [leaving, setLeaving] = useState(false);

  const router = useRouter();
  useEffect(() => {
    const id = window.requestIdleCallback?.(() => void router.loadRouteChunk(router.routesById["/_app/notes/$noteId"]));
    return () => window.cancelIdleCallback?.(id);
  }, [router]);

  const newNote = () => void navigate({ to: "/notes/$noteId", params: { noteId: startNote(queryClient, user.uid) } });

  const [toast, setToast] = useState<{ id: number; text: string; undo: () => void }>();
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(undefined), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const remove = async (note: NoteSummary) => {
    if (note.id === noteId) await navigate({ to: "/notes" });
    const undo = await writes.deleteNote(user.uid, note.id);
    setToast({ id: Date.now(), text: `Deleted ${note.title ? `"${note.title}"` : "note"}`, undo });
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
      <aside className={`${noteId ? "hidden md:flex" : "flex"} w-full shrink-0 flex-col border-line bg-side md:w-[288px] md:border-r`}>
        <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4">
          <Link to="/notes" aria-label="All notes">
            <Wordmark className="text-[14px]" />
          </Link>
          <Btn primary onClick={newNote}>
            <MIcon name="plus" className="size-3.5" />
            New
          </Btn>
        </div>

        <nav aria-label="Notes" className="min-h-0 flex-1 overflow-y-auto py-2">
          {notes.length === 0 ? (
            <p className="px-4 py-6 text-[12.5px] leading-[1.7] text-soft">No notes yet. Start one and it saves as you type, even offline.</p>
          ) : (
            <ul>
              <AnimatePresence initial={false}>
                {notes.map((note) => (
                  <NoteRow key={note.id} note={note} onDelete={() => void remove(note)} />
                ))}
              </AnimatePresence>
            </ul>
          )}
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

      <main className={`${noteId ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
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
            <button
              type="button"
              onClick={() => {
                toast.undo();
                setToast(undefined);
              }}
              className="shrink-0 px-2 py-1 text-[11px] tracking-[0.06em] uppercase hover:bg-page/15"
            >
              Undo
            </button>
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

function NoteRow({ note, onDelete }: { note: NoteSummary; onDelete: () => void }) {
  return (
    <m.li
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.28, ease }}
      className="group relative overflow-hidden"
    >
      <Link
        to="/notes/$noteId"
        params={{ noteId: note.id }}
        className="block border-l-2 border-transparent py-2.5 pr-11 pl-4 hover:bg-panel [&.active]:border-ink [&.active]:bg-panel"
      >
        <span className="flex items-baseline justify-between gap-3">
          <span className={`truncate text-[13px] ${note.title ? "text-ink" : "text-faint"}`}>{note.title || "Untitled"}</span>
          <span className="shrink-0 text-[10.5px] text-faint">{edited(note.updatedAt)}</span>
        </span>
        {note.preview && <span className="mt-0.5 block truncate text-[12px] text-soft">{note.preview}</span>}
      </Link>
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger
          aria-label={`More actions for ${note.title || "Untitled"}`}
          className="absolute top-2 right-2 grid size-7 place-items-center text-soft transition-opacity hover:bg-chip hover:text-ink focus-visible:opacity-100 data-[state=open]:bg-chip data-[state=open]:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
        >
          <svg viewBox="0 0 16 16" aria-hidden className="size-3.5 fill-current">
            <circle cx="3" cy="8" r="1.3" />
            <circle cx="8" cy="8" r="1.3" />
            <circle cx="13" cy="8" r="1.3" />
          </svg>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={4}
            className="z-50 min-w-[160px] border border-line-strong bg-card p-1 text-[12.5px] shadow-pop data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          >
            <DropdownMenu.Item onSelect={onDelete} className="cursor-pointer px-2.5 py-1.5 text-accent-ink outline-none data-[highlighted]:bg-panel">
              Delete note
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </m.li>
  );
}
