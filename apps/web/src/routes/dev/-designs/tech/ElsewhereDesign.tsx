import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { Mark, type MarkColor } from "../../../../ui/Mark";
import { Reprint } from "../../../../ui/Reprint";
import { SyncBadge, type SyncState } from "../../../../ui/SyncBadge";
import { NOTES, type NoteId } from "./data";
import { AppFrame, Badge, BarButton, BucketLabel, ease, FloatingBar, IconRail, NoteTile, SourceBadge } from "./kit";
import { NoteSheet } from "./NoteSheet";

type Part = string | { value: (g: number) => string; tone: MarkColor; guests?: boolean };

const MENTIONS: { id: NoteId; shares: string; parts: Part[] }[] = [
  {
    id: "budget",
    shares: "Guest count, price per head",
    parts: ["Food ", { value: (g) => String(g), tone: "green", guests: true }, " × £38 = ", { value: (g) => `£${(g * 38).toLocaleString("en-GB")}`, tone: "green", guests: true }, ". Chairs, the barn and flowers."],
  },
  { id: "chairs", shares: "Guest count", parts: [{ value: (g) => String(g), tone: "green", guests: true }, " chairs, plus 4 spare for the top table."] },
  {
    id: "email",
    shares: "Guest count, event date",
    parts: ["We're expecting ", { value: (g) => String(g), tone: "green", guests: true }, " people on ", { value: () => "14 June", tone: "blue" }, ", so the barn works."],
  },
  { id: "venue", shares: "Event date", parts: ["Booked for ", { value: () => "14 June", tone: "blue" }, ". Holds 120 seated, £600 deposit."] },
];

export function ElsewhereDesign() {
  const [guests, setGuests] = useState(80);
  const [applied, setApplied] = useState<Partial<Record<NoteId, number>>>({});
  const [reading, setReading] = useState(true);
  const [sync, setSync] = useState<SyncState>("synced");
  const [calls, setCalls] = useState({ local: 409, cloud: 6 });
  const [noteId, setNoteId] = useState<NoteId>("catering");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setReading(false);
      setCalls((c) => ({ ...c, local: c.local + 2 }));
    }, 1600);
    return () => window.clearTimeout(timer);
  }, []);

  const save = () => {
    setSync("syncing");
    window.setTimeout(() => setSync("synced"), 1200);
  };

  const changeGuests = (next: number) => {
    if (next < 1) return;
    setGuests(next);
    setCalls((c) => ({ ...c, local: c.local + 1 }));
    save();
  };

  const valueIn = (id: NoteId) => applied[id] ?? 80;
  const pending = MENTIONS.filter((m) => m.parts.some((p) => typeof p !== "string" && p.guests) && valueIn(m.id) !== guests);

  const apply = (ids: NoteId[]) => {
    setApplied((current) => ({ ...current, ...Object.fromEntries(ids.map((id) => [id, guests])) }));
    save();
  };

  return (
    <AppFrame calls={calls}>
      <IconRail current={noteId} onOpenNote={setNoteId} floating={false} />

      <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-rule bg-paper-sunk/40">
        <div className="flex items-center justify-between border-b border-rule bg-paper-raised px-6 py-3">
          <p className="truncate text-[13px] text-ink-faint">
            {NOTES[noteId].bucket.name} <span className="px-1">/</span> <span className="font-medium text-ink">{NOTES[noteId].title}</span>
          </p>
          <SyncBadge state={sync} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-10 pt-8 pb-32 [scrollbar-width:thin]">
          <AnimatePresence mode="wait">
            <motion.div
              key={noteId}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease }}
              className="mx-auto max-w-[680px]"
            >
              <NoteSheet noteId={noteId} guests={guests} reading={reading} onGuests={changeGuests} confirmInline={false} />
            </motion.div>
          </AnimatePresence>
        </div>
        <FloatingBar>
          <BarButton icon="ai" label="Ask about this note" primary />
          <BarButton icon="highlight" label="Highlight" />
          <BarButton icon="checklist" label="Checklist" />
          <BarButton icon="table" label="Table" />
          <BarButton icon="text" label="Text style" />
        </FloatingBar>
      </section>

      <aside className="canvas-dots relative hidden w-[400px] shrink-0 flex-col overflow-hidden rounded-2xl lg:flex">
        <div className="px-5 pt-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Elsewhere in your notes</h2>
            <Badge tone="green">On device</Badge>
          </div>
          <p className="mt-1 text-[13px] text-ink-soft">Other notes that mention the same details as this one.</p>
        </div>

        <AnimatePresence>
          {pending.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease }}
              className="overflow-hidden px-5"
            >
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-primary/30 bg-paper-raised p-3 shadow-card">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-hl-blue font-mono text-[11px] font-semibold text-tx-blue">
                  {pending.length}
                </span>
                <span className="min-w-0 flex-1 text-[13px]">
                  <span className="block font-semibold">Guest count is now {guests}</span>
                  <span className="block text-ink-soft">
                    {pending.length} {pending.length === 1 ? "note still says" : "notes still say"} {valueIn(pending[0]!.id)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => apply(pending.map((m) => m.id))}
                  className="rounded-lg bg-primary px-3 py-1.5 text-[13px] font-medium text-primary-ink"
                >
                  Update all
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <ul className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pt-5 pb-5 [scrollbar-width:thin]">
          {MENTIONS.map((mention, index) => {
            const stale = pending.includes(mention);
            const note = NOTES[mention.id];
            return (
              <motion.li
                key={mention.id}
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: reading ? 0 : 1, x: reading ? 14 : 0 }}
                transition={{ delay: reading ? 0 : 0.1 + index * 0.08, duration: 0.45, ease }}
              >
                <BucketLabel bucket={note.bucket} />
                <div className={`rounded-2xl rounded-tl-none border bg-paper-raised p-2 shadow-card transition ${stale ? "border-primary/40" : "border-rule"}`}>
                  <button type="button" onClick={() => setNoteId(mention.id)} className="flex w-full items-center gap-2.5 p-1.5 text-left">
                    <NoteTile color={note.tile} className="size-8 rounded-lg" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">{note.title}</span>
                      <span className="block truncate font-mono text-[10px] text-ink-faint uppercase">Shares: {mention.shares}</span>
                    </span>
                  </button>
                  <div className="mt-1 rounded-xl bg-paper-sunk p-3 text-[13px] leading-relaxed">
                    <Snippet parts={mention.parts} guests={valueIn(mention.id)} />
                    <div className="mt-2.5 flex items-center justify-between">
                      {stale ? (
                        <span className="font-mono text-[10px] text-tx-blue uppercase">
                          {valueIn(mention.id)} → {guests}
                        </span>
                      ) : applied[mention.id] ? (
                        <Badge tone="green">Updated</Badge>
                      ) : (
                        <SourceBadge source="device" ms={190 + index * 20} />
                      )}
                      {stale && (
                        <button type="button" onClick={() => apply([mention.id])} className="rounded-md border border-rule bg-paper-raised px-2 py-1 text-[12px] font-medium hover:border-wire">
                          Update
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ul>
      </aside>
    </AppFrame>
  );
}

function Snippet({ parts, guests }: { parts: Part[]; guests: number }): ReactNode {
  return (
    <p>
      {parts.map((part, index) =>
        typeof part === "string" ? (
          <span key={index}>{part}</span>
        ) : (
          <Mark key={index} color={part.tone}>
            <Reprint value={part.value(guests)} />
          </Mark>
        ),
      )}
    </p>
  );
}
