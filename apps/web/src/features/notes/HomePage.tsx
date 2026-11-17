import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useCollectionSuggestions, type Suggestion } from "@/features/collections/suggestions";
import { daysUntil, summariseCollection, upcomingDates, type CollectionSummary, type Upcoming } from "@/features/collections/summary";
import { dayLabel } from "@/features/collections/format";
import { MIcon } from "@/ui/kit";
import { collectionsQuery, foldersQuery, notesQuery, rowsQuery, startNote, valuesQuery, writes } from "./api";
import { noteWith } from "./note-doc";
import { NoteTree } from "./NoteTree";
import { useOnline } from "./NotesShell";
import { showToast } from "./toast";
import type { Folder, NoteSummary } from "./store";

const EXAMPLES = [
  { title: "Sunday run", body: "Ran 5 km along the canal in 27:40." },
  { title: "Lisbon trip", body: "Flights land Fri 12 June, and the hotel is €140 a night." },
  { title: "Catering", body: "Rosa's Kitchen quoted £38 a head for 80 guests." },
];

export function HomePage({ uid }: { uid: string }) {
  const { data: notes } = useSuspenseQuery(notesQuery(uid));
  const { data: folders } = useSuspenseQuery(foldersQuery(uid));
  const { data: collections } = useSuspenseQuery(collectionsQuery(uid));
  const { data: rows } = useSuspenseQuery(rowsQuery(uid));
  const { data: values } = useSuspenseQuery(valuesQuery(uid));
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const online = useOnline();
  const suggestions = useCollectionSuggestions(values, online);
  const [creatingFolder, setCreatingFolder] = useState(false);

  const open = (noteId: string) => void navigate({ to: "/notes/$noteId", params: { noteId } });
  const start = (title = "", body = "", folderId: string | null = null) => open(startNote(queryClient, uid, folderId, noteWith(title, body)));

  const removeNote = async (note: NoteSummary) => {
    const undo = await writes.deleteNote(uid, note.id);
    showToast(`Deleted ${note.title ? `"${note.title}"` : "note"}`, undo);
  };

  const removeFolder = async (folder: Folder) => {
    const inside = notes.filter((note) => note.folderId === folder.id).map((note) => note.id);
    const undo = await writes.deleteFolder(uid, folder, inside);
    showToast(`Deleted folder "${folder.name}"${inside.length ? `, ${inside.length} ${inside.length === 1 ? "note" : "notes"} kept` : ""}`, undo);
  };

  const createSuggested = (id: string) => {
    const accepted = suggestions.accept(id);
    if (!accepted) return;
    const { collection, rows: newRows, cells } = accepted.plan;
    writes.createCollection(uid, collection, newRows, cells);
    showToast(`Created ${collection.name} with ${newRows.length} rows`);
  };

  if (notes.length === 0 && folders.length === 0) return <FirstVisit onStart={start} />;

  const summaries = collections.map((collection) => summariseCollection(collection, rows, values));
  const upcoming = upcomingDates(values);
  const tracking = summaries.length > 0 || upcoming.length > 0 || suggestions.suggestions.length > 0;
  const noteTitle = (noteId: string | undefined) => notes.find((note) => note.id === noteId)?.title || "Untitled";

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[820px] px-5 pt-8 pb-24 sm:px-8">
        <h1 className="sr-only">Your notes</h1>
        {tracking && (
          <section aria-label="What you track" className="mb-8 grid grid-cols-1 pt-px pl-px sm:grid-cols-2 lg:grid-cols-3">
            {summaries.map((summary) => (
              <CollectionTile key={summary.collection.id} summary={summary} />
            ))}
            {upcoming.length > 0 && <UpcomingTile items={upcoming} noteTitle={noteTitle} />}
            {suggestions.suggestions.map((suggestion) => (
              <SuggestionTile key={suggestion.id} suggestion={suggestion} onCreate={() => createSuggested(suggestion.id)} onDismiss={() => suggestions.dismiss(suggestion.id)} />
            ))}
          </section>
        )}

        <StartNote onStart={(title) => start(title)} />

        {!tracking && values.length > 0 && <FoundHint values={values.slice(0, 3).map((value) => value.text)} count={values.length} />}

        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-[10.5px] tracking-[0.06em] text-faint uppercase">Notes</h2>
          <button type="button" onClick={() => setCreatingFolder(true)} className="inline-flex items-center gap-1.5 text-[10.5px] tracking-[0.06em] text-soft uppercase hover:text-ink">
            <MIcon name="folder" className="size-3.5" />
            New folder
          </button>
        </div>
        <nav aria-label="Notes" className="mt-2 border-t border-line">
          <NoteTree
            uid={uid}
            notes={notes}
            folders={folders}
            creatingFolder={creatingFolder}
            onFolderCreated={() => setCreatingFolder(false)}
            onNewNote={(folderId) => start("", "", folderId)}
            onDeleteNote={(note) => void removeNote(note)}
            onDeleteFolder={(folder) => void removeFolder(folder)}
          />
        </nav>
      </div>
    </div>
  );
}

function FirstVisit({ onStart }: { onStart: (title?: string, body?: string) => void }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[640px] px-5 pt-16 pb-24 sm:px-8 sm:pt-24">
        <h1 className="text-[26px] leading-tight font-medium tracking-[-0.03em]">Write anything.</h1>
        <p className="mt-3 text-[13.5px] leading-[1.75] text-soft">
          Dittle notices the dates, prices and amounts in your notes. Change one, and every note that mentions it updates.
        </p>
        <div className="mt-8">
          <StartNote onStart={(title) => onStart(title)} autoFocus />
        </div>
        <p className="mt-8 text-[10.5px] tracking-[0.06em] text-faint uppercase">Or try one</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <li key={example.title}>
              <button
                type="button"
                onClick={() => onStart(example.title, example.body)}
                className="border border-dashed border-line-strong px-3 py-2 text-left text-[12.5px] text-soft hover:border-ink hover:text-ink"
              >
                {example.body}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StartNote({ onStart, autoFocus = false }: { onStart: (title: string) => void; autoFocus?: boolean }) {
  const [title, setTitle] = useState("");
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onStart(title.trim());
      }}
      className="flex items-center border-b border-line-strong focus-within:border-accent"
    >
      <input
        autoFocus={autoFocus}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Start a note"
        aria-label="Start a note with this title"
        className="h-12 min-w-0 flex-1 bg-transparent text-[17px] text-ink outline-none placeholder:text-faint"
        style={{ outline: "none" }}
      />
      <span className="hidden text-[10.5px] tracking-[0.06em] text-faint uppercase sm:block">Enter</span>
    </form>
  );
}

function FoundHint({ values, count }: { values: string[]; count: number }) {
  return (
    <p className="mt-6 border border-dashed border-line-strong px-3.5 py-3 text-[12.5px] leading-[1.8] text-soft">
      Dittle is keeping {count === 1 ? "1 value" : `${count} values`} in step across your notes, like{" "}
      {values.map((text, index) => (
        <span key={index}>
          <span className="bg-chip px-1 py-0.5 text-ink">{text}</span>
          {index < values.length - 1 ? " " : ""}
        </span>
      ))}
      . Click one in a note to see where else it's used.
    </p>
  );
}

const TILE = "-mt-px -ml-px flex min-h-[132px] flex-col border border-line px-4 py-3.5";

function CollectionTile({ summary }: { summary: CollectionSummary }) {
  const { collection, count, scope, totals, latest } = summary;
  const [headline, ...others] = totals;
  const skipped = totals.reduce((total, item) => total + item.otherUnits, 0);
  const entries = `${count} ${count === 1 ? "entry" : "entries"}`;
  return (
    <Link to="/notes/collections/$collectionId" params={{ collectionId: collection.id }} className={`${TILE} hover:bg-panel`}>
      <span className="text-[10.5px] tracking-[0.06em] text-faint uppercase">{collection.name}</span>
      <span className="mt-2 flex items-baseline gap-2">
        <span className="text-[30px] leading-none font-medium tracking-[-0.03em] tabular-nums">{headline?.text ?? count}</span>
        <span className="text-[12px] text-faint">{headline ? `${headline.field.name} ${scope}` : scope}</span>
      </span>
      {headline && (
        <span className="mt-1.5 text-[11.5px] text-soft">
          {[entries, ...others.map((item) => `${item.text} ${item.field.name}`)].join(" · ")}
          {skipped > 0 && <span className="text-faint"> · {skipped} in other units not added</span>}
        </span>
      )}
      {latest && (
        <span className="mt-auto line-clamp-2 pt-3 text-[11.5px] text-soft">
          Latest · {[latest.label, ...latest.cells].filter(Boolean).join(" · ")}
        </span>
      )}
    </Link>
  );
}

function UpcomingTile({ items, noteTitle }: { items: Upcoming[]; noteTitle: (noteId: string | undefined) => string }) {
  const [first, ...rest] = items;
  if (!first) return null;
  const days = daysUntil(first.on);
  return (
    <div className={TILE}>
      <span className="text-[10.5px] tracking-[0.06em] text-faint uppercase">Coming up</span>
      <Link to="/notes/$noteId" params={{ noteId: first.value.origin?.noteId ?? "" }} disabled={!first.value.origin?.noteId} className="mt-2 flex items-baseline gap-2 hover:text-accent-ink">
        <span className="text-[30px] leading-none font-medium tracking-[-0.03em] tabular-nums">{days === 0 ? "Today" : days}</span>
        {days !== 0 && <span className="text-[12px] text-faint">{days === 1 ? "day" : "days"}</span>}
        <span className="truncate text-[12px] text-soft">{first.value.subject?.label ?? noteTitle(first.value.origin?.noteId)}</span>
      </Link>
      <ul className="mt-auto space-y-0.5 pt-3 text-[11.5px]">
        {rest.map((item) => (
          <li key={item.value.id} className="flex justify-between gap-3">
            <span className="text-accent-ink">{dayLabel(item.on)}</span>
            <span className="truncate text-soft">{item.value.subject?.label ?? noteTitle(item.value.origin?.noteId)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SuggestionTile({ suggestion, onCreate, onDismiss }: { suggestion: Suggestion; onCreate: () => void; onDismiss: () => void }) {
  return (
    <div className={`${TILE} bg-accent-tint/40`}>
      <span className="flex items-center gap-2 text-[10.5px] tracking-[0.06em] text-faint uppercase">
        <span aria-hidden className="size-1.5 bg-accent" />
        Suggested collection
      </span>
      <span className="mt-2 text-[15px] font-medium">{suggestion.proposal.name}</span>
      <span className="mt-0.5 truncate text-[11.5px] text-soft">
        {suggestion.rowCount} rows · {suggestion.plan.collection.fields.map((field) => field.name).join(", ")}
      </span>
      <span className="mt-auto flex gap-2 pt-3">
        <button type="button" onClick={onCreate} className="bg-ink px-2 py-1 text-[10.5px] tracking-[0.06em] text-page uppercase hover:opacity-90">
          Create
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={`Dismiss ${suggestion.proposal.name}`}
          className="border border-line-strong px-2 py-1 text-[10.5px] tracking-[0.06em] text-soft uppercase hover:border-ink hover:text-ink"
        >
          Not now
        </button>
      </span>
    </div>
  );
}
