import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CaptureBox } from "@/features/capture/CaptureBox";
import { useCollectionSuggestions, type Suggestion } from "@/features/collections/suggestions";
import { glanceOf, type GlanceView } from "@/features/collections/glance";
import { daysUntil, upcomingDates, type Upcoming } from "@/features/collections/summary";
import { dayLabel } from "@/features/collections/format";
import { Onboarding, useOnboardingView } from "@/features/onboarding/Onboarding";
import { changeable } from "@/features/what-if/plan";
import { WhatIf } from "@/features/what-if/WhatIf";
import { Btn, MIcon } from "@/ui/kit";
import { collectionsQuery, foldersQuery, notesQuery, rowsQuery, startNote, valuesQuery, writes } from "./api";
import { noteWith, type NoteDoc } from "./note-doc";
import { sampleTrip } from "./sample-trip";
import { NoteTree } from "./NoteTree";
import { useOnline } from "./NotesShell";
import { showToast } from "./toast";
import type { Collection } from "./fact";
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
  const onboardingView = useOnboardingView(uid, notes.length === 0 && folders.length === 0);

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

  if (onboardingView !== "home") return <Onboarding uid={uid} view={onboardingView} onStart={(title) => start(title)} onStartFrom={startFrom} onSample={() => writes.createPlan(uid, sampleTrip())} />;

  const upcoming = upcomingDates(values, rows);
  const tracking = collections.length > 0 || upcoming.length > 0 || suggestions.suggestions.length > 0;
  const noteTitle = (noteId: string | undefined) => notes.find((note) => note.id === noteId)?.title || "Untitled";

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[760px] px-4 pt-8 pb-24 sm:px-8 sm:pt-12">
        <h1 className="sr-only">Your notes</h1>
        <p className="mb-3.5 text-[14px] text-faint">{TODAY.format(new Date())}</p>
        <CaptureBox uid={uid} onStartNote={(title) => start(title)} />
        {tracking && (
          <section aria-labelledby="tracking-heading" className="mt-9">
            <h2 id="tracking-heading" className={SECTION}>
              Tracking
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {collections.map((collection) => (
                <GlanceCard key={collection.id} collection={collection} view={glanceOf(collection, rows, values)} />
              ))}
              {upcoming.length > 0 && <NextUpCard items={upcoming} noteTitle={noteTitle} />}
              {suggestions.suggestions.map((suggestion) => (
                <SuggestionCard key={suggestion.id} suggestion={suggestion} onCreate={() => createSuggested(suggestion.id)} onDismiss={() => suggestions.dismiss(suggestion.id)} />
              ))}
            </div>
          </section>
        )}

        {changeable(values).length > 0 && <WhatIf uid={uid} values={values} notes={notes} />}
        {!tracking && values.length > 0 && <FoundHint values={values.slice(0, 3).map((value) => value.text)} count={values.length} />}

        <div className="mt-9 flex items-center justify-between">
          <h2 className={SECTION}>Notes</h2>
          <Btn variant="quiet" onClick={() => setCreatingFolder(true)}>
            <MIcon name="folder" className="size-4" />
            New folder
          </Btn>
        </div>
        <nav aria-label="Notes" className="mt-1.5">
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

const TODAY = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" });
const SECTION = "text-[13px] font-semibold text-faint";
const CARD = "flex min-h-[96px] flex-col rounded-xl border border-line px-4 pt-3.5 pb-3";
const FIGURE = "text-[26px] leading-none font-semibold tracking-[-0.03em] tabular-nums";

function FoundHint({ values, count }: { values: string[]; count: number }) {
  return (
    <p className="mt-6 rounded-xl border border-line px-4 py-3 text-[14px] leading-[1.9] text-soft">
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

function GlanceCard({ collection, view }: { collection: Collection; view: GlanceView }) {
  return (
    <Link to="/notes/collections/$collectionId" params={{ collectionId: collection.id }} className={`${CARD} transition-colors hover:bg-panel`}>
      <span className="flex items-start justify-between gap-3 text-[13.5px] text-soft">
        <span className="truncate">{collection.name}</span>
        {view.aside ? <span className="shrink-0 text-faint">{view.aside}</span> : <Mini view={view} />}
      </span>
      <span className="mt-auto flex min-w-0 items-baseline gap-1.5 pt-2">
        <span className={FIGURE}>{view.figure}</span>
        <span className="truncate text-[14px] text-soft">{view.caption}</span>
      </span>
    </Link>
  );
}

function Mini({ view }: { view: GlanceView }) {
  if (view.bars?.length) {
    return (
      <span aria-hidden className="flex h-[18px] shrink-0 items-end gap-[3px]">
        {view.bars.map((height, index, all) => (
          <span key={index} className={`w-[5px] rounded-[1.5px] ${index === all.length - 1 ? "bg-ink" : "bg-line-strong"}`} style={{ height: `${Math.max(3, height * 18)}px` }} />
        ))}
      </span>
    );
  }
  if (view.dots) {
    return (
      <span aria-hidden className="flex h-[18px] shrink-0 items-center gap-[5px]">
        {view.dots.map((on, index) => (
          <span key={index} className={`size-[6px] rounded-full ${on ? "bg-ink" : "bg-line-strong"}`} />
        ))}
      </span>
    );
  }
  if (view.line && view.line.length > 1) {
    const step = 48 / (view.line.length - 1);
    const points = view.line.map((height, index) => `${(index * step).toFixed(1)},${(16 - height * 14).toFixed(1)}`).join(" ");
    return (
      <svg aria-hidden viewBox="-1 0 50 18" className="h-[18px] w-[50px] shrink-0 text-soft">
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return null;
}

function NextUpCard({ items, noteTitle }: { items: Upcoming[]; noteTitle: (noteId: string | undefined) => string }) {
  const [first, ...rest] = items;
  if (!first) return null;
  const days = daysUntil(first.on);
  return (
    <div className={CARD}>
      <span className="flex items-start justify-between gap-3 text-[13.5px] text-soft">
        <span>Next up</span>
        <span className="shrink-0 text-faint">{dayLabel(first.on)}</span>
      </span>
      <Link to="/notes/$noteId" params={{ noteId: first.value.origin?.noteId ?? "" }} disabled={!first.value.origin?.noteId} className="group mt-auto flex min-w-0 items-baseline gap-1.5 pt-2">
        <span className={FIGURE}>{days === 0 ? "Today" : `${days} ${days === 1 ? "day" : "days"}`}</span>
        <span className="truncate text-[14px] text-soft group-hover:text-ink">{first.value.subject?.label ?? noteTitle(first.value.origin?.noteId)}</span>
      </Link>
      {rest.length > 0 && (
        <ul className="mt-2.5 space-y-0.5 border-t border-line pt-2 text-[13px]">
          {rest.map((item) => (
            <li key={item.value.id} className="flex justify-between gap-3">
              <span className="truncate text-soft">{item.value.subject?.label ?? noteTitle(item.value.origin?.noteId)}</span>
              <span className="shrink-0 text-faint tabular-nums">{dayLabel(item.on)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SuggestionCard({ suggestion, onCreate, onDismiss }: { suggestion: Suggestion; onCreate: () => void; onDismiss: () => void }) {
  return (
    <div className={CARD}>
      <span className="text-[13.5px] text-soft">Suggested collection</span>
      <span className="mt-1 truncate text-[16px] font-semibold">{suggestion.proposal.name}</span>
      <span className="mt-0.5 line-clamp-2 text-[13.5px] text-faint">
        {suggestion.rowCount} rows · {suggestion.plan.collection.fields.map((field) => field.name).join(", ")}
      </span>
      <span className="mt-auto flex gap-1.5 pt-3">
        <Btn primary onClick={onCreate}>
          Create
        </Btn>
        <Btn variant="quiet" onClick={onDismiss}>
          <span className="sr-only">Dismiss {suggestion.proposal.name}: </span>Not now
        </Btn>
      </span>
    </div>
  );
}
