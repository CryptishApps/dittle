import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Reprint } from "../../ui/Reprint";
import { StreamedText, useStreamedWords } from "../../ui/StreamIn";
import { bodyFor, MEALS, NOTES, PATHS, VARIABLES, type NoteId, type Part, type Token, type VarId } from "./data";
import { Btn, ease, MIcon, Path, Scramble } from "../../ui/kit";

export type Change = { from: number; to: number } | null;

export type NoteContext = {
  current: number;
  valueFor: (id: NoteId) => number;
  change: Change;
  done: string | null;
  onEditGuests: (next: number) => void;
  onUpdate: (ids: NoteId[]) => void;
  onSkip: () => void;
  onOpen: (id: NoteId) => void;
};

const LINKED: VarId[] = ["guests", "food"];

export function staleIn(ctx: NoteContext, id: NoteId, v: VarId): boolean {
  return id !== "catering" && LINKED.includes(v) && ctx.valueFor(id) !== ctx.current;
}

export function staleNotes(ctx: NoteContext): NoteId[] {
  return VARIABLES.guests.notes.filter((id) => staleIn(ctx, id, "guests"));
}

export function NoteView({ noteId, ctx, firstRead }: { noteId: NoteId; ctx: NoteContext; firstRead: boolean }) {
  const [found, setFound] = useState(false);
  const [reading, setReading] = useState(firstRead);
  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        setReading(false);
        setFound(true);
      },
      firstRead ? 1700 : 220,
    );
    return () => window.clearTimeout(timer);
  }, [firstRead]);

  const note = NOTES[noteId];
  const body = bodyFor(noteId);
  const values = new Set(body.flat().flatMap((part) => (typeof part === "string" ? [] : [part.v]))).size;
  let tokenIndex = 0;

  return (
    <article className="mx-auto max-w-[720px] px-10 pt-14 pb-32">
      <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
        <Path parts={PATHS[noteId]} />
      </m.div>
      <m.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.45, ease }}
        className="mt-6 text-[30px] leading-[1.15] font-medium tracking-[-0.03em]"
      >
        {note.title}
      </m.h1>
      <m.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="mt-3 flex flex-wrap gap-x-4 text-[11px] tracking-[0.02em] text-faint uppercase"
      >
        <span>{note.subtitle}</span>
        <span>Edited {note.edited} ago</span>
        <span>
          {reading ? (
            <span className="t-shimmer-text" data-text="Reading">
              Reading
            </span>
          ) : (
            <Scramble text={`${values} ${values === 1 ? "value" : "values"}`} />
          )}
        </span>
      </m.p>

      <m.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.5, ease }}
        className="mt-10 border-t border-line pt-8 text-[15px] leading-[1.95]"
      >
        {body.map((paragraph, index) => (
          <div key={index}>
            <Para n={index + 1 + (noteId === "catering" && index >= 2 ? 1 : 0)} reading={reading && index === 0}>
              {paragraph.map((part, partIndex) =>
                typeof part === "string" ? (
                  <span key={partIndex}>{part}</span>
                ) : (
                  <TokenView key={partIndex} token={part} noteId={noteId} ctx={ctx} found={found} delay={tokenIndex++ * 90} />
                ),
              )}
            </Para>
            {noteId === "catering" && index === 0 && <ChangeBlock ctx={ctx} />}
            {noteId === "catering" && index === 1 && <MealsRequest ready={found} />}
          </div>
        ))}
      </m.div>
    </article>
  );
}

function Para({ n, reading, children }: { n: number; reading: boolean; children: ReactNode }) {
  return (
    <p className="relative mt-5">
      <span
        aria-hidden
        className={`absolute top-0 -left-10 text-[10px] tabular-nums transition-colors duration-300 ${reading ? "text-accent" : "text-faint/60"}`}
      >
        {String(n).padStart(2, "0")}
      </span>
      <span className={reading ? "caret" : undefined}>{children}</span>
    </p>
  );
}

function TokenView({ token, noteId, ctx, found, delay }: { token: Token; noteId: NoteId; ctx: NoteContext; found: boolean; delay: number }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const g = ctx.valueFor(noteId);
  const text = token.text(g);
  const state = staleIn(ctx, noteId, token.v) ? "stale" : token.editable && ctx.change ? "changed" : "idle";

  const show = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(true), 140);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(false), 180);
  };

  const common = {
    className: "token",
    "data-found": found,
    "data-open": open && !editing,
    "data-state": state,
    "data-kind": VARIABLES[token.v].derived ? "derived" : "value",
    style: { "--token-delay": `${delay}ms` } as CSSProperties,
  };

  return (
    <span className="relative" onMouseEnter={found ? show : undefined} onMouseLeave={hide}>
      {token.editable ? (
        <span
          {...common}
          key={g}
          role="textbox"
          aria-label={VARIABLES[token.v].label}
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          onFocus={() => {
            setEditing(true);
            setOpen(false);
          }}
          onBlur={(event) => {
            setEditing(false);
            const next = Number(event.currentTarget.textContent?.trim());
            if (Number.isInteger(next) && next > 0) ctx.onEditGuests(next);
            else event.currentTarget.textContent = String(g);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
        >
          {text}
        </span>
      ) : (
        <span {...common} tabIndex={found ? 0 : -1} onFocus={show} onBlur={hide}>
          <Reprint value={text} />
        </span>
      )}
      <AnimatePresence>
        {open && !editing && (
          <m.span
            initial={{ opacity: 0, y: -4, scale: 0.98, filter: "blur(3px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -2, scale: 0.99, transition: { duration: 0.12 } }}
            transition={{ duration: 0.22, ease }}
            style={{ transformOrigin: "top left" }}
            className="absolute top-full left-0 z-40 mt-2 block"
            onMouseEnter={show}
            onMouseLeave={hide}
          >
            <ValueCard token={token} noteId={noteId} ctx={ctx} />
          </m.span>
        )}
      </AnimatePresence>
    </span>
  );
}

function ValueCard({ token, noteId, ctx }: { token: Token; noteId: NoteId; ctx: NoteContext }) {
  const variable = VARIABLES[token.v];
  const g = ctx.valueFor(noteId);
  const others = variable.notes.filter((id) => id !== noteId);
  const stale = others.filter((id) => staleIn(ctx, id, token.v));
  const selfStale = staleIn(ctx, noteId, token.v);

  return (
    <span className="block w-[400px] border border-line-strong bg-card text-[12px] leading-[1.6] tracking-normal text-ink shadow-pop">
      <span className="flex items-center justify-between border-b border-line px-3 py-2 text-[10.5px] tracking-[0.04em] uppercase">
        <span className="font-medium">{variable.label}</span>
        <span className="text-faint">Found on device · 180 ms</span>
      </span>
      <span className="flex items-baseline gap-3 px-3 pt-3">
        <span className="text-[22px] leading-none font-medium tracking-[-0.02em]">{token.text(g)}</span>
        {variable.derived && <span className="text-soft">= {variable.derived(g)}</span>}
      </span>
      {selfStale && (
        <span className="mx-3 mt-3 flex items-center justify-between gap-3 border-l-2 border-accent bg-accent-tint px-2.5 py-2">
          <span className="text-accent-ink">Catering quote now says {ctx.current}</span>
          <Btn primary onClick={() => ctx.onUpdate([noteId])}>
            Use {ctx.current}
          </Btn>
        </span>
      )}
      <span className="mt-3 block px-3 text-[10.5px] tracking-[0.04em] text-faint uppercase">
        {others.length ? `Also in ${others.length} ${others.length === 1 ? "note" : "notes"}` : "Only in this note"}
      </span>
      <span className="block px-1.5 pt-1 pb-1.5">
        {others.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => ctx.onOpen(id)}
            className="block w-full px-1.5 py-1.5 text-left transition-colors hover:bg-panel"
          >
            <span className="flex items-center justify-between gap-2">
              <span className="link">{NOTES[id].title}</span>
              {staleIn(ctx, id, token.v) && (
                <span className="text-[10px] tracking-[0.04em] text-accent-ink uppercase">Says {ctx.valueFor(id)}</span>
              )}
            </span>
            <span className="mt-0.5 line-clamp-2 block text-soft">
              <Snippet noteId={id} v={token.v} g={ctx.valueFor(id)} />
            </span>
          </button>
        ))}
      </span>
      {(stale.length > 0 && !selfStale) || token.editable ? (
        <span className="flex items-center justify-between gap-3 border-t border-line px-3 py-2">
          <span className="text-[10.5px] tracking-[0.04em] text-faint uppercase">{token.editable ? "Click the value to edit" : ""}</span>
          {stale.length > 0 && !selfStale && (
            <Btn primary onClick={() => ctx.onUpdate(stale)}>
              Update {stale.length}
            </Btn>
          )}
        </span>
      ) : null}
    </span>
  );
}

function Snippet({ noteId, v, g }: { noteId: NoteId; v: VarId; g: number }) {
  const paragraph = bodyFor(noteId).find((parts) => parts.some((part) => typeof part !== "string" && part.v === v)) ?? [];
  return (
    <>
      {paragraph.map((part: Part, index) =>
        typeof part === "string" ? (
          <span key={index}>{part}</span>
        ) : (
          <span key={index} className={part.v === v ? "bg-chip px-0.5 text-ink" : undefined}>
            {part.text(g)}
          </span>
        ),
      )}
    </>
  );
}

function ChangeBlock({ ctx }: { ctx: NoteContext }) {
  const stale = staleNotes(ctx);
  const visible = (ctx.change && stale.length > 0) || ctx.done;
  return (
    <AnimatePresence initial={false}>
      {visible && (
        <m.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.4, ease }}
          className="overflow-hidden"
        >
          <div className="mt-4 border-l-2 border-accent bg-panel px-4 py-3 text-[13px] leading-[1.6]">
            {ctx.done ? (
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2">
                  <MIcon name="check" className="size-4 text-accent" />
                  <Scramble text={ctx.done} duration={500} />
                </span>
                <Btn>Undo</Btn>
              </div>
            ) : (
              ctx.change && (
                <>
                  <div className="flex items-center justify-between gap-4 text-[10.5px] tracking-[0.04em] uppercase">
                    <span className="flex items-center gap-2">
                      <span className="font-medium">Guest count</span>
                      <span className="bg-chip px-1.5 py-0.5 text-soft">
                        {ctx.change.from} → <span className="text-accent-ink">{ctx.change.to}</span>
                      </span>
                    </span>
                    <span className="text-faint">On device · 240 ms</span>
                  </div>
                  <p className="mt-2 text-soft">
                    {stale.length} {stale.length === 1 ? "note still says" : "notes still say"} {ctx.change.from}:{" "}
                    {stale.map((id, index) => (
                      <span key={id}>
                        <button type="button" onClick={() => ctx.onOpen(id)} className="link">
                          {NOTES[id].title}
                        </button>
                        {index < stale.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Btn primary onClick={() => ctx.onUpdate(stale)}>
                      Update {stale.length} {stale.length === 1 ? "note" : "notes"}
                    </Btn>
                    <Btn onClick={ctx.onSkip}>Only this note</Btn>
                  </div>
                </>
              )
            )}
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

function MealsRequest({ ready }: { ready: boolean }) {
  const [state, setState] = useState<"idle" | "peek" | "inserted">("idle");
  if (state === "inserted") return <InsertedMeals />;
  return (
    <div className="relative mt-5">
      <span aria-hidden className="absolute top-0 -left-10 text-[10px] text-faint/60 tabular-nums">
        03
      </span>
      <span className="text-faint underline decoration-line-strong decoration-dashed underline-offset-4">add in a list of meals here</span>
      <AnimatePresence>
        {ready && (
          <m.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5, duration: 0.35, ease }} className="ml-3 inline-block align-middle">
            <span onMouseEnter={() => setState("peek")} onMouseLeave={() => setState("idle")} onFocus={() => setState("peek")} onBlur={() => setState("idle")}>
              <Btn onClick={() => setState("inserted")} className="-translate-y-px">
                <MIcon name="plus" className="size-3" />
                Insert 7 meals
              </Btn>
            </span>
          </m.span>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {state === "peek" && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease }}
            className="overflow-hidden"
          >
            <div className="mt-3 border border-dashed border-line-strong px-4 py-3 text-[13px] leading-[1.8] text-soft">
              <span className="mb-1 block text-[10.5px] tracking-[0.04em] text-faint uppercase">Preview · on device · 1.9 s · 188 tokens</span>
              {MEALS.map((meal) => (
                <span key={meal} className="block">
                  – {meal}
                </span>
              ))}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InsertedMeals() {
  const words = MEALS.map((meal) => meal.split(" "));
  const total = words.reduce((sum, w) => sum + w.length, 0);
  const shown = useStreamedWords(total, true);
  let offset = 0;
  return (
    <div className="relative mt-5">
      <span aria-hidden className="absolute top-0 -left-10 text-[10px] text-faint/60 tabular-nums">
        03
      </span>
      <ul>
        {words.map((meal, index) => {
          const start = offset;
          offset += meal.length;
          return (
            <li key={index} className="flex gap-3">
              <span aria-hidden className={start < shown ? "text-faint" : "text-transparent"}>
                –
              </span>
              <span>
                <StreamedText words={meal} offset={start} shown={shown} />
              </span>
            </li>
          );
        })}
      </ul>
      <span className="mt-1 block text-[10.5px] tracking-[0.04em] text-faint uppercase">
        {shown < total ? <Scramble text="Writing on device" /> : "Written on device · 1.9 s · 188 tokens"}
      </span>
    </div>
  );
}
