import { AnimatePresence, motion } from "motion/react";
import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { Reprint } from "../../../../ui/Reprint";
import { StreamedText, useStreamedWords } from "../../../../ui/StreamIn";
import { MEALS, NOTES, type NoteId } from "./data";
import { Badge, BucketLabel, ease, NoteTile, SourceBadge } from "./kit";

export function NoteSheet({
  noteId,
  guests,
  reading,
  onGuests,
  confirmInline = true,
  onConfirm,
  aside,
}: {
  noteId: NoteId;
  guests: number;
  reading: boolean;
  onGuests: (next: number) => void;
  confirmInline?: boolean;
  onConfirm?: () => void;
  aside?: ReactNode;
}) {
  const note = NOTES[noteId];
  return (
    <div>
      <BucketLabel bucket={note.bucket} />
      <div className="rounded-2xl rounded-tl-none border border-rule bg-paper-raised p-2 shadow-card">
        <div className="flex items-center gap-3 p-3">
          <NoteTile color={note.tile} className="size-11" />
          <div className="min-w-0 flex-1">
            <h1 className="text-[24px] leading-tight font-semibold tracking-[-0.03em]">{note.title}</h1>
            <p className="text-[13px] text-ink-soft">{note.subtitle}</p>
          </div>
          {aside}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 px-3 pb-3">
          {reading ? (
            <span className="t-shimmer-text font-mono text-[10px] font-medium uppercase" data-text="Reading paragraph 1">
              Reading paragraph 1
            </span>
          ) : (
            <SourceBadge source="device" ms={180} />
          )}
          <Badge>{noteId === "catering" ? "4 links" : "1 link"}</Badge>
          <Badge>{noteId === "catering" ? "312 words" : "120 words"}</Badge>
          <span className="ml-auto font-mono text-[10px] text-ink-faint uppercase">Edited {note.edited} ago</span>
        </div>
        <div className="rounded-xl bg-paper-sunk/60 px-7 py-7 text-[17px] leading-[1.75]">
          {noteId === "catering" ? (
            <CateringBody guests={guests} reading={reading} onGuests={onGuests} confirmInline={confirmInline} onConfirm={onConfirm} />
          ) : (
            <>
              <Paragraph>{note.excerpt(guests)}</Paragraph>
              <Paragraph>
                <span className="text-ink-soft">Next: confirm with everyone by Friday.</span>
              </Paragraph>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export const ShowMargin = createContext(false);

export function CateringBody({
  guests,
  reading,
  onGuests,
  confirmInline,
  onConfirm,
}: {
  guests: number;
  reading: boolean;
  onGuests: (next: number) => void;
  confirmInline: boolean;
  onConfirm?: () => void;
}) {
  const [pending, setPending] = useState<{ from: number; to: number } | null>(null);
  const [meals, setMeals] = useState<"request" | "inserted">("request");

  const edit = (next: number) => {
    if (next === guests || next < 1) return;
    if (confirmInline) setPending({ from: guests, to: next });
    onGuests(next);
  };

  return (
    <>
      <Paragraph
        active={reading}
        n={1}
        margin={
          reading ? (
            <span className="t-shimmer-text" data-text="Reading">
              Reading
            </span>
          ) : (
            <>
              <SourceBadge source="device" ms={180} />
              <span className="block">Guests, price per head</span>
              <span className="block text-tx-blue">Also in 3 notes</span>
            </>
          )
        }
      >
        Rosa's Kitchen can do a buffet for{" "}
        <span className="relative inline-block">
          <EditableNumber value={guests} onCommit={edit} />
          <AnimatePresence>
            {pending && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25, ease }}
                className="absolute top-full left-0 z-30 mt-2"
                style={{ transformOrigin: "top left" }}
              >
                <ChangeCard
                  from={pending.from}
                  to={pending.to}
                  onApply={() => {
                    setPending(null);
                    onConfirm?.();
                  }}
                  onSkip={() => setPending(null)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </span>{" "}
        guests at £38 a head, so roughly <Reprint value={`£${(guests * 38).toLocaleString("en-GB")}`} highlight /> before drinks.
      </Paragraph>
      <Paragraph
        n={2}
        margin={
          !reading && (
            <>
              <SourceBadge source="device" ms={160} />
              <span className="block">Event date</span>
              <span className="block text-tx-blue">Also in 2 notes</span>
            </>
          )
        }
      >
        They need a £500 deposit to hold the date, and the menu has to be final two weeks before the 14th of June.</Paragraph>
      {meals === "request" ? (
        <Paragraph
          n={3}
          margin={
            !reading && (
              <>
                <SourceBadge source="device" ms={150} />
                <span className="block">Request spotted</span>
              </>
            )
          }
        >
          <span className="text-ink-soft">add in a list of meals here</span>
          {!reading && <InsertAction onInsert={() => setMeals("inserted")} />}
        </Paragraph>
      ) : (
        <InsertedMeals />
      )}
      <Paragraph n={4}>Tastings are on Thursdays. Ask about a vegan cake.</Paragraph>
    </>
  );
}

export function Paragraph({ active = false, n, margin, children }: { active?: boolean; n?: number; margin?: ReactNode; children: ReactNode }) {
  const showMargin = useContext(ShowMargin);
  return (
    <p className="relative mt-5 first:mt-0">
      {showMargin && n !== undefined && (
        <span aria-hidden className="absolute top-[0.45em] -left-14 font-mono text-[10px] leading-none text-ink-faint tabular-nums">
          ¶{String(n).padStart(2, "0")}
        </span>
      )}
      <AnimatePresence>
        {showMargin && margin && (
          <motion.span
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease }}
            className="absolute top-[0.2em] left-full ml-12 block w-44 space-y-1 border-l border-rule pl-3 font-mono text-[10px] leading-relaxed text-ink-faint uppercase"
          >
            {margin}
          </motion.span>
        )}
      </AnimatePresence>
      <span
        aria-hidden
        className={`absolute top-1 -left-4 h-[calc(100%-8px)] w-[2px] rounded-full bg-primary transition-opacity duration-500 ${active ? "animate-pulse opacity-100" : "opacity-0"}`}
      />
      {children}
    </p>
  );
}

function ChangeCard({ from, to, onApply, onSkip }: { from: number; to: number; onApply: () => void; onSkip: () => void }) {
  const rows: [string, string, string][] = [
    ["Budget", `Food: ${from} × £38`, `Food: ${to} × £38`],
    ["Chair hire", `${from} chairs`, `${to} chairs`],
    ["Email to Sam", `expecting ${from} people`, `expecting ${to} people`],
  ];
  return (
    <div role="dialog" aria-label="Update other notes" className="w-[24rem] rounded-2xl border border-rule bg-paper-raised p-2 text-[13px] shadow-pop">
      <div className="flex items-center justify-between px-2 pt-1 pb-2">
        <span className="font-semibold">
          Guest count {from} → {to}
        </span>
        <SourceBadge source="device" ms={240} />
      </div>
      <div className="rounded-xl bg-paper-sunk p-2">
        <p className="px-1 pb-1 font-mono text-[10px] text-ink-faint uppercase">Also in 3 notes</p>
        {rows.map(([title, before, after]) => (
          <div key={title} className="flex items-center gap-2 border-t border-rule px-1 py-2 first-of-type:border-0">
            <span className="w-24 shrink-0 truncate font-medium">{title}</span>
            <span className="truncate font-mono text-[11px] text-ink-faint line-through">{before}</span>
            <span className="text-ink-faint">→</span>
            <span className="truncate font-mono text-[11px]">{after}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-1.5 pt-2">
        <button type="button" onClick={onSkip} className="rounded-lg px-3 py-1.5 font-medium text-ink-soft hover:bg-paper-sunk">
          Only this note
        </button>
        <button type="button" onClick={onApply} className="rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-ink">
          Update 3 notes
        </button>
      </div>
    </div>
  );
}

function InsertAction({ onInsert }: { onInsert: () => void }) {
  const [peek, setPeek] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={onInsert}
        onMouseEnter={() => setPeek(true)}
        onMouseLeave={() => setPeek(false)}
        onFocus={() => setPeek(true)}
        onBlur={() => setPeek(false)}
        className="ml-2 inline-flex -translate-y-px items-center gap-1 rounded-lg bg-primary px-2.5 py-1 align-middle text-[12px] font-medium text-primary-ink"
      >
        + Add 7 meals
      </button>
      <span
        className={`mt-3 block overflow-hidden rounded-xl border border-dashed border-wire bg-paper-raised transition-[opacity,max-height] duration-300 ${
          peek ? "max-h-96 opacity-100" : "max-h-0 border-transparent opacity-0"
        }`}
      >
        <span className="flex items-center gap-1.5 border-b border-rule px-3 py-2">
          <Badge>Preview</Badge>
          <SourceBadge source="device" ms={1900} />
          <span className="ml-auto font-mono text-[10px] text-ink-faint uppercase">188 tokens</span>
        </span>
        <span className="block px-3 py-2 text-[14px] text-ink-soft">
          {MEALS.map((meal) => (
            <span key={meal} className="block">
              – {meal}
            </span>
          ))}
        </span>
      </span>
    </>
  );
}

function InsertedMeals() {
  const words = MEALS.map((meal) => meal.split(" "));
  const total = words.reduce((sum, w) => sum + w.length, 0);
  const shown = useStreamedWords(total, true);
  let offset = 0;
  return (
    <ul className="mt-5 space-y-1">
      {words.map((meal, index) => {
        const start = offset;
        offset += meal.length;
        return (
          <li key={index} className="flex gap-3">
            <span aria-hidden className={start < shown ? "text-ink-faint" : "text-transparent"}>
              –
            </span>
            <span>
              <StreamedText words={meal} offset={start} shown={shown} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function EditableNumber({ value, onCommit }: { value: number; onCommit: (value: number) => void }) {
  const ref = useRef<HTMLSpanElement>(null);
  const commit = () => {
    const parsed = Number(ref.current?.textContent?.trim() ?? "");
    if (Number.isInteger(parsed) && parsed > 0) onCommit(parsed);
    else if (ref.current) ref.current.textContent = String(value);
  };
  return (
    <span
      ref={ref}
      role="textbox"
      aria-label="Guest count"
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      className="rounded-[4px] outline-none focus:bg-hl-blue focus:text-hl-ink"
    >
      {value}
    </span>
  );
}
