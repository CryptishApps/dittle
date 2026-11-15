import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import type { SyncState } from "../../../../ui/SyncBadge";
import type { NoteId } from "./data";
import { Inspector } from "./Inspector";
import { AppFrame, BarButton, ease, FloatingBar, IconRail } from "./kit";
import { NoteSheet } from "./NoteSheet";

export function DocumentDesign() {
  const [guests, setGuests] = useState(80);
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

  const changeGuests = (next: number) => {
    if (next < 1) return;
    setGuests(next);
    setCalls((c) => ({ ...c, local: c.local + 1 }));
    setSync("syncing");
    window.setTimeout(() => setSync("synced"), 1200);
  };

  return (
    <AppFrame calls={calls}>
      <div className="canvas-dots relative min-w-0 flex-1 overflow-hidden rounded-2xl">
        <IconRail current={noteId} onOpenNote={setNoteId} />
        <div className="absolute inset-0 overflow-y-auto px-24 pt-10 pb-32 [scrollbar-width:thin]">
          <AnimatePresence mode="wait">
            <motion.div
              key={noteId}
              initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
              transition={{ duration: 0.4, ease }}
              className="mx-auto max-w-[720px]"
            >
              <NoteSheet noteId={noteId} guests={guests} reading={reading} onGuests={changeGuests} />
            </motion.div>
          </AnimatePresence>
        </div>
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
      </div>
      <Inspector noteId={noteId} guests={guests} sync={sync} onGuests={changeGuests} onOpenNote={setNoteId} />
    </AppFrame>
  );
}
