import { useState, type ReactNode } from "react";
import { SourceTag } from "../../../ui/InferenceMeter";
import { BucketsPanel, CollectionsPanel, InsertPanel, MeterPanel, OfflinePanel, RecalcPanel, SavingPanel, UpdatePanel } from "./panels";

export function Moments() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
      <h1 className="text-[40px] font-extrabold tracking-[-0.04em]">Where the AI shows its work</h1>
      <p className="mt-2 max-w-[60ch] text-ink-soft">
        Linking happens quietly in the background. These are the moments it surfaces. Replay any card.
      </p>
      <div className="mt-10 grid items-start gap-5 md:grid-cols-2">
        <Moment title="Change it once" source="device" note="Edit a number. The device already knows which notes mention it.">
          <UpdatePanel />
        </Moment>
        <Moment title="Ask inside the note" source="device" note="The list is written before you click. Hover to preview.">
          <InsertPanel />
        </Moment>
        <Moment title="Buckets sort themselves" source="device" note="A new note gets a bucket from what it says. No folders to pick.">
          <BucketsPanel />
        </Moment>
        <Moment title="Sums that keep up" source="none" note="Code does the maths. The AI only worked out which numbers were linked.">
          <RecalcPanel />
        </Moment>
        <Moment title="Collections" source="cloud" note="The cloud sees extracted values and titles, never full notes.">
          <CollectionsPanel />
        </Moment>
        <Moment title="Offline" source="device" note="Writing, saving and on-device AI all work without a connection.">
          <OfflinePanel />
        </Moment>
        <Moment title="AI activity" source="device" note="Every call is counted by where it ran.">
          <MeterPanel />
        </Moment>
        <Moment title="Saving" source="none" note="Writes land on the device first. Never wait on a save.">
          <SavingPanel />
        </Moment>
      </div>
    </div>
  );
}

function Moment({
  title,
  source,
  note,
  children,
}: {
  title: string;
  source: "device" | "cloud" | "none";
  note: string;
  children: ReactNode;
}) {
  const [run, setRun] = useState(0);
  return (
    <section className="rounded-[32px] bg-paper-sunk/60 p-2">
      <header className="flex items-center justify-between gap-3 px-3 pt-2 pb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[16px] font-extrabold tracking-[-0.02em]">{title}</h2>
          {source === "none" ? <span className="text-[11px] text-ink-faint">No AI</span> : <SourceTag source={source} />}
        </div>
        <button
          type="button"
          onClick={() => setRun((n) => n + 1)}
          className="rounded-full px-3 py-1 text-[13px] text-ink-soft transition hover:bg-paper-raised hover:text-ink"
        >
          Replay
        </button>
      </header>
      <div key={run}>{children}</div>
      <p className="px-3 pt-3 pb-1.5 text-[13px] text-ink-soft">{note}</p>
    </section>
  );
}
