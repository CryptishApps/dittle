import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import type { NoteDraft } from "@/features/ai/capture-answer";
import { NumberRoll } from "@/features/what-if/NumberRoll";
import type { Where } from "@/features/onboarding/practice";
import { filingShelf, previewFiling, rawDraft, saveDraft, shownFiling, spotFormulas, tidy, type CaptureContext, type Outcome, type PreviewedFiling } from "./apply";
import { formulasFor, inlinesFor } from "./draft";
import { CaptureIcon } from "./icons";
import { keepLines, liveValues, spotsFor, tryItOf, tryValues, valuesOf, withTried, type KeepLine, type Tried, type TryIt } from "./keeps";
import type { Sample } from "./sample-clips";
import { Samples } from "./Samples";

export type Paste = { text: string; sample?: Sample };

type Made = { state: "working" } | { state: "ready"; draft: NoteDraft; spotting: boolean } | { state: "failed"; draft: NoteDraft };

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

const NOTHING_TRIED: Tried = new Map();
const NOWHERE: ReadonlyMap<number, Where> = new Map();

export function PasteView({ paste, context, onSample, onClose, onSaved }: PasteViewProps) {
  const [made, setMade] = useState<Made>({ state: "working" });
  const [trying, setTrying] = useState(false);
  const [wheres, setWheres] = useState<ReadonlyMap<number, Where> | null>(NOWHERE);
  const [previewed, setPreviewed] = useState<PreviewedFiling>();

  useEffect(() => {
    let live = true;
    tidy(paste.text).then(
      (draft) => {
        if (!live) return;
        const spotting = spotsFor(draft).length > 0;
        setMade({ state: "ready", draft, spotting });
        const shelf = filingShelf(context);
        if (shelf) {
          setWheres(null);
          previewFiling(shelf, draft).then(
            (found) => {
              if (!live) return;
              setWheres(found.wheres);
              setPreviewed(found);
            },
            (error: unknown) => {
              console.warn("Dittle could not preview where a paste files", error);
              if (live) setWheres(NOWHERE);
            },
          );
        }
        if (!spotting) return;
        void spotFormulas(draft).then(
          (spotted) => live && setMade({ state: "ready", draft: spotted, spotting: false }),
          (error: unknown) => {
            console.warn("Dittle could not check a paste for formulas", error);
            if (live) setMade({ state: "ready", draft, spotting: false });
          },
        );
      },
      (error: unknown) => {
        console.warn("Dittle could not tidy a paste", error);
        if (live) setMade({ state: "failed", draft: rawDraft(paste.text) });
      },
    );
    return () => {
      live = false;
    };
  }, [paste.text, context]);

  const draft = made.state === "working" ? undefined : made.draft;
  const tryIt = useMemo(() => (draft ? tryItOf(draft) : undefined), [draft]);
  const tried = useMemo(() => (draft && tryIt && trying ? tryValues(draft, tryIt) : NOTHING_TRIED), [draft, tryIt, trying]);

  const save = (edit: boolean) => {
    if (!draft) return;
    const filing = previewed && shownFiling(previewed, keepLines(draft, tried, undefined, previewed.wheres));
    const outcome = saveDraft(context, (tried.size > 0 && withTried(draft, tried)) || draft, { file: true, previewed: filing });
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
    <section aria-label="Paste the mess" className="grid gap-10 lg:mx-[calc((100%-min(1040px,100cqw-4rem))/2)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
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
          {made.state === "working" ? (
            <Working />
          ) : (
            <DraftNote draft={made.draft} tried={tried} tryIt={tryIt} wheres={wheres ?? NOWHERE} spotting={(made.state === "ready" && made.spotting) || wheres === null} onTry={() => setTrying((now) => !now)} />
          )}
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

const VALUE = "rounded-[5px] px-1 py-px font-medium whitespace-nowrap text-accent-ink bg-accent-tint";

function Rolling({ text }: { text: string }) {
  const [shown, setShown] = useState({ from: text, to: text });
  if (shown.to !== text) setShown({ from: shown.to, to: text });
  if (shown.from === shown.to) return <>{text}</>;
  return <NumberRoll key={`${shown.from}→${shown.to}`} from={shown.from} to={shown.to} />;
}

type DraftNoteProps = { draft: NoteDraft; tried: Tried; tryIt: TryIt | undefined; wheres: ReadonlyMap<number, Where>; spotting: boolean; onTry: () => void };

function DraftNote({ draft, tried, tryIt, wheres, spotting, onTry }: DraftNoteProps) {
  const lines = keepLines(draft, tried, undefined, wheres);
  const live = liveValues(draft, lines, tryIt);
  const worked = formulasFor(valuesOf(draft));
  let offset = 0;
  const paragraphs = draft.paragraphs.map((paragraph) => {
    const start = offset;
    offset += paragraph.values.length;
    return inlinesFor(paragraph.text, paragraph.values.map((value, index) => ({ id: String(start + index), quote: value.quote })));
  });
  const trying = tried.size > 0;
  return (
    <>
      <h3 className="text-[26px] leading-tight font-semibold tracking-[-0.03em] text-ink">{draft.title || "Untitled"}</h3>
      <div className="mt-3 flex flex-col gap-1 text-[16.5px] leading-[1.8] text-ink">
        {paragraphs.map((inlines, index) => (
          <p key={index}>
            {inlines.map((inline, part) => {
              if (inline.t !== "value") return <span key={part}>{inline.text}</span>;
              const at = Number(inline.id);
              const text = tried.get(at)?.text ?? inline.label;
              if (!live.has(at)) return <span key={part}>{text}</span>;
              if (tryIt && at === tryIt.index) {
                return (
                  <button
                    key={part}
                    type="button"
                    onClick={onTry}
                    aria-label={trying ? `Back to ${tryIt.fromText}` : `Try ${tryIt.toText} instead of ${tryIt.fromText}`}
                    className={`${VALUE} cursor-pointer outline-[1.5px] outline-offset-1 outline-accent-line outline-dashed hover:bg-accent-line/60`}
                  >
                    <Rolling text={text} />
                  </button>
                );
              }
              return (
                <span key={part} className={`${VALUE} ${worked.has(at) ? "shadow-[inset_0_-1.5px_0_var(--accent-ink)]" : ""}`}>
                  <Rolling text={text} />
                </span>
              );
            })}
          </p>
        ))}
      </div>
      <Keeps lines={lines} spotting={spotting} />
      {tryIt && <TryBox tryIt={tryIt} trying={trying} places={tried.size - 1} onTry={onTry} />}
    </>
  );
}

const CHECKING = "Checking what follows from what…";

function Keeps({ lines, spotting }: { lines: KeepLine[]; spotting: boolean }) {
  const still = useReducedMotion() ?? false;
  const grow = still ? {} : { initial: { opacity: 0, height: 0 }, animate: { opacity: 1, height: "auto" }, exit: { opacity: 0, height: 0 }, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const } };
  return (
    <AnimatePresence initial={false}>
      {(lines.length > 0 || spotting) && (
        <m.section key="keeps" aria-label="What Dittle keeps up to date" aria-busy={spotting} className="mt-4 overflow-hidden border-t border-line" {...grow}>
          <h4 className="mt-3 mb-1 text-[13px] font-semibold text-faint">What Dittle keeps up to date</h4>
          <div className="divide-y divide-line">
            <AnimatePresence initial={false}>
              {lines.map((line) => (
                <m.div key={`${line.kind}-${line.index}`} className="overflow-hidden" {...grow}>
                  <div className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-baseline gap-2.5 py-2.5 text-[14.5px]">
                    <span aria-hidden className="text-center font-mono text-[13px] text-faint">
                      {line.sign}
                    </span>
                    <span className="min-w-0 text-ink">
                      {line.label}
                      <span className="mt-px block text-[13px] text-faint">{line.how}</span>
                    </span>
                    <span className="font-semibold whitespace-nowrap text-accent-ink tabular-nums">
                      <Rolling text={line.figure} />
                    </span>
                  </div>
                </m.div>
              ))}
              {spotting && (
                <m.div key="checking" className="overflow-hidden" {...grow}>
                  <div aria-hidden className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-baseline gap-2.5 py-2.5 text-[14.5px]">
                    <span />
                    <span className="min-w-0">
                      <span className="t-shimmer-text" data-text={CHECKING}>
                        {CHECKING}
                      </span>
                      <span className="mt-1.5 block h-3 w-3/5 animate-pulse rounded bg-chip" />
                    </span>
                    <span className="h-3.5 w-14 animate-pulse rounded bg-chip" />
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </m.section>
      )}
    </AnimatePresence>
  );
}

function TryBox({ tryIt, trying, places, onTry }: { tryIt: TryIt; trying: boolean; places: number; onTry: () => void }) {
  return (
    <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-dashed border-accent-line px-3.5 py-3">
      <span className="text-[14px] text-soft">{trying ? `Saving keeps ${tryIt.toText}.` : `Try it: change ${tryIt.fromText} and see what follows.`}</span>
      <button type="button" onClick={onTry} className="inline-flex h-9 items-center rounded-[9px] bg-card px-3.5 text-[14px] font-medium text-ink shadow-[inset_0_0_0_1px_var(--line-strong)] transition-colors hover:bg-chip">
        {trying ? `Back to ${tryIt.fromText}` : `Make it ${tryIt.toText}`}
      </button>
      <span aria-live="polite" className={`text-[13px] text-accent-ink transition-opacity duration-300 ${trying ? "opacity-100" : "opacity-0"}`}>
        {trying ? `Updated in ${places} ${places === 1 ? "place" : "places"}` : ""}
      </span>
    </div>
  );
}
