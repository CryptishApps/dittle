import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, Outlet, useNavigate, useParams } from "@tanstack/react-router";
import type { User } from "firebase/auth";
import { AnimatePresence, m } from "motion/react";
import { useState, useSyncExternalStore } from "react";
import { loadAuth } from "@/lib/session";
import { Btn, ease, MIcon } from "@/ui/kit";
import { Wordmark } from "@/ui/Wordmark";
import { loadStore, notesQuery, writes } from "./api";
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

  const newNote = () => void navigate({ to: "/notes/$noteId", params: { noteId: writes.createNote(user.uid) } });

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
                  <NoteRow key={note.id} note={note} />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </nav>

        <footer className="shrink-0 border-t border-line px-4 py-3 text-[11.5px]">
          <p className="flex items-center gap-2 text-soft">
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
    </div>
  );
}

function NoteRow({ note }: { note: NoteSummary }) {
  return (
    <m.li
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.28, ease }}
      className="overflow-hidden"
    >
      <Link
        to="/notes/$noteId"
        params={{ noteId: note.id }}
        className="block border-l-2 border-transparent px-4 py-2.5 hover:bg-panel [&.active]:border-ink [&.active]:bg-panel"
      >
        <span className="flex items-baseline justify-between gap-3">
          <span className={`truncate text-[13px] ${note.title ? "text-ink" : "text-faint"}`}>{note.title || "Untitled"}</span>
          <span className="shrink-0 text-[10.5px] text-faint">{edited(note.updatedAt)}</span>
        </span>
        {note.preview && <span className="mt-0.5 block truncate text-[12px] text-soft">{note.preview}</span>}
      </Link>
    </m.li>
  );
}
