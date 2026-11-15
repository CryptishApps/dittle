import { AnimatePresence, motion } from "motion/react";
import { useState, type CSSProperties, type ReactNode } from "react";
import { Reprint } from "../../../../ui/Reprint";
import { LogoMark } from "../../../../ui/Wordmark";
import { NOTES, RECENT, type Bucket, type Call, type NoteId, type Tone } from "./data";

export const ease = [0.22, 1, 0.36, 1] as const;

export function AppFrame({ calls, children }: { calls: { local: number; cloud: number }; children: ReactNode }) {
  return (
    <div className="flex h-dvh flex-col bg-paper p-3 text-ink sm:p-5">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] bg-paper-raised shadow-card">
        <header className="flex items-center justify-between gap-4 px-5 py-3.5">
          <span className="inline-flex items-center gap-2.5 text-[19px] font-semibold tracking-[-0.03em]">
            <LogoMark className="size-7" />
            dittle
          </span>
          <button
            type="button"
            className="hidden w-80 items-center gap-2 rounded-xl border border-rule bg-paper-sunk px-3 py-2 text-[13px] text-ink-faint md:flex"
          >
            <Icon name="search" className="size-4" />
            Search notes
            <kbd className="ml-auto rounded-md border border-rule bg-paper-raised px-1.5 font-mono text-[10px]">⌘K</kbd>
          </button>
          <div className="flex items-center gap-3">
            <CallMeter local={calls.local} cloud={calls.cloud} />
            <button type="button" className="rounded-xl bg-primary px-3.5 py-2 text-[13px] font-medium text-primary-ink transition hover:brightness-110">
              New note
            </button>
            <span aria-hidden className="grid size-8 place-items-center rounded-full bg-hl-violet font-mono text-[11px] font-semibold text-tx-violet">
              MR
            </span>
          </div>
        </header>
        <div className="flex min-h-0 flex-1 gap-2 px-2 pb-2">{children}</div>
      </div>
    </div>
  );
}

export function CallMeter({ local, cloud }: { local: number; cloud: number }) {
  return (
    <span className="hidden items-center gap-3 font-mono text-[11px] text-ink-soft tabular-nums sm:inline-flex" title="AI calls today">
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="size-1.5 rounded-full bg-positive" />
        <Reprint value={String(local)} /> on device
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="size-1.5 rounded-full border border-ink-soft" />
        <Reprint value={String(cloud)} /> cloud
      </span>
    </span>
  );
}

export function Badge({ children, tone, className = "" }: { children: ReactNode; tone?: Tone | "dark"; className?: string }) {
  const toneClass =
    tone === "dark"
      ? "border-transparent bg-ink text-paper-raised"
      : tone
        ? "border-transparent"
        : "border-rule bg-paper-raised text-ink";
  const style = tone && tone !== "dark" ? ({ background: `var(--hl-${tone})`, color: `var(--tx-${tone})` } as CSSProperties) : undefined;
  return (
    <span
      style={style}
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-[3px] font-mono text-[10px] leading-none font-medium tracking-[0.02em] whitespace-nowrap uppercase ${toneClass} ${className}`}
    >
      {children}
    </span>
  );
}

export function SourceBadge({ source, ms }: { source: "device" | "cloud"; ms?: number }) {
  return (
    <Badge tone={source === "device" ? "green" : "blue"}>
      {source === "device" ? "On device" : "Cloud"}
      {ms !== undefined && <span className="opacity-70">· {formatMs(ms)}</span>}
    </Badge>
  );
}

export const formatMs = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`);

export function BucketLabel({ bucket }: { bucket: Bucket }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-t-lg px-2.5 pt-1 pb-1.5 text-[12px] leading-none font-medium"
      style={{ background: `var(--hl-${bucket.tone})`, color: `var(--tx-${bucket.tone})` }}
    >
      <span aria-hidden className="grid size-3 place-items-center rounded-full" style={{ background: `var(--tx-${bucket.tone})` }}>
        <svg viewBox="0 0 12 12" className="size-2" fill="none" stroke="var(--hl-ink)" strokeWidth="2" strokeLinecap="round">
          <path d="m3 6.2 2 2 4-4.4" stroke="white" />
        </svg>
      </span>
      {bucket.name}
    </span>
  );
}

export function NoteTile({ color, className = "size-9" }: { color: string; className?: string }) {
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-xl text-white shadow-[inset_0_-2px_0_rgb(0_0_0/0.12)] ${className}`} style={{ background: color }}>
      <svg viewBox="0 0 20 20" className="size-[55%]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3h5.5L15 6.5V16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
        <path d="M8 10h4M8 13h2.5" />
      </svg>
    </span>
  );
}

export function NoteCard({
  noteId,
  guests,
  selected,
  status,
  footer,
  label,
  onSelect,
}: {
  noteId: NoteId;
  guests: number;
  selected?: boolean;
  status: ReactNode;
  footer?: ReactNode;
  label?: ReactNode;
  onSelect?: () => void;
}) {
  const note = NOTES[noteId];
  return (
    <div>
      {label ?? <BucketLabel bucket={note.bucket} />}
      <button
        type="button"
        onClick={onSelect}
        className={`block w-full rounded-2xl rounded-tl-none border bg-paper-raised p-2 text-left shadow-card transition ${
          selected ? "border-primary ring-4 ring-primary/15" : "border-rule hover:border-wire"
        }`}
      >
        <span className="flex items-center gap-2.5 p-1.5">
          <NoteTile color={note.tile} />
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-semibold tracking-[-0.01em]">{note.title}</span>
            <span className="block truncate text-[12px] text-ink-soft">{note.subtitle}</span>
          </span>
        </span>
        <span className="mt-1.5 block rounded-xl bg-paper-sunk p-2.5">
          <span className="flex items-center justify-between gap-2">
            {status}
            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-ink-faint uppercase">
              <Icon name="clock" className="size-3" />
              {note.edited}
            </span>
          </span>
          <span className="mt-2 block text-[13px] leading-relaxed text-ink-soft">{note.excerpt(guests)}</span>
        </span>
        {footer && <span className="flex items-center justify-between gap-2 px-1 pt-2 pb-0.5">{footer}</span>}
      </button>
    </div>
  );
}

type RailItem = "notes" | "ai" | "links" | "insights" | "settings";

const RAIL: { id: RailItem; label: string }[] = [
  { id: "notes", label: "Recent notes" },
  { id: "ai", label: "Ask" },
  { id: "links", label: "Links" },
  { id: "insights", label: "Insights" },
  { id: "settings", label: "Settings" },
];

export function IconRail({
  current,
  onOpenNote,
  floating = true,
}: {
  current: NoteId;
  onOpenNote: (id: NoteId) => void;
  floating?: boolean;
}) {
  const [active, setActive] = useState<RailItem>("notes");
  const [open, setOpen] = useState(false);
  return (
    <div className={floating ? "absolute top-1/2 left-4 z-40 -translate-y-1/2" : "relative z-40 flex items-center"}>
      <nav className="relative flex flex-col gap-1 rounded-2xl border border-rule bg-paper-raised p-1.5 shadow-card">
        {RAIL.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-label={item.label}
            aria-expanded={item.id === "notes" ? open : undefined}
            onClick={() => {
              setActive(item.id);
              setOpen(item.id === "notes" ? !open || active !== "notes" : false);
            }}
            className="relative grid size-10 place-items-center rounded-xl text-ink-soft transition hover:text-ink"
          >
            {active === item.id && (
              <motion.span layoutId={`rail-${floating}`} className="absolute inset-0 rounded-xl bg-paper-sunk" transition={{ duration: 0.35, ease }} />
            )}
            <Icon name={item.id} className={`relative size-5 ${active === item.id ? "text-ink" : ""}`} />
          </button>
        ))}
      </nav>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: -12, scale: 0.97, filter: "blur(6px)" }}
            animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: -8, scale: 0.98, filter: "blur(4px)" }}
            transition={{ duration: 0.32, ease }}
            style={{ transformOrigin: "left center" }}
            className="absolute top-1/2 left-full ml-2 w-72 -translate-y-1/2 rounded-2xl border border-rule bg-paper-raised p-2 shadow-pop"
          >
            <div className="flex items-center justify-between px-2 pt-1 pb-2">
              <span className="text-[13px] font-semibold">Recent notes</span>
              <Badge>{RECENT.length}</Badge>
            </div>
            <ul>
              {RECENT.map((id, index) => {
                const note = NOTES[id];
                return (
                  <motion.li
                    key={id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 + index * 0.035, duration: 0.3, ease }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onOpenNote(id);
                        setOpen(false);
                      }}
                      className={`flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left transition hover:bg-paper-sunk ${
                        id === current ? "bg-paper-sunk" : ""
                      }`}
                    >
                      <NoteTile color={note.tile} className="size-7 rounded-lg" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">{note.title}</span>
                        <span className="block truncate text-[11px] text-ink-faint">{note.bucket.name}</span>
                      </span>
                      <span className="font-mono text-[10px] text-ink-faint uppercase">{note.edited}</span>
                    </button>
                  </motion.li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, id }: { tabs: { id: T; label: string }[]; value: T; onChange: (id: T) => void; id: string }) {
  return (
    <div role="tablist" className="inline-flex rounded-xl bg-paper-sunk p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.id === value}
          onClick={() => onChange(tab.id)}
          className={`relative rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${tab.id === value ? "text-ink" : "text-ink-soft hover:text-ink"}`}
        >
          {tab.id === value && (
            <motion.span layoutId={`tab-${id}`} className="absolute inset-0 rounded-lg bg-paper-raised shadow-card" transition={{ duration: 0.3, ease }} />
          )}
          <span className="relative">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

export function PanelSection({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-6 first:mt-0">
      <div className="flex items-center justify-between border-b border-rule pb-2.5">
        <h3 className="text-[14px] font-semibold tracking-[-0.01em]">{title}</h3>
        {aside}
      </div>
      <div className="mt-1">{children}</div>
    </section>
  );
}

export function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 py-1.5 text-[13px]">
      <span className="text-ink-soft">{label}</span>
      {children}
    </div>
  );
}

export function Field({ children, chevron = false }: { children: ReactNode; chevron?: boolean }) {
  return (
    <span className="inline-flex min-w-12 items-center justify-end gap-2 rounded-lg border border-rule bg-paper-raised px-2.5 py-1.5 text-[13px] font-medium tabular-nums shadow-[0_1px_0_var(--rule)]">
      {children}
      {chevron && <Icon name="chevron" className="size-3.5 text-ink-faint" />}
    </span>
  );
}

export function ActivityList({ calls }: { calls: Call[] }) {
  return (
    <ul>
      {calls.map((call, index) => (
        <motion.li
          key={call.what + call.at}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.3, ease }}
          className="flex items-center gap-3 border-b border-rule py-2.5 last:border-0"
        >
          <span aria-hidden className={`size-2 shrink-0 rounded-full ${call.source === "device" ? "bg-positive" : "border-[1.5px] border-tx-blue"}`} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium">{call.what}</span>
            <span className="block font-mono text-[10px] text-ink-faint uppercase">
              {call.at} · {call.tokens} tokens
            </span>
          </span>
          <SourceBadge source={call.source} ms={call.ms} />
        </motion.li>
      ))}
    </ul>
  );
}

export function FloatingBar({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-rule bg-paper-raised p-1.5 shadow-pop">{children}</div>
    </div>
  );
}

export function BarButton({ icon, label, primary, onClick }: { icon: IconName; label: string; primary?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid size-10 place-items-center rounded-xl transition ${
        primary ? "bg-primary text-primary-ink hover:brightness-110" : "text-ink-soft hover:bg-paper-sunk hover:text-ink"
      }`}
    >
      <Icon name={icon} className="size-5" />
    </button>
  );
}

export type IconName =
  | RailItem
  | "search"
  | "clock"
  | "chevron"
  | "plus"
  | "minus"
  | "expand"
  | "undo"
  | "redo"
  | "cursor"
  | "hand"
  | "highlight"
  | "checklist"
  | "table"
  | "text"
  | "close"
  | "panel";

const PATHS: Record<IconName, ReactNode> = {
  notes: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" fill="currentColor" stroke="none" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" fill="currentColor" stroke="none" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" fill="currentColor" stroke="none" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" fill="currentColor" stroke="none" />
    </>
  ),
  ai: <path d="M10 3.5c.6 3.6 2.4 5.4 6 6-3.6.6-5.4 2.4-6 6-.6-3.6-2.4-5.4-6-6 3.6-.6 5.4-2.4 6-6zM18 14.5c.3 1.6 1 2.3 2.5 2.5-1.5.3-2.2 1-2.5 2.5-.3-1.5-1-2.2-2.5-2.5 1.5-.2 2.2-.9 2.5-2.5z" />,
  links: (
    <>
      <circle cx="6.5" cy="5.5" r="2" />
      <circle cx="6.5" cy="18.5" r="2" />
      <circle cx="17.5" cy="7.5" r="2" />
      <path d="M6.5 7.5v9M17.5 9.5c0 4-11 3-11 7" />
    </>
  ),
  insights: <path d="M4 4v16h16M8.5 16v-4M12.5 16V8M16.5 16v-6" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  chevron: <path d="m7 10 5 5 5-5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  expand: <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />,
  undo: <path d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />,
  redo: <path d="m15 14 5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />,
  cursor: <path d="m5 3 14 7.5-6.2 1.8L10 18.5z" />,
  hand: <path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V12M11 11V5a1.5 1.5 0 0 1 3 0v6M14 11V6.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-.5a6 6 0 0 1-4.6-2.2L4 15.2a1.5 1.5 0 0 1 2.3-1.9L8 15" />,
  highlight: <path d="m4 20 1.2-4.6L15.6 5a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8zM13 20h7" />,
  checklist: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12.2 2.4 2.4 4.6-4.8" />
    </>
  ),
  table: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
      <path d="M3.5 10h17M10 10v9.5" />
    </>
  ),
  text: <path d="M5 6.5V5h14v1.5M12 5v14M9 19h6" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  panel: (
    <>
      <path d="M14 5h5v14h-5" />
      <path d="M4 12h10M10 8l4 4-4 4" />
    </>
  ),
};

export function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {PATHS[name]}
    </svg>
  );
}
