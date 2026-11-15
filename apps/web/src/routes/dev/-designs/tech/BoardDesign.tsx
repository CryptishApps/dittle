import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect, useState } from "react";
import type { SyncState } from "../../../../ui/SyncBadge";
import { BUCKETS, NOTES, type NoteId } from "./data";
import { Inspector } from "./Inspector";
import { AppFrame, Badge, BarButton, BucketLabel, ease, FloatingBar, Icon, IconRail, NoteCard, SourceBadge, Tabs } from "./kit";
import { NoteSheet } from "./NoteSheet";

type Filter = "all" | "wedding" | "lisbon" | "work" | "recipes";

const ORDER: NoteId[] = ["catering", "rings", "budget", "lisbon", "chairs", "oneonone", "email", "hotel", "venue", "roadmap", "sourdough"];
const LINKED: NoteId[] = ["budget", "chairs", "email"];

export function BoardDesign() {
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<NoteId>("catering");
  const [open, setOpen] = useState<NoteId | null>(null);
  const [guests, setGuests] = useState(80);
  const [spread, setSpread] = useState(80);
  const [reading, setReading] = useState(true);
  const [sorted, setSorted] = useState(false);
  const [sync, setSync] = useState<SyncState>("synced");
  const [calls, setCalls] = useState({ local: 409, cloud: 6 });

  useEffect(() => {
    const timers = [
      window.setTimeout(() => {
        setReading(false);
        setCalls((c) => ({ ...c, local: c.local + 1 }));
      }, 1600),
      window.setTimeout(() => {
        setSorted(true);
        setCalls((c) => ({ ...c, local: c.local + 1 }));
      }, 2600),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  const changeGuests = (next: number) => {
    if (next < 1) return;
    setGuests(next);
    setCalls((c) => ({ ...c, local: c.local + 1 }));
    setSync("syncing");
    window.setTimeout(() => setSync("synced"), 1200);
  };

  const spreadGuests = () => {
    setSpread(guests);
    setSync("syncing");
    window.setTimeout(() => setSync("synced"), 1200);
  };

  const visible = ORDER.filter((id) => filter === "all" || NOTES[id].bucket === BUCKETS[filter]);

  const status = (id: NoteId) => {
    if (id === "catering") return reading ? <Shimmer text="Reading" /> : <SourceBadge source="device" ms={180} />;
    if (id === "rings") return sorted ? <SourceBadge source="device" ms={210} /> : <Shimmer text="Sorting" />;
    if (LINKED.includes(id) && spread !== 80) return <Badge tone="green">Updated</Badge>;
    return <Badge>Note</Badge>;
  };

  return (
    <AppFrame calls={calls}>
      <div className="canvas-dots relative min-w-0 flex-1 overflow-hidden rounded-2xl">
        <IconRail current={selected} onOpenNote={(id) => setOpen(id)} />
        <LayoutGroup>
          <div className="absolute inset-0 overflow-y-auto pt-8 pr-8 pb-32 pl-24 [scrollbar-width:thin]">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] text-ink-faint uppercase">{visible.length} notes</p>
                <h1 className="mt-1 text-[28px] leading-none font-semibold tracking-[-0.03em]">All notes</h1>
              </div>
              <Tabs
                id="buckets"
                value={filter}
                onChange={setFilter}
                tabs={[
                  { id: "all", label: "All" },
                  { id: "wedding", label: "Wedding" },
                  { id: "lisbon", label: "Lisbon trip" },
                  { id: "work", label: "Work" },
                  { id: "recipes", label: "Recipes" },
                ]}
              />
            </div>

            <motion.div layout className="mt-7 grid grid-cols-1 items-start gap-x-4 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {visible.map((id, index) => (
                  <motion.div
                    key={id}
                    layout
                    layoutId={`card-${id}`}
                    initial={{ opacity: 0, y: 14, scale: 0.97 }}
                    animate={{ opacity: open === id ? 0 : 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96, filter: "blur(4px)" }}
                    transition={{ duration: 0.4, delay: Math.min(index, 8) * 0.03, ease }}
                  >
                    <NoteCard
                      noteId={id}
                      guests={id === "catering" ? guests : spread}
                      selected={selected === id}
                      status={status(id)}
                      label={id === "rings" && !sorted ? <BucketLabel bucket={{ name: "New note", tone: "violet" }} /> : undefined}
                      onSelect={() => {
                        setSelected(id);
                        setOpen(id);
                      }}
                      footer={
                        <>
                          <Badge>{id === "catering" ? "4 links" : LINKED.includes(id) || id === "venue" ? "1 link" : "No links"}</Badge>
                          <span className="font-mono text-[10px] text-ink-faint uppercase">{id === "catering" ? "312 words" : "84 words"}</span>
                        </>
                      }
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </div>

          <AnimatePresence>
            {open && (
              <>
                <motion.div
                  key="scrim"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  onClick={() => setOpen(null)}
                  className="absolute inset-0 z-30 bg-canvas/70 backdrop-blur-[3px]"
                />
                <motion.div
                  key={`sheet-${open}`}
                  layoutId={`card-${open}`}
                  transition={{ duration: 0.5, ease }}
                  className="absolute inset-x-[8%] top-6 bottom-6 z-40 overflow-y-auto rounded-2xl [scrollbar-width:thin]"
                >
                  <div className="relative mx-auto max-w-[760px]">
                    <NoteSheet
                      noteId={open}
                      guests={open === "catering" ? guests : spread}
                      reading={open === "catering" && reading}
                      onGuests={changeGuests}
                      onConfirm={spreadGuests}
                      aside={
                        <button
                          type="button"
                          aria-label="Close note"
                          onClick={() => setOpen(null)}
                          className="grid size-9 place-items-center rounded-xl text-ink-soft transition hover:bg-paper-sunk hover:text-ink"
                        >
                          <Icon name="close" className="size-4" />
                        </button>
                      }
                    />
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </LayoutGroup>

        <FloatingBar>
          <BarButton icon="plus" label="New note" primary />
          <BarButton icon="search" label="Search" />
          <BarButton icon="checklist" label="Checklist" />
          <BarButton icon="table" label="Collections" />
        </FloatingBar>
      </div>
      <Inspector noteId={selected} guests={guests} sync={sync} onGuests={changeGuests} onOpenNote={setSelected} />
    </AppFrame>
  );
}

function Shimmer({ text }: { text: string }) {
  return (
    <span className="t-shimmer-text font-mono text-[10px] font-medium uppercase" data-text={text}>
      {text}
    </span>
  );
}
