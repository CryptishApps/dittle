import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Dialog } from "radix-ui";
import { useEffect, useState } from "react";
import { Kbd, MIcon, POPOVER } from "@/ui/kit";
import { collectionsQuery, notesQuery } from "./api";

const RECENT = 8;
const MAX_RESULTS = 20;
const SNIPPET_LEAD = 40;
const SNIPPET_LENGTH = 140;

type Result = { kind: "note"; id: string; title: string; detail: string } | { kind: "collection"; id: string; title: string; detail: string };

export function useSearchShortcut(open: () => void): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        open();
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [open]);
}

export function SearchDialog({ uid, open, onOpenChange }: { uid: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-scrim backdrop-blur-[3px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className={`${POPOVER} fixed top-[12vh] left-1/2 z-50 w-[min(600px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-[20px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95`}
        >
          <Dialog.Title className="sr-only">Search notes</Dialog.Title>
          {open && <SearchBody uid={uid} onDone={() => onOpenChange(false)} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SearchBody({ uid, onDone }: { uid: string; onDone: () => void }) {
  const { data: notes } = useSuspenseQuery(notesQuery(uid));
  const { data: collections } = useSuspenseQuery(collectionsQuery(uid));
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const wanted = query.trim().toLocaleLowerCase();
  const has = (text: string) => text.toLocaleLowerCase().includes(wanted);
  const snippet = (text: string) => {
    const at = text.toLocaleLowerCase().indexOf(wanted);
    if (at < SNIPPET_LEAD) return text.slice(0, SNIPPET_LENGTH);
    const start = text.lastIndexOf(" ", at - SNIPPET_LEAD) + 1;
    return `…${text.slice(start, start + SNIPPET_LENGTH)}`;
  };
  const results: Result[] = wanted
    ? [
        ...collections.filter((collection) => has(collection.name)).map((collection): Result => ({ kind: "collection", id: collection.id, title: collection.name, detail: "Collection" })),
        ...notes
          .filter((note) => has(note.title) || has(note.text))
          .map((note): Result => ({ kind: "note", id: note.id, title: note.title || "Untitled", detail: has(note.text) ? snippet(note.text.replaceAll("\n", " ")) : note.preview })),
      ].slice(0, MAX_RESULTS)
    : notes.slice(0, RECENT).map((note) => ({ kind: "note", id: note.id, title: note.title || "Untitled", detail: note.preview }));

  const go = (result: Result | undefined) => {
    if (!result) return;
    onDone();
    if (result.kind === "note") void navigate({ to: "/notes/$noteId", params: { noteId: result.id } });
    else void navigate({ to: "/notes/collections/$collectionId", params: { collectionId: result.id } });
  };

  return (
    <>
      <div className="flex items-center gap-3 border-b border-line px-5">
        <MIcon name="search" className="size-5 shrink-0 text-accent" />
        <input
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((index) => Math.min(index + 1, results.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter") {
              event.preventDefault();
              go(results[active]);
            }
          }}
          placeholder="Search notes and collections"
          aria-label="Search notes and collections"
          role="combobox"
          aria-expanded
          aria-controls="search-results"
          aria-activedescendant={results[active] ? `search-${results[active].kind}-${results[active].id}` : undefined}
          className="h-14 min-w-0 flex-1 bg-transparent text-[17px] text-ink placeholder:text-faint"
          style={{ outline: "none" }}
        />
        <Kbd>Esc</Kbd>
      </div>
      <p className="px-5 pt-3.5 pb-1.5 text-label text-soft">{wanted ? `${results.length} found` : "Recent"}</p>
      <ul id="search-results" role="listbox" className="max-h-[50vh] overflow-y-auto px-2 pb-2">
        {results.map((result, index) => (
          <li
            key={`${result.kind}-${result.id}`}
            id={`search-${result.kind}-${result.id}`}
            role="option"
            aria-selected={index === active}
            onMouseMove={() => setActive(index)}
            onClick={() => go(result)}
            className={`cursor-pointer rounded-xl px-3 py-2.5 ${index === active ? "bg-accent-tint" : ""}`}
          >
            <span className="flex items-baseline justify-between gap-3">
              <span className="truncate text-[15px] font-semibold text-ink">{result.title}</span>
              {result.kind === "collection" && <span className="shrink-0 rounded-full bg-tag px-2.5 py-0.5 text-[12px] font-semibold text-tag-ink">Collection</span>}
            </span>
            {result.kind === "note" && result.detail && <span className="mt-0.5 block truncate text-[13.5px] text-soft">{result.detail}</span>}
          </li>
        ))}
        {wanted && results.length === 0 && <li className="px-3 py-3 text-[14px] text-soft">Nothing matches "{query.trim()}".</li>}
      </ul>
    </>
  );
}
