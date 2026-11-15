import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { SyncBadge, type SyncState } from "../../../../ui/SyncBadge";
import { NOTES, type NoteId } from "./data";
import { Inspector } from "./Inspector";
import { AppFrame, BarButton, ease, FloatingBar, IconRail, NoteTile, SourceBadge } from "./kit";
import { CateringBody, Paragraph, ShowMargin } from "./NoteSheet";

export type NoteVariant = "page" | "margin" | "sheet";

export function NoteDesign({ variant }: { variant: NoteVariant }) {
  const [guests, setGuests] = useState(80);
  const [reading, setReading] = useState(true);
  const [sync, setSync] = useState<SyncState>("synced");
  const [calls, setCalls] = useState({ local: 409, cloud: 6 });
  const [noteId, setNoteId] = useState<NoteId>("catering");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setReading(false);
      setCalls((c) => ({ ...c, local: c.local + 2 }));
    }, 1800);
    return () => window.clearTimeout(timer);
  }, []);

  const changeGuests = (next: number) => {
    if (next < 1) return;
    setGuests(next);
    setCalls((c) => ({ ...c, local: c.local + 1 }));
    setSync("syncing");
    window.setTimeout(() => setSync("synced"), 1200);
  };

  const note = (
    <AnimatePresence mode="wait">
      <motion.article key={noteId} exit={{ opacity: 0, y: -8, filter: "blur(4px)", transition: { duration: 0.2 } }}>
        <NoteHead noteId={noteId} reading={reading} />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.5, ease }}
          className="mt-10 text-[18px] leading-[1.8] text-ink"
        >
          {noteId === "catering" ? (
            <CateringBody guests={guests} reading={reading} onGuests={changeGuests} confirmInline />
          ) : (
            <>
              <Paragraph n={1} margin={<SourceBadge source="device" ms={170} />}>
                {NOTES[noteId].excerpt(guests)}
              </Paragraph>
              <Paragraph n={2}>
                <span className="text-ink-soft">Next: confirm with everyone by Friday.</span>
              </Paragraph>
            </>
          )}
        </motion.div>
      </motion.article>
    </AnimatePresence>
  );

  const bar = (
    <FloatingBar>
      <BarButton icon="ai" label="Ask about this note" primary />
      <BarButton icon="highlight" label="Highlight" />
      <BarButton icon="checklist" label="Checklist" />
      <BarButton icon="table" label="Table" />
      <BarButton icon="text" label="Text style" />
      <span aria-hidden className="mx-1 h-6 w-px bg-rule" />
      <BarButton icon="undo" label="Undo" />
      <BarButton icon="redo" label="Redo" />
    </FloatingBar>
  );

  return (
    <AppFrame calls={calls}>
      {variant === "sheet" ? (
        <div className="canvas-dots relative min-w-0 flex-1 overflow-hidden rounded-2xl">
          <IconRail current={noteId} onOpenNote={setNoteId} />
          <div className="absolute inset-0 overflow-y-auto px-24 [scrollbar-width:thin]">
            <div className="flex min-h-full flex-col pt-6">
              <div className="mx-auto w-full max-w-[820px] flex-1 rounded-t-[20px] border border-b-0 border-rule bg-paper-raised shadow-card">
                <TopBar noteId={noteId} sync={sync} />
                <div className="px-16 pt-10 pb-40">{note}</div>
              </div>
            </div>
          </div>
          {bar}
        </div>
      ) : (
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <IconRail current={noteId} onOpenNote={setNoteId} />
          <div className="absolute inset-0 overflow-y-auto [scrollbar-width:thin]">
            <TopBar noteId={noteId} sync={sync} sticky />
            <ShowMargin.Provider value={variant === "margin"}>
              <div className={`mx-auto pt-14 pb-40 ${variant === "margin" ? "max-w-[960px] pr-[270px] pl-28" : "max-w-[860px] px-24"}`}>{note}</div>
            </ShowMargin.Provider>
          </div>
          {bar}
        </div>
      )}
      {variant !== "margin" && <Inspector noteId={noteId} guests={guests} sync={sync} onGuests={changeGuests} onOpenNote={setNoteId} />}
    </AppFrame>
  );
}

function TopBar({ noteId, sync, sticky = false }: { noteId: NoteId; sync: SyncState; sticky?: boolean }) {
  const note = NOTES[noteId];
  return (
    <div
      className={`flex items-center justify-between gap-4 px-6 py-3 ${
        sticky ? "sticky top-0 z-20 bg-paper-raised/85 pl-24 backdrop-blur-md" : "border-b border-rule"
      }`}
    >
      <p className="flex min-w-0 items-center gap-2 text-[13px]">
        <span
          className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-medium"
          style={{ background: `var(--hl-${note.bucket.tone})`, color: `var(--tx-${note.bucket.tone})` }}
        >
          <span aria-hidden className="size-1.5 rounded-full" style={{ background: `var(--tx-${note.bucket.tone})` }} />
          {note.bucket.name}
        </span>
        <span className="text-ink-faint">/</span>
        <span className="truncate text-ink-soft">{note.title}</span>
      </p>
      <div className="flex items-center gap-3">
        <SyncBadge state={sync} />
        <button type="button" className="rounded-lg border border-rule px-2.5 py-1 text-[12px] font-medium text-ink-soft transition hover:text-ink">
          Share
        </button>
      </div>
    </div>
  );
}

function NoteHead({ noteId, reading }: { noteId: NoteId; reading: boolean }) {
  const note = NOTES[noteId];
  const step = (index: number) => ({
    initial: { opacity: 0, y: 14, filter: "blur(6px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: { delay: index * 0.06, duration: 0.5, ease },
  });
  return (
    <header>
      <motion.div {...step(0)}>
        <NoteTile color={note.tile} className="size-12 rounded-[14px]" />
      </motion.div>
      <motion.h1 {...step(1)} className="mt-6 text-[48px] leading-[1.02] font-semibold tracking-[-0.04em]">
        {note.title}
      </motion.h1>
      <motion.p {...step(2)} className="mt-2 text-[18px] text-ink-soft">
        {note.subtitle}
      </motion.p>
      <motion.div
        {...step(3)}
        className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-rule py-3 font-mono text-[11px] text-ink-faint uppercase"
      >
        <Meta label="Edited">{note.edited} ago</Meta>
        <Meta label="Words">{noteId === "catering" ? 312 : 120}</Meta>
        <Meta label="Links">{noteId === "catering" ? 4 : 1}</Meta>
        <span className="ml-auto">
          {reading && noteId === "catering" ? (
            <span className="t-shimmer-text font-medium" data-text="Reading paragraph 1">
              Reading paragraph 1
            </span>
          ) : (
            <SourceBadge source="device" ms={180} />
          )}
        </span>
      </motion.div>
    </header>
  );
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span>
      {label} <span className="text-ink">{children}</span>
    </span>
  );
}
