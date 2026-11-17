import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useCollectionSuggestions, type Suggestion } from "@/features/collections/suggestions";
import { daysUntil, summariseCollection, upcomingDates, type CollectionSummary, type Upcoming } from "@/features/collections/summary";
import { dayLabel } from "@/features/collections/format";
import { Btn, btnClass, Kbd, MIcon } from "@/ui/kit";
import { collectionsQuery, foldersQuery, notesQuery, rowsQuery, startNote, valuesQuery, writes } from "./api";
import { noteWith, type NoteDoc } from "./note-doc";
import { STARTERS } from "./starters";
import { NoteTree } from "./NoteTree";
import { useOnline } from "./NotesShell";
import { showToast } from "./toast";
import type { Folder, NoteSummary } from "./store";

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
  const startFrom = (doc: NoteDoc) => open(startNote(queryClient, uid, null, doc));

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

  if (notes.length === 0 && folders.length === 0) return <FirstVisit onStart={(title) => start(title)} onStartFrom={startFrom} />;

  const summaries = collections.map((collection) => summariseCollection(collection, rows, values));
  const upcoming = upcomingDates(values);
  const tracking = summaries.length > 0 || upcoming.length > 0 || suggestions.suggestions.length > 0;
  const noteTitle = (noteId: string | undefined) => notes.find((note) => note.id === noteId)?.title || "Untitled";

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[1160px] px-4 pt-7 pb-24 sm:px-10 sm:pt-11">
        <h1 className="sr-only">Your notes</h1>
        <StartNote onStart={(title) => start(title)} />
        {tracking && (
          <section aria-label="What you track" className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {summaries.map((summary) => (
              <CollectionTile key={summary.collection.id} summary={summary} />
            ))}
            {upcoming.length > 0 && <UpcomingTile items={upcoming} noteTitle={noteTitle} />}
            {suggestions.suggestions.map((suggestion) => (
              <SuggestionTile key={suggestion.id} suggestion={suggestion} onCreate={() => createSuggested(suggestion.id)} onDismiss={() => suggestions.dismiss(suggestion.id)} />
            ))}
          </section>
        )}

        {!tracking && values.length > 0 && <FoundHint values={values.slice(0, 3).map((value) => value.text)} count={values.length} />}

        <div className="mt-12 flex items-center justify-between">
          <h2 className="text-[22px] font-semibold tracking-[-0.02em]">Notes</h2>
          <Btn onClick={() => setCreatingFolder(true)}>
            <MIcon name="folder" className="size-4" />
            New folder
          </Btn>
        </div>
        <nav aria-label="Notes" className="mt-9">
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

function FirstVisit({ onStart, onStartFrom }: { onStart: (title: string) => void; onStartFrom: (doc: NoteDoc) => void }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[760px] px-4 pt-12 pb-24 sm:px-8 sm:pt-20">
        <h1 className="text-[44px] leading-[1.04] font-semibold tracking-[-0.045em] sm:text-[58px]">
          Plans change.
          <span className="block text-quiet">Your notes keep up.</span>
        </h1>
        <p className="mt-5 max-w-[54ch] text-[17px] leading-[1.65] text-soft">
          Write a trip, a wedding or a training plan as notes. Dittle spots the prices, dates and distances, keeps every copy in step, and files them into tables that add themselves up.
        </p>
        <div className="mt-8">
          <StartNote onStart={onStart} autoFocus />
        </div>
        <h2 className="mt-12 text-[20px] font-semibold tracking-[-0.02em]">Or open an example</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {STARTERS.map((starter) => (
            <li key={starter.title}>
              <button
                type="button"
                onClick={() => onStartFrom(starter.doc)}
                className="group flex h-full w-full flex-col rounded-[18px] bg-card px-5 pt-4 pb-4.5 text-left shadow-[0_0_0_1px_var(--line),0_1px_2px_rgb(18_20_24/0.04)] transition-shadow hover:shadow-tile focus-visible:shadow-tile"
              >
                <span className="flex w-full items-center justify-between gap-3">
                  <span className="text-[16.5px] font-semibold tracking-[-0.01em] text-ink">{starter.title}</span>
                  <MIcon name="right" className="size-4 shrink-0 text-faint transition-colors group-hover:text-accent" />
                </span>
                <span className="mt-1.5 text-[14.5px] leading-[1.6] text-soft">{starter.summary}</span>
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
      className="flex h-16 items-center gap-3 rounded-[20px] bg-card pr-2.5 pl-6 shadow-[0_0_0_1px_var(--line),0_20px_30px_-24px_rgb(18_20_24/0.3)] transition-shadow focus-within:shadow-[0_0_0_2px_var(--accent),0_0_0_6px_var(--accent-tint)]"
    >
      <input
        autoFocus={autoFocus}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Start a note"
        aria-label="Start a note with this title"
        className="h-full min-w-0 flex-1 bg-transparent text-[18px] text-ink outline-none placeholder:text-faint"
        style={{ outline: "none" }}
      />
      <span className="hidden sm:inline-flex">
        <Kbd>Enter</Kbd>
      </span>
      <button type="submit" className={btnClass({ variant: "primary", size: "md" })}>
        <MIcon name="plus" className="size-4" />
        <span className="max-sm:sr-only">New note</span>
      </button>
    </form>
  );
}

function FoundHint({ values, count }: { values: string[]; count: number }) {
  return (
    <p className="mt-5 rounded-2xl bg-accent-tint px-5 py-3.5 text-[14px] leading-[1.9] text-soft">
      Dittle is keeping {count === 1 ? "1 value" : `${count} values`} in step across your notes, like{" "}
      {values.map((text, index) => (
        <span key={index}>
          <span className="tag font-medium">{text}</span>
          {index < values.length - 1 ? " " : ""}
        </span>
      ))}
      . Click one in a note to see where else it's used.
    </p>
  );
}

const BIG = "text-[56px] leading-none font-semibold tracking-[-0.045em] tabular-nums";
const TILE = "tile flex min-h-[180px] flex-col px-6 pt-5 pb-5.5";
const MONTH = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });
const WEEKDAY = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "UTC" });

function CollectionTile({ summary }: { summary: CollectionSummary }) {
  const { collection, count, scope, totals, latest } = summary;
  const [headline] = totals;
  const entries = `${count} ${count === 1 ? "entry" : "entries"}`;
  const partial = headline !== undefined && headline.counted < count;
  const detail = !headline?.average
    ? [entries, partial && `${headline.counted} with ${headline.field.name}`]
    : partial
      ? [`avg ${headline.average} from ${headline.counted} of ${count}`]
      : [entries, `avg ${headline.average}`];
  return (
    <Link to="/notes/collections/$collectionId" params={{ collectionId: collection.id }} className={`${TILE} outline-2 outline-transparent transition-[outline-color] hover:outline-accent`}>
      <span className="text-label text-faint">{collection.name}</span>
      <span className="mt-2 flex items-baseline gap-2.5">
        <span className={BIG}>{headline?.text ?? count}</span>
        <span className="text-[16px] text-soft">{headline ? `${headline.field.name} ${scope}` : scope}</span>
      </span>
      {headline && (
        <span className="mt-2.5 text-[14px] text-soft tabular-nums">{detail.filter(Boolean).join(" · ")}</span>
      )}
      {latest && (
        <span className="mt-auto line-clamp-2 pt-1.5 text-[14px] text-soft">
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
  const date = new Date(`${first.on}T00:00:00Z`);
  return (
    <div className={TILE}>
      <span className="text-label text-faint">Coming up</span>
      <Link to="/notes/$noteId" params={{ noteId: first.value.origin?.noteId ?? "" }} disabled={!first.value.origin?.noteId} className="group mt-3 flex items-center gap-4">
        <span aria-hidden className="w-[76px] shrink-0 -rotate-3 overflow-hidden rounded-2xl bg-card text-center shadow-[0_0_0_1px_var(--line),0_14px_20px_-14px_rgb(18_20_24/0.4)]">
          <span className="block bg-date py-1 text-[11px] font-bold tracking-[0.08em] text-date-ink uppercase">{MONTH.format(date)}</span>
          <span className="block pt-0.5 text-[32px] leading-tight font-semibold tracking-[-0.03em]">{date.getUTCDate()}</span>
          <span className="block pb-1.5 text-[11px] font-semibold text-soft">{WEEKDAY.format(date)}</span>
        </span>
        <span className="min-w-0">
          <span className="block text-[44px] leading-none font-semibold tracking-[-0.045em] tabular-nums transition-colors group-hover:text-accent-ink">{days === 0 ? "Today" : `${days} ${days === 1 ? "day" : "days"}`}</span>
          <span className="mt-1 block truncate text-[15px] text-soft">{first.value.subject?.label ?? noteTitle(first.value.origin?.noteId)}</span>
        </span>
      </Link>
      {rest.length > 0 && (
        <ul className="mt-auto divide-y divide-line pt-3 text-[14.5px]">
          {rest.map((item) => (
            <li key={item.value.id} className="flex justify-between gap-4 py-2">
              <span className="truncate font-medium text-ink">{item.value.subject?.label ?? noteTitle(item.value.origin?.noteId)}</span>
              <span className="shrink-0 text-soft tabular-nums">{dayLabel(item.on)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SuggestionTile({ suggestion, onCreate, onDismiss }: { suggestion: Suggestion; onCreate: () => void; onDismiss: () => void }) {
  return (
    <div className="sticky-note flex min-h-[180px] rotate-1 flex-col px-6 pt-5 pb-5.5">
      <span className="text-label text-sticky-soft">Suggested collection</span>
      <span className="mt-2 text-[23px] leading-tight font-semibold tracking-[-0.02em]">{suggestion.proposal.name}</span>
      <span className="mt-1 line-clamp-2 text-[15px] leading-normal">
        {suggestion.rowCount} rows · {suggestion.plan.collection.fields.map((field) => field.name).join(", ")}
      </span>
      <span className="mt-auto flex gap-2 pt-4">
        <button type="button" onClick={onCreate} className="inline-flex h-9 items-center rounded-[10px] bg-sticky-ink px-4 text-[14px] font-semibold text-sticky transition-opacity hover:opacity-90">
          Create
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={`Dismiss ${suggestion.proposal.name}`}
          className="inline-flex h-9 items-center rounded-[10px] bg-sticky-ink/8 px-4 text-[14px] font-semibold text-sticky-ink transition-colors hover:bg-sticky-ink/14"
        >
          Not now
        </button>
      </span>
    </div>
  );
}
