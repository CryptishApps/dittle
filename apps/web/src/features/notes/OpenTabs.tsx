import { useQuery } from "@tanstack/react-query";
import { Link, useMatchRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { MIcon } from "@/ui/kit";
import { collectionsQuery, notesQuery } from "./api";
import { closeTab, keepTabs, openTab, useTabs, type Tab } from "./tabs";

const TAB = "tab-shape relative flex h-12 shrink-0 items-center rounded-t-[15px] text-[14.5px] transition-colors";

export function OpenTabs({ uid, onNewNote }: { uid: string; onNewNote: () => void }) {
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();
  const tabs = useTabs(uid);
  const notes = useQuery(notesQuery(uid)).data;
  const collections = useQuery(collectionsQuery(uid)).data;

  const noteMatch = matchRoute({ to: "/notes/$noteId" });
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
    <nav aria-label="Open notes" className="no-scrollbar -mb-px flex min-w-0 items-end gap-0.5 overflow-x-auto pl-2 sm:pl-6">
      <Link
        to="/notes"
        activeOptions={{ exact: true }}
        className={`${TAB} gap-2 px-4 font-medium ${onHome ? "tab-on bg-side font-semibold text-ink" : "text-soft hover:bg-panel/70 hover:text-ink"}`}
      >
        <MIcon name="home" className="size-[17px]" />
        <span className="max-sm:sr-only">Home</span>
      </Link>
      {tabs.map((tab) => {
        const active = current?.kind === tab.kind && current.id === tab.id;
        const name = title(tab);
        return (
          <div
            key={`${tab.kind}:${tab.id}`}
            onAuxClick={(event) => event.button === 1 && close(tab)}
            className={`${TAB} group max-w-[240px] pr-1.5 ${active ? "tab-on bg-side font-semibold text-ink" : "font-medium text-soft hover:bg-panel/70 hover:text-ink"}`}
          >
            {tab.kind === "note" ? (
              <Link to="/notes/$noteId" params={{ noteId: tab.id }} aria-current={active ? "page" : undefined} className="flex h-full min-w-0 items-center gap-2 rounded-t-[15px] pl-4">
                <span aria-hidden className={`size-2 shrink-0 rounded-[3px] ${active ? "bg-accent" : "bg-quiet"}`} />
                <span className="truncate">{name}</span>
              </Link>
            ) : (
              <Link
                to="/notes/collections/$collectionId"
                params={{ collectionId: tab.id }}
                aria-current={active ? "page" : undefined}
                className="flex h-full min-w-0 items-center gap-2 rounded-t-[15px] pl-3.5"
              >
                <MIcon name="table" className={`size-4 shrink-0 ${active ? "text-accent" : "text-quiet"}`} />
                <span className="truncate">{name}</span>
              </Link>
            )}
            <button
              type="button"
              onClick={() => close(tab)}
              aria-label={`Close ${name}`}
              className={`ml-1.5 grid size-6 shrink-0 place-items-center rounded-md text-faint transition-colors hover:bg-chip-hover hover:text-ink ${active ? "bg-chip" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"}`}
            >
              <MIcon name="close" className="size-3" />
            </button>
          </div>
        );
      })}
      <button type="button" onClick={onNewNote} aria-label="New note" title="New note" className={`${TAB} px-3.5 text-soft hover:bg-panel/70 hover:text-ink`}>
        <MIcon name="plus" className="size-[17px]" />
      </button>
    </nav>
  );
}
