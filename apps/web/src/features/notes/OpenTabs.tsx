import { useQuery } from "@tanstack/react-query";
import { Link, useMatchRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { MIcon } from "@/ui/kit";
import { collectionsQuery, notesQuery } from "./api";
import { closeTab, keepTabs, openTab, useTabs, type Tab } from "./tabs";

const TAB = "relative top-px flex h-10 shrink-0 items-center rounded-t-[9px] border border-b-0 text-[14px] transition-colors";
const ON = "border-line bg-page font-semibold text-ink after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-page";
const OFF = "border-transparent text-soft hover:text-ink";

export function OpenTabs({ uid, onNewNote }: { uid: string; onNewNote: () => void }) {
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();
  const tabs = useTabs(uid);
  const notes = useQuery(notesQuery(uid)).data;
  const collections = useQuery(collectionsQuery(uid)).data;

  const onAccount = Boolean(matchRoute({ to: "/notes/account" }));
  const noteMatch = onAccount ? false : matchRoute({ to: "/notes/$noteId" });
  const collectionMatch = matchRoute({ to: "/notes/collections/$collectionId" });
  const current: Tab | undefined = noteMatch ? { kind: "note", id: noteMatch.noteId } : collectionMatch ? { kind: "collection", id: collectionMatch.collectionId } : undefined;
  const onHome = Boolean(matchRoute({ to: "/notes" }));

  useEffect(() => {
    if (current) openTab(uid, current);
  }, [uid, current?.kind, current?.id]);

  useEffect(() => {
    if (!notes || !collections) return;
    const noteIds = new Set(notes.map((note) => note.id));
    const collectionIds = new Set(collections.map((collection) => collection.id));
    keepTabs(uid, (tab) => (tab.kind === "note" ? noteIds.has(tab.id) || (current?.kind === "note" && current.id === tab.id) : collectionIds.has(tab.id)));
  }, [uid, notes, collections, current?.kind, current?.id]);

  const title = (tab: Tab) =>
    tab.kind === "note" ? notes?.find((note) => note.id === tab.id)?.title || "Untitled" : (collections?.find((collection) => collection.id === tab.id)?.name ?? "Collection");

  const close = (tab: Tab) => {
    const next = closeTab(uid, tab);
    if (!current || current.kind !== tab.kind || current.id !== tab.id) return;
    if (!next) void navigate({ to: "/notes" });
    else if (next.kind === "note") void navigate({ to: "/notes/$noteId", params: { noteId: next.id } });
    else void navigate({ to: "/notes/collections/$collectionId", params: { collectionId: next.id } });
  };

  return (
    <nav aria-label="Open notes" className="no-scrollbar flex min-w-0 items-end gap-0.5 overflow-x-auto pl-2 sm:pl-5">
      <Link
        to="/notes"
        activeOptions={{ exact: true }}
        className={`${TAB} gap-2 px-3.5 ${onHome ? ON : OFF}`}
      >
        <MIcon name="home" className="size-4" />
        <span className="max-sm:sr-only">Home</span>
      </Link>
      {tabs.map((tab) => {
        const active = current?.kind === tab.kind && current.id === tab.id;
        const name = title(tab);
        return (
          <div
            key={`${tab.kind}:${tab.id}`}
            onAuxClick={(event) => event.button === 1 && close(tab)}
            className={`${TAB} group max-w-[240px] pr-1.5 ${active ? ON : OFF}`}
          >
            {tab.kind === "note" ? (
              <Link to="/notes/$noteId" params={{ noteId: tab.id }} aria-current={active ? "page" : undefined} className="flex h-full min-w-0 items-center gap-2 rounded-t-[9px] pl-3.5">
                <span className="truncate">{name}</span>
              </Link>
            ) : (
              <Link
                to="/notes/collections/$collectionId"
                params={{ collectionId: tab.id }}
                aria-current={active ? "page" : undefined}
                className="flex h-full min-w-0 items-center gap-2 rounded-t-[9px] pl-3.5"
              >
                <MIcon name="table" className="size-4 shrink-0 text-faint" />
                <span className="truncate">{name}</span>
              </Link>
            )}
            <button
              type="button"
              onClick={() => close(tab)}
              aria-label={`Close ${name}`}
              className="ml-1 grid size-6 shrink-0 place-items-center rounded-md text-faint transition-colors hover:bg-chip hover:text-ink"
            >
              <MIcon name="close" className="size-3" />
            </button>
          </div>
        );
      })}
      <button type="button" onClick={onNewNote} aria-label="New note" title="New note" className={`${TAB} ${OFF} px-3`}>
        <MIcon name="plus" className="size-4" />
      </button>
    </nav>
  );
}
