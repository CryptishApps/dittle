import { AnimatePresence, m } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { Reprint } from "../../ui/Reprint";
import { SyncBadge, type SyncState } from "../../ui/SyncBadge";
import { Wordmark } from "../../ui/Wordmark";
import { NOTES, TREE, type NoteId } from "./data";
import { NoteView, staleNotes, type Change, type NoteContext } from "./NoteView";
import { Btn, Code, ease, Kbd, MIcon, Path, Scramble, type MIconName } from "../../ui/kit";

type Entry = {
  key: string;
  code: string;
  lead: string;
  link: NoteId;
  path: string[];
  body?: string;
  actions: string[];
  at: string;
};

const budgetTotal = (g: number) => `£${(g * 38 + g * 2 + 3050).toLocaleString("en-GB")}`;

export function NotesApp() {
  const [guests, setGuests] = useState(80);
  const [applied, setApplied] = useState<Partial<Record<NoteId, number>>>({});
  const [change, setChange] = useState<Change>(null);
  const [done, setDone] = useState<string | null>(null);
  const [tabs, setTabs] = useState<NoteId[]>(["catering", "budget", "email"]);
  const [active, setActive] = useState<NoteId>("catering");
  const [seen, setSeen] = useState<NoteId[]>([]);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [unread, setUnread] = useState(3);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [expanded, setExpanded] = useState<string[]>(["wedding"]);
  const [sync, setSync] = useState<SyncState>("synced");
  const [calls, setCalls] = useState({ local: 409, cloud: 6 });

  useEffect(() => {
    const timer = window.setTimeout(() => setCalls((c) => ({ ...c, local: c.local + 2 })), 1700);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!done) return;
    const timer = window.setTimeout(() => setDone(null), 3200);
    return () => window.clearTimeout(timer);
  }, [done]);

  const valueFor = (id: NoteId) => (id === "catering" ? guests : (applied[id] ?? 80));

  const save = () => {
    setSync("syncing");
    window.setTimeout(() => setSync("synced"), 1100);
  };

  const open = (id: NoteId) => {
    setSeen((list) => (list.includes(active) ? list : [...list, active]));
    setTabs((list) => (list.includes(id) ? list : [...list, id]));
    setActive(id);
  };

  const closeTab = (id: NoteId) => {
    const next = tabs.filter((tab) => tab !== id);
    if (!next.length) return;
    setTabs(next);
    if (active === id) setActive(next[Math.max(0, tabs.indexOf(id) - 1)]!);
  };

  const ctx: NoteContext = {
    current: guests,
    valueFor,
    change,
    done,
    onEditGuests: (next) => {
      if (next === guests) return;
      setChange((current) => ({ from: current?.from ?? guests, to: next }));
      setGuests(next);
      setDone(null);
      setCalls((c) => ({ ...c, local: c.local + 1 }));
      save();
    },
    onUpdate: (ids) => {
      const from = change?.from ?? valueFor(ids[0]!);
      setApplied((current) => ({ ...current, ...Object.fromEntries(ids.map((id) => [id, guests])) }));
      setChange(null);
      const names = ids.map((id) => NOTES[id].title);
      setDone(`Updated ${names.join(", ")}`);
      setEntries((list) => [
        {
          key: `up-${Date.now()}`,
          code: "UP",
          lead: `updated ${ids.length} ${ids.length === 1 ? "note" : "notes"} from`,
          link: "catering",
          path: ["Guest count", `${from} → ${guests}`],
          body: `${names.join(", ")} now ${ids.length === 1 ? "says" : "say"} ${guests}.`,
          actions: ["Undo", "View"],
          at: "Now",
        },
        ...list,
      ]);
      setUnread((n) => n + 1);
      setCalls((c) => ({ ...c, local: c.local + ids.length }));
      save();
    },
    onSkip: () => setChange(null),
    onOpen: open,
  };

  const inbox: Entry[] = [
    ...entries,
    {
      key: "sorted",
      code: "SO",
      lead: "sorted a new note into Wedding:",
      link: "rings",
      path: ["New note", "Wedding"],
      actions: ["Move", "Keep"],
      at: "09:44",
    },
    {
      key: "clash",
      code: "CL",
      lead: "found two notes that disagree:",
      link: "hotel",
      path: ["Lisbon trip", "Hotel", "Flights"],
      body: "The hotel is booked for 6 nights from the 16th. Your flights come back on the 22nd.",
      actions: ["Open both", "Ignore"],
      at: "09:12",
    },
    {
      key: "sum",
      code: "SM",
      lead: "added up the costs in",
      link: "budget",
      path: ["Wedding", "Budget"],
      body: `Food, chairs, barn and flowers come to ${budgetTotal(valueFor("budget"))}.`,
      actions: ["Insert total"],
      at: "Mon",
    },
  ];

  const pending = staleNotes(ctx).length;

  return (
    <div className="flex h-dvh overflow-hidden bg-page text-[13px] text-ink">
      <aside className="flex w-[264px] shrink-0 flex-col border-r border-line bg-side">
        <div className="flex h-11 items-center justify-between border-b border-line px-4 text-soft">
          <MIcon name="sidebar" />
          <span className="text-[10.5px] tracking-[0.04em] uppercase">v0.1</span>
        </div>
        <div className="flex items-center gap-3 px-5 pt-5">
          <Wordmark className="text-[17px]" />
        </div>
        <div className="px-4 pt-5">
          <button type="button" className="flex h-9 w-full items-center gap-2.5 border border-line bg-card px-3 text-faint">
            <MIcon name="search" />
            <span className="text-[11px] tracking-[0.04em] uppercase">Search</span>
            <span className="ml-auto flex gap-1">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>
        </div>
        <div className="mx-4 mt-4 border-t border-line" />
        <nav className="space-y-0.5 px-3 pt-3">
          <SideItem icon="inbox" label="Inbox" active={inboxOpen} onClick={() => setInboxOpen((v) => !v)}>
            {unread > 0 && (
              <span className="bg-accent-tint px-1.5 text-[11px] text-accent-ink tabular-nums">
                <Reprint value={String(unread)} />
              </span>
            )}
          </SideItem>
          <SideItem icon="today" label="Today" />
          <SideItem icon="notes" label="All notes">
            <span className="text-[11px] text-faint">31</span>
          </SideItem>
        </nav>
        <div className="flex items-center justify-between px-5 pt-6 pb-2 text-[10.5px] tracking-[0.06em] text-faint uppercase">
          Buckets
          <MIcon name="plus" className="size-3.5" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 [scrollbar-width:thin]">
          {TREE.map((bucket) => {
            const isOpen = expanded.includes(bucket.id);
            return (
              <div key={bucket.id}>
                <button
                  type="button"
                  onClick={() => setExpanded((list) => (isOpen ? list.filter((id) => id !== bucket.id) : [...list, bucket.id]))}
                  className="flex h-8 w-full items-center gap-2.5 px-2 text-left transition-colors hover:bg-chip"
                >
                  <MIcon name="folder" className="size-4 text-soft" />
                  <span className="flex-1 truncate">{bucket.name}</span>
                  <span className="text-[11px] text-faint">{bucket.notes.length}</span>
                  <MIcon name="chevron" className={`size-3.5 text-faint transition-transform duration-300 ${isOpen ? "rotate-90" : ""}`} />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <m.ul
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease }}
                      className="overflow-hidden"
                    >
                      {bucket.notes.map((id) => (
                        <li key={id}>
                          <button
                            type="button"
                            onClick={() => open(id)}
                            className={`relative flex h-8 w-full items-center gap-2.5 pr-2 pl-8 text-left transition-colors ${
                              active === id ? "text-ink" : "text-soft hover:text-ink"
                            }`}
                          >
                            {active === id && (
                              <m.span layoutId="mono-tree" className="absolute inset-0 bg-chip" transition={{ duration: 0.3, ease }} />
                            )}
                            <MIcon name="file" className="relative size-3.5" />
                            <span className="relative flex-1 truncate">{NOTES[id].title}</span>
                            {staleNotes(ctx).includes(id) && <span className="relative size-1.5 bg-accent" aria-label="Out of date" />}
                          </button>
                        </li>
                      ))}
                    </m.ul>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
        <div className="border-t border-line px-5 py-4">
          <div className="flex items-center justify-between text-[10.5px] tracking-[0.04em] uppercase">
            <span className="flex items-center gap-2">
              <MIcon name="chip" className="size-4" />
              Gemini Nano
            </span>
            <span className="text-faint">Ready</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[10.5px] tracking-[0.04em] text-faint uppercase">
            <span className="border border-line bg-card px-2 py-1.5">
              <span className="block text-[15px] tracking-normal text-ink tabular-nums">
                <Reprint value={String(calls.local)} />
              </span>
              On device
            </span>
            <span className="border border-line bg-card px-2 py-1.5">
              <span className="block text-[15px] tracking-normal text-ink tabular-nums">{calls.cloud}</span>
              Cloud
            </span>
          </div>
        </div>
      </aside>

      <AnimatePresence initial={false}>
        {inboxOpen && (
          <m.aside
            initial={{ width: 0, opacity: 0.6 }}
            animate={{ width: 420, opacity: 1 }}
            exit={{ width: 0, opacity: 0.6 }}
            transition={{ duration: 0.42, ease }}
            className="shrink-0 overflow-hidden border-r border-line bg-panel"
          >
            <div className="flex h-full w-[420px] flex-col">
              <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-4">
                <span className="flex items-center gap-3">
                  <button type="button" aria-label="Close inbox" onClick={() => setInboxOpen(false)} className="text-soft hover:text-ink">
                    <MIcon name="close" className="size-3.5" />
                  </button>
                  <span className="text-[12px] tracking-[0.04em] uppercase">Inbox</span>
                  {unread > 0 && <span className="bg-accent-tint px-1.5 text-[11px] text-accent-ink uppercase">{unread} new</span>}
                </span>
                <button
                  type="button"
                  onClick={() => setUnread(0)}
                  className="flex items-center gap-1.5 bg-chip px-2 py-1 text-[10.5px] tracking-[0.04em] uppercase hover:bg-chip-hover"
                >
                  Mark all as read
                  <MIcon name="check" className="size-3.5 text-accent" />
                </button>
              </div>
              <ul className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
                <AnimatePresence initial={false}>
                  {inbox.map((entry, index) => (
                    <m.li
                      key={entry.key}
                      layout
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: entry.at === "Now" ? 0 : 0.12 + index * 0.06, duration: 0.4, ease }}
                      className="flex gap-4 border-b border-line px-5 py-5"
                    >
                      <Code>{entry.code}</Code>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="leading-[1.55]">
                            <span className="font-semibold">Dittle</span> {entry.lead}{" "}
                            <button type="button" onClick={() => open(entry.link)} className="link font-medium">
                              {entry.at === "Now" ? <Scramble text={NOTES[entry.link].title} /> : NOTES[entry.link].title}
                            </button>
                          </p>
                          <span className="shrink-0 text-[11px] text-faint">{entry.at}</span>
                        </div>
                        <div className="mt-3">
                          <Path parts={entry.path} />
                        </div>
                        {entry.body && <p className="mt-3 leading-[1.6] text-soft">{entry.body}</p>}
                        <div className="mt-3 flex gap-2">
                          {entry.actions.map((action) => (
                            <Btn key={action}>{action}</Btn>
                          ))}
                        </div>
                      </div>
                    </m.li>
                  ))}
                </AnimatePresence>
              </ul>
            </div>
          </m.aside>
        )}
      </AnimatePresence>

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-11 shrink-0 items-stretch border-b border-line bg-side">
          <span className="grid w-10 place-items-center border-r border-line text-soft">
            <MIcon name="left" className="size-3.5" />
          </span>
          <span className="grid w-10 place-items-center border-r border-line text-faint">
            <MIcon name="right" className="size-3.5" />
          </span>
          <AnimatePresence initial={false}>
            {tabs.map((id) => (
              <m.div
                key={id}
                layout
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.3, ease }}
                className={`group relative flex shrink-0 items-center overflow-hidden border-r border-line ${active === id ? "bg-page" : ""}`}
              >
                {active === id && <span aria-hidden className="absolute inset-x-0 -bottom-px h-px bg-page" />}
                <button
                  type="button"
                  onClick={() => open(id)}
                  className={`flex h-full items-center gap-2 pr-1 pl-4 whitespace-nowrap ${active === id ? "text-ink" : "text-soft hover:text-ink"}`}
                >
                  <MIcon name="file" className="size-3.5" />
                  {NOTES[id].title}
                  {staleNotes(ctx).includes(id) && <span className="size-1.5 bg-accent" aria-label="Out of date" />}
                </button>
                <button
                  type="button"
                  aria-label={`Close ${NOTES[id].title}`}
                  onClick={() => closeTab(id)}
                  className="mr-2 ml-1 grid size-5 place-items-center text-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-ink"
                >
                  <MIcon name="close" className="size-3" />
                </button>
              </m.div>
            ))}
          </AnimatePresence>
          <div className="hatch flex-1" />
          <div className="flex items-center gap-3 border-l border-line px-4">
            <SyncBadge state={sync} />
            <button type="button" className="flex items-center gap-1.5 text-[11px] tracking-[0.04em] text-soft uppercase hover:text-ink">
              <MIcon name="share" className="size-3.5" />
              Share
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-page [scrollbar-width:thin]">
          <AnimatePresence mode="wait">
            <m.div key={active} exit={{ opacity: 0, y: -6, transition: { duration: 0.18 } }}>
              <NoteView noteId={active} ctx={ctx} firstRead={active === "catering" && !seen.includes("catering")} />
            </m.div>
          </AnimatePresence>
        </div>

        <div className="flex h-8 shrink-0 items-center gap-5 border-t border-line bg-side px-4 text-[10.5px] tracking-[0.04em] text-faint uppercase">
          <span className="text-soft">{NOTES[active].bucket}</span>
          <span>Gemini Nano · on device</span>
          {pending > 0 ? (
            <span className="text-accent-ink">
              <Scramble text={`${pending} ${pending === 1 ? "note" : "notes"} out of date`} />
            </span>
          ) : (
            <span>All notes agree</span>
          )}
          <span className="ml-auto">Firestore · offline ready</span>
        </div>
      </main>
    </div>
  );
}

function SideItem({
  icon,
  label,
  active = false,
  onClick,
  children,
}: {
  icon: MIconName;
  label: string;
  active?: boolean;
  onClick?: () => void;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-9 w-full items-center gap-3 px-2 text-left transition-colors ${active ? "bg-chip-hover" : "hover:bg-chip"}`}
    >
      <MIcon name={icon} className="size-[18px] text-soft" />
      <span className="flex-1 text-[14px]">{label}</span>
      {children}
    </button>
  );
}
