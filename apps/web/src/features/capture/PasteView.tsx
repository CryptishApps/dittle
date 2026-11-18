import { useEffect, useState } from "react";
import type { NoteDraft } from "@/features/ai/capture-answer";
import { dayLabel } from "@/features/collections/format";
import { daysUntil } from "@/features/collections/summary";
import { rawDraft, saveDraft, tidy, type CaptureContext, type Outcome } from "./apply";
import { formulasFor, inlinesFor } from "./draft";
import { CaptureIcon } from "./icons";
import type { Sample } from "./sample-clips";
import { Samples } from "./Samples";

export type Paste = { text: string; sample?: Sample };

type Made = { state: "working" } | { state: "ready"; draft: NoteDraft } | { state: "failed"; draft: NoteDraft };

type PasteViewProps = {
  paste: Paste;
  context: CaptureContext;
  onSample: (sample: Sample) => void;
  onClose: () => void;
  onSaved: (said: string, outcome: Outcome & { noteId: string }, edit: boolean) => void;
};

const firstLine = (text: string) => {
  const [line = ""] = text.split("\n");
  return line.length > 60 ? `${line.slice(0, 60)}…` : line;
};

export function PasteView({ paste, context, onSample, onClose, onSaved }: PasteViewProps) {
  const [made, setMade] = useState<Made>({ state: "working" });

  useEffect(() => {
    let live = true;
    tidy(paste.text).then(
      (draft) => live && setMade({ state: "ready", draft }),
      (error: unknown) => {
        console.warn("Dittle could not tidy a paste", error);
        if (live) setMade({ state: "failed", draft: rawDraft(paste.text) });
      },
    );
    return () => {
      live = false;
    };
  }, [paste.text]);

  const save = (edit: boolean) => {
    if (made.state === "working") return;
    const outcome = saveDraft(context, made.draft);
    onSaved(`${firstLine(paste.text)}…`, made.state === "failed" ? { ...outcome, details: [{ text: "Dittle couldn't tidy it, so it's saved as pasted" }] } : outcome, edit);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Enter" && !event.shiftKey && made.state !== "working" && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault();
        save(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <section aria-label="Paste the mess" className="grid gap-10 lg:grid-cols-[minmax(0,440px)_minmax(0,560px)] lg:justify-center lg:gap-12">
      <div className="min-w-0">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-faint">You pasted</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-lg text-faint transition-colors hover:bg-chip hover:text-ink">
            <CaptureIcon name="close" />
          </button>
        </div>
        {paste.sample?.chat ? (
          <ol className="mt-2.5 flex flex-col gap-[7px]">
            {paste.sample.chat.map((line, index) => (
              <li key={index} className="max-w-[92%] rounded-[12px_12px_12px_4px] bg-chip px-3 py-2 text-[14.5px] leading-[1.45] text-ink">
                <b className="block text-[12.5px] font-semibold text-faint">{line.who}</b>
                {line.said}
              </li>
            ))}
          </ol>
        ) : (
          <pre className="mt-2.5 max-h-[420px] overflow-auto rounded-xl bg-chip px-4 py-3 font-sans text-[14.5px] leading-[1.55] whitespace-pre-wrap text-ink">{paste.text}</pre>
        )}
        <Samples onSample={onSample} className="mt-[18px]" />
      </div>
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold text-faint">
          <CaptureIcon name="arrow" className="size-4" />
          Dittle made
        </h2>
        <div className="mt-3 rounded-[14px] bg-card px-7 pt-6 pb-5 shadow-[0_0_0_1px_var(--line)]">
          {made.state === "working" ? <Working /> : <DraftNote draft={made.draft} />}
          {made.state === "failed" && <p className="mt-3 border-t border-line pt-3 text-[13.5px] text-faint">Dittle couldn't tidy this just now. You can save it as pasted.</p>}
        </div>
        <div className="mt-[18px] flex gap-2.5">
          <button type="button" disabled={made.state === "working"} onClick={() => save(false)} className={`${BUTTON} bg-ink text-page hover:opacity-90`}>
            Save note
            <CaptureIcon name="enter" className="size-3.5 opacity-65" />
          </button>
          <button type="button" disabled={made.state === "working"} onClick={() => save(true)} className={`${BUTTON} bg-card text-ink shadow-[inset_0_0_0_1px_var(--line-strong)] hover:bg-chip`}>
            Edit first
          </button>
        </div>
      </div>
    </section>
  );
}

const BUTTON = "inline-flex h-11 items-center gap-2 rounded-[10px] px-[18px] text-[15px] font-semibold transition-colors disabled:opacity-50";

const TIDYING = "Writing it up…";

function Working() {
  return (
    <div aria-busy className="flex flex-col gap-3">
      <span className="t-shimmer-text text-[17px]" data-text={TIDYING}>
        {TIDYING}
      </span>
      {[92, 78, 85].map((width) => (
        <span key={width} className="h-3.5 animate-pulse rounded bg-chip" style={{ width: `${width}%` }} />
      ))}
    </div>
  );
}

function DraftNote({ draft }: { draft: NoteDraft }) {
  const all = draft.paragraphs.flatMap((paragraph) => paragraph.values);
  const formulas = formulasFor(all);
  let offset = 0;
  const paragraphs = draft.paragraphs.map((paragraph) => {
    const start = offset;
    offset += paragraph.values.length;
    return { text: paragraph.text, inlines: inlinesFor(paragraph.text, paragraph.values.map((value, index) => ({ id: String(start + index), quote: value.quote }))) };
  });
  const dated = all.find((value) => value.kind === "date" && value.when && (value.when.grain === "day" || value.when.grain === "time") && daysUntil(value.when.on.slice(0, 10)) >= 0);
  const notes = [
    ...(dated?.when ? [`Adds ${dayLabel(dated.when.on.slice(0, 10))} to Coming up`] : []),
    ...[...formulas].map(([index, formula]) => `${all[index]!.quote} follows ${formula.inputs.map((input) => all[Number(input)]!.name.replaceAll("_", " ")).join(" and ")}`),
  ];
  return (
    <>
      <h3 className="text-[26px] leading-tight font-semibold tracking-[-0.03em] text-ink">{draft.title || "Untitled"}</h3>
      <div className="mt-3 flex flex-col gap-1 text-[16.5px] leading-[1.8] text-ink">
        {paragraphs.map((paragraph, index) => (
          <p key={index}>
            {paragraph.inlines.map((inline, part) =>
              inline.t === "value" ? (
                <span
                  key={part}
                  className={`rounded-[5px] px-1 py-px font-medium text-accent-ink ${formulas.has(Number(inline.id)) ? "border border-dashed border-accent-line bg-card" : "bg-accent-tint"}`}
                >
                  {inline.label}
                </span>
              ) : (
                <span key={part}>{inline.text}</span>
              ),
            )}
          </p>
        ))}
      </div>
      {notes.length > 0 && (
        <div className="mt-3.5 flex flex-col gap-1 border-t border-line pt-3 text-[13.5px] text-faint">
          {notes.map((note) => (
            <span key={note}>{note}</span>
          ))}
        </div>
      )}
    </>
  );
}
