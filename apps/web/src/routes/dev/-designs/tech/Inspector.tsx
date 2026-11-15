import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Reprint } from "../../../../ui/Reprint";
import { SyncBadge, type SyncState } from "../../../../ui/SyncBadge";
import { activityFor, NOTES, valuesFor, type NoteId } from "./data";
import { ActivityList, Badge, ease, Field, Icon, NoteTile, PanelSection, Row, Tabs } from "./kit";

type Tab = "context" | "activity";

export function Inspector({
  noteId,
  guests,
  sync,
  onGuests,
  onOpenNote,
}: {
  noteId: NoteId;
  guests: number;
  sync: SyncState;
  onGuests: (next: number) => void;
  onOpenNote: (id: NoteId) => void;
}) {
  const [tab, setTab] = useState<Tab>("context");
  const note = NOTES[noteId];
  const values = valuesFor(noteId);
  const related = [...new Set(values.flatMap((value) => value.notes))].filter((id) => id !== noteId);
  const calls = activityFor(noteId);
  const local = calls.filter((call) => call.source === "device");

  return (
    <aside className="hidden w-[340px] shrink-0 flex-col overflow-hidden rounded-2xl bg-paper-sunk/70 lg:flex">
      <div className="flex items-center justify-between px-4 pt-4">
        <Tabs
          id="inspector"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "context", label: "Context" },
            { id: "activity", label: "AI activity" },
          ]}
        />
        <button type="button" aria-label="Close panel" className="grid size-8 place-items-center rounded-lg text-ink-faint hover:bg-paper-raised hover:text-ink">
          <Icon name="panel" className="size-4" />
        </button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-6 [scrollbar-width:thin]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${noteId}-${tab}`}
            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, filter: "blur(3px)" }}
            transition={{ duration: 0.28, ease }}
          >
            <div className="mb-6 flex items-center gap-3">
              <NoteTile color={note.tile} className="size-10" />
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold tracking-[-0.01em]">{note.title}</p>
                <p className="truncate text-[12px] text-ink-soft">{note.subtitle}</p>
              </div>
            </div>

            {tab === "context" ? (
              <>
                <PanelSection title="Note">
                  <Row label="Bucket">
                    <Field chevron>
                      <span className="size-2 rounded-full" style={{ background: `var(--tx-${note.bucket.tone})` }} />
                      {note.bucket.name}
                    </Field>
                  </Row>
                  <Row label="Edited">
                    <span className="font-mono text-[12px] text-ink-soft uppercase">{note.edited} ago</span>
                  </Row>
                  <Row label="Sync">
                    <SyncBadge state={sync} />
                  </Row>
                </PanelSection>

                <PanelSection title="Linked values" aside={<Badge tone="green">On device</Badge>}>
                  {values.length === 0 && <p className="py-3 text-[13px] text-ink-faint">Nothing linked yet.</p>}
                  {values.map((value) => (
                    <Row
                      key={value.id}
                      label={
                        <span>
                          {value.label}
                          <span className="ml-2 font-mono text-[10px] text-ink-faint uppercase">{value.notes.length} notes</span>
                        </span>
                      }
                    >
                      {value.id === "guests" ? (
                        <span className="inline-flex items-center gap-1">
                          <button type="button" aria-label="Fewer guests" onClick={() => onGuests(guests - 5)} className="grid size-7 place-items-center rounded-lg text-ink-soft hover:bg-paper-raised">
                            <Icon name="minus" className="size-3.5" />
                          </button>
                          <Field>
                            <Reprint value={value.value(guests)} />
                          </Field>
                          <button type="button" aria-label="More guests" onClick={() => onGuests(guests + 5)} className="grid size-7 place-items-center rounded-lg text-ink-soft hover:bg-paper-raised">
                            <Icon name="plus" className="size-3.5" />
                          </button>
                        </span>
                      ) : (
                        <Field>
                          <Reprint value={value.value(guests)} />
                        </Field>
                      )}
                    </Row>
                  ))}
                </PanelSection>

                {related.length > 0 && (
                  <PanelSection title="Shares values with" aside={<Badge>{related.length}</Badge>}>
                    <ul className="pt-1">
                      {related.map((id) => (
                        <li key={id}>
                          <button type="button" onClick={() => onOpenNote(id)} className="flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left transition hover:bg-paper-raised">
                            <NoteTile color={NOTES[id].tile} className="size-7 rounded-lg" />
                            <span className="flex-1 truncate text-[13px] font-medium">{NOTES[id].title}</span>
                            <Icon name="chevron" className="size-3.5 -rotate-90 text-ink-faint" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </PanelSection>
                )}
              </>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <Stat label="On device" value={String(local.length)} />
                  <Stat label="Cloud" value={String(calls.length - local.length)} />
                  <Stat label="Tokens" value={String(calls.reduce((sum, call) => sum + call.tokens, 0))} />
                </div>
                <PanelSection title="Calls for this note">
                  <ActivityList calls={calls} />
                </PanelSection>
                <p className="mt-4 text-[12px] leading-relaxed text-ink-faint">
                  On-device calls use Gemini Nano in Chrome. Cloud calls use Gemini Flash. Both go through Firebase AI Logic.
                </p>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-rule bg-paper-raised p-3">
      <p className="font-mono text-[10px] text-ink-faint uppercase">{label}</p>
      <p className="mt-1 text-[22px] font-semibold tracking-[-0.03em] tabular-nums">{value}</p>
    </div>
  );
}
