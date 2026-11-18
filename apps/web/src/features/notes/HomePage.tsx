import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { MotionConfig } from "motion/react";
import { useState } from "react";
import { CaptureBox } from "@/features/capture/CaptureBox";
import { useCollectionSuggestions, type Suggestion } from "@/features/collections/suggestions";
import { glanceOf, timelineOf } from "@/features/collections/glance";
import { FIGURE, GlanceCard, MiniChart, useFigure } from "@/features/collections/GlanceCard";
import { daysUntil, upcomingDates, type Upcoming } from "@/features/collections/summary";
import { dayLabel } from "@/features/collections/format";
import { Onboarding, useOnboardingView } from "@/features/onboarding/Onboarding";
import { changeable } from "@/features/what-if/plan";
import { WhatIf } from "@/features/what-if/WhatIf";
import { Btn, MIcon } from "@/ui/kit";
import { collectionsQuery, foldersQuery, notesQuery, rowsQuery, startNote, valuesQuery, writes } from "./api";
import { noteWith, type NoteDoc } from "./note-doc";
import { sampleTrip } from "./sample-trip";
import { NotesViewSwitch, NoteTree, RecentList, useNotesView } from "./NoteTree";
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
  const [notesView, setNotesView] = useNotesView();
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
          <section aria-labelledby="tracking-heading" className="mt-7">
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

        <MotionConfig reducedMotion="user">
          <section aria-labelledby="notes-heading" className="mt-10">
            <div className="flex min-h-9 items-center gap-2 border-b border-line pb-2">
              <h2 id="notes-heading" className={`${SECTION} mr-auto`}>
                Notes
              </h2>
              {notesView === "folders" && (
                <Btn variant="quiet" onClick={() => setCreatingFolder(true)}>
                  <MIcon name="folder" className="size-4" />
                  New folder
                </Btn>
              )}
              <NotesViewSwitch
                view={notesView}
                onChange={(view) => {
                  setNotesView(view);
                  if (view === "recent") setCreatingFolder(false);
                }}
              />
            </div>
            <nav aria-label="Notes" className="mt-1.5">
              {notesView === "recent" ? (
                <RecentList uid={uid} notes={notes} folders={folders} onDeleteNote={(note) => void removeNote(note)} />
              ) : (
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
              )}
            </nav>
          </section>
        </MotionConfig>
      </div>
    </div>
  );
}

const TODAY = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" });
const SECTION = "text-[13px] font-semibold text-faint";
const CARD = "flex min-h-[96px] flex-col rounded-xl border border-line px-4 pt-3 pb-3";

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

function NextUpCard({ items, noteTitle }: { items: Upcoming[]; noteTitle: (noteId: string | undefined) => string }) {
  const [first, ...rest] = items;
  const days = first ? daysUntil(first.on) : 0;
  const { figure, grow } = useFigure("next-up", days === 0 ? "Today" : `${days} ${days === 1 ? "day" : "days"}`);
  if (!first) return null;
  return (
    <div className={CARD}>
      <span className="text-[13.5px] leading-[18px] text-soft">Next up</span>
      <Link to="/notes/$noteId" params={{ noteId: first.value.origin?.noteId ?? "" }} disabled={!first.value.origin?.noteId} className="group mt-auto flex min-w-0 flex-col">
        <span className="flex items-end gap-3">
          <span className={FIGURE}>{figure}</span>
          <MiniChart chart={timelineOf(items.map((item) => daysUntil(item.on)))} grow={grow} />
        </span>
        <span className="mt-0.5 truncate text-[13px] leading-4 text-soft group-hover:text-ink">
          {first.value.subject?.label ?? noteTitle(first.value.origin?.noteId)}
          <span className="text-faint"> · {dayLabel(first.on)}</span>
        </span>
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
