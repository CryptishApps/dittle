import { STARTERS } from "@/features/notes/starters";
import type { NoteDoc } from "@/features/notes/note-doc";
import { MIcon } from "@/ui/kit";
import { StartNote } from "@/features/capture/CaptureBox";

export function Onboarding({ onStart, onStartFrom }: { uid: string; onStart: (title: string) => void; onStartFrom: (doc: NoteDoc) => void }) {
  return <FirstVisit onStart={onStart} onStartFrom={onStartFrom} />;
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

