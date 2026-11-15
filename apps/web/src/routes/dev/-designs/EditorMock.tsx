import { useEffect, useRef, useState, type ReactNode } from "react";
import { InferenceMeter } from "../../../ui/InferenceMeter";
import { InsertButton } from "../../../ui/InsertButton";
import { Popover } from "../../../ui/Popover";
import { Reprint } from "../../../ui/Reprint";
import { StreamedText, useStreamedWords } from "../../../ui/StreamIn";
import { SyncBadge, type SyncState } from "../../../ui/SyncBadge";
import { UpdateCard } from "../../../ui/UpdateCard";
import { Wordmark } from "../../../ui/Wordmark";
import { GUEST_MENTIONS, MEALS, money } from "./panels";

const NOTES = ["Catering quote", "Hartley Barn", "Budget", "Chair hire", "Email to Sam", "Readings"];
const LINKED = new Set(["Budget", "Chair hire", "Email to Sam"]);

export function EditorMock() {
  const [guests, setGuests] = useState(80);
  const [pending, setPending] = useState<{ from: number; to: number } | null>(null);
  const [updatedNotes, setUpdatedNotes] = useState(0);
  const [reading, setReading] = useState(true);
  const [meals, setMeals] = useState<"request" | "inserted">("request");
  const [sync, setSync] = useState<SyncState>("synced");
  const [calls, setCalls] = useState({ local: 409, cloud: 6 });
  const [status, setStatus] = useState("");
  const syncTimer = useRef<number>(undefined);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setReading(false);
      setCalls((c) => ({ ...c, local: c.local + 1 }));
    }, 1500);
    return () => window.clearTimeout(timer);
  }, []);

  const save = () => {
    window.clearTimeout(syncTimer.current);
    setSync("syncing");
    syncTimer.current = window.setTimeout(() => setSync("synced"), 1100);
  };

  const editGuests = (next: number) => {
    if (next === guests) return;
    setPending({ from: guests, to: next });
    setGuests(next);
    setCalls((c) => ({ ...c, local: c.local + 1 }));
    save();
  };

  const updateAll = () => {
    setPending(null);
    setUpdatedNotes((n) => n + 1);
    setStatus("Updated 3 other notes");
    save();
  };

  const insertMeals = () => {
    setMeals("inserted");
    setCalls((c) => ({ ...c, local: c.local + 1 }));
    setStatus("Added 7 meals");
    save();
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-paper text-ink">
      <aside className="hidden w-[264px] shrink-0 flex-col px-4 pt-5 pb-4 lg:flex">
        <div className="flex items-center justify-between px-2">
          <Wordmark className="text-[22px]" />
          <IconButton label="Collapse sidebar">
            <SidebarIcon />
          </IconButton>
        </div>

        <button
          type="button"
          className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-[14px] font-semibold text-accent-ink transition hover:brightness-105"
        >
          <PlusIcon /> New note
        </button>
        <label className="mt-3 flex items-center gap-2 rounded-xl border border-rule bg-paper-raised px-3 py-2 text-[14px] text-ink-faint">
          <SearchIcon />
          <input placeholder="Search notes" className="w-full bg-transparent text-ink outline-none placeholder:text-ink-faint" />
        </label>

        <SidebarSection title="Wedding weekend">
          {NOTES.map((note, index) => (
            <SidebarItem key={note} active={index === 0} icon={<NoteIcon />}>
              <span className="flex-1 truncate">{note}</span>
              {LINKED.has(note) && updatedNotes > 0 && (
                <span key={updatedNotes} className="row-in text-[11px] font-medium text-accent-strong">
                  Updated
                </span>
              )}
            </SidebarItem>
          ))}
        </SidebarSection>

        <SidebarSection title="Collections">
          <SidebarItem icon={<TableIcon />}>
            <span className="flex-1">Vendors</span>
            <span className="text-[12px] text-ink-faint">3</span>
          </SidebarItem>
        </SidebarSection>

        <div className="mt-auto rounded-2xl border border-rule bg-paper-raised p-4 shadow-card">
          <p className="text-[13px] font-semibold">AI today</p>
          <p className="mt-0.5 mb-3 text-[12px] text-ink-soft">Most of it ran on this computer.</p>
          <InferenceMeter local={calls.local} cloud={calls.cloud} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col py-2 pr-2 lg:pl-0">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-rule bg-paper-raised shadow-card">
          <header className="flex items-center justify-between gap-3 border-b border-rule px-6 py-3">
            <p className="truncate text-[14px] text-ink-faint">
              Wedding weekend <span className="px-1">/</span>{" "}
              <span className="font-medium text-ink">Catering quote</span>
            </p>
            <div className="flex items-center gap-2">
              <SyncBadge state={sync} />
              <button
                type="button"
                className="ml-2 inline-flex items-center gap-2 rounded-xl bg-accent px-3.5 py-2 text-[14px] font-semibold text-accent-ink transition hover:brightness-105"
              >
                <TableIcon /> Find collections
              </button>
              <IconButton label="Share">
                <ShareIcon />
              </IconButton>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto">
            <article className="mx-auto max-w-[700px] px-6 pt-12 pb-40">
              <h1 className="text-[36px] leading-tight font-bold tracking-[-0.03em]">Catering quote</h1>
              <p className="mt-1 text-[14px] text-ink-faint">Rosa's Kitchen · called on Tuesday</p>

              <div className="mt-8 space-y-5 text-[17px] leading-[1.75]">
                <p>
                  Rosa's Kitchen can do a buffet for{" "}
                  <span className="relative inline-block">
                    <EditableNumber value={guests} onCommit={editGuests} />
                    <Popover open={pending !== null} className="absolute top-full left-0 z-30 mt-2">
                      {pending && (
                        <UpdateCard
                          change={`${pending.from} guests → ${pending.to} guests`}
                          mentions={GUEST_MENTIONS(pending.from, pending.to)}
                          onUpdateAll={updateAll}
                          onSkip={() => setPending(null)}
                        />
                      )}
                    </Popover>
                  </span>{" "}
                  guests at £38 a head, so roughly <Reprint value={money(guests * 38)} highlight /> before drinks.
                </p>
                <p>
                  They need a £500 deposit to hold the date, and the menu has to be final two weeks before the 14th
                  of June.
                </p>
                {meals === "request" ? (
                  <p className="text-ink-soft">
                    add in a list of meals here
                    {!reading && <InsertButton label="Add 7 meals" preview={MEALS} onInsert={insertMeals} />}
                  </p>
                ) : (
                  <InsertedMeals />
                )}
                <p>Tastings are on Thursdays. Ask about a vegan cake.</p>
              </div>
            </article>
          </main>

          <footer className="flex h-10 items-center border-t border-rule px-6 text-[13px] text-ink-soft">
            {reading ? (
              <span className="t-shimmer-text" data-text="Reading your note">
                Reading your note
              </span>
            ) : (
              <span key={status} className="row-in">
                {status}
              </span>
            )}
          </footer>
        </div>
      </div>
    </div>
  );
}

function EditableNumber({ value, onCommit }: { value: number; onCommit: (value: number) => void }) {
  const ref = useRef<HTMLSpanElement>(null);
  const commit = () => {
    const text = ref.current?.textContent?.trim() ?? "";
    const parsed = Number(text);
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
      className="rounded-[3px] outline-none focus:bg-accent-wash"
    >
      {value}
    </span>
  );
}

function InsertedMeals() {
  const words = MEALS.map((meal) => meal.split(" "));
  const total = words.reduce((sum, w) => sum + w.length, 0);
  const shown = useStreamedWords(total, true);
  let offset = 0;
  return (
    <ul className="space-y-1">
      {words.map((meal, index) => {
        const start = offset;
        offset += meal.length;
        return (
          <li key={index} className="flex gap-2.5">
            <span aria-hidden className={start < shown ? "text-accent-strong" : "text-transparent"}>
              •
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

function SidebarSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="mb-1.5 px-2 text-[11px] font-semibold tracking-[0.06em] text-ink-faint uppercase">{title}</h2>
      <ul className="space-y-0.5">{children}</ul>
    </section>
  );
}

function SidebarItem({ active, icon, children }: { active?: boolean; icon: ReactNode; children: ReactNode }) {
  return (
    <li>
      <a
        href="#"
        aria-current={active ? "page" : undefined}
        className="flex items-center gap-3 rounded-xl px-2.5 py-2 text-[15px] text-ink transition hover:bg-paper-sunk aria-[current=page]:bg-paper-raised aria-[current=page]:font-medium aria-[current=page]:shadow-card"
      >
        <span className="text-ink-soft">{icon}</span>
        {children}
      </a>
    </li>
  );
}

function IconButton({ label, children }: { label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="grid size-9 place-items-center rounded-xl text-ink-soft transition hover:bg-paper-sunk hover:text-ink"
    >
      {children}
    </button>
  );
}

const iconProps = {
  "aria-hidden": true,
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "size-[18px]",
};

function PlusIcon() {
  return (
    <svg {...iconProps}>
      <path d="M10 4.5v11M4.5 10h11" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="9" cy="9" r="5" />
      <path d="m13 13 3.5 3.5" />
    </svg>
  );
}
function NoteIcon() {
  return (
    <svg {...iconProps}>
      <path d="M5.5 3h6l3.5 3.5V16a1 1 0 0 1-1 1h-8.5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M11.5 3v3.5H15M7.5 10.5h5M7.5 13.5h3.5" />
    </svg>
  );
}
function TableIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="4" width="14" height="12" rx="2" />
      <path d="M3 8h14M8 8v8" />
    </svg>
  );
}
function SidebarIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="3.5" width="14" height="13" rx="2.5" />
      <path d="M8 3.5v13M12.5 8.5 11 10l1.5 1.5" />
    </svg>
  );
}
function ShareIcon() {
  return (
    <svg {...iconProps}>
      <path d="M17 3 9 11M17 3l-5 14-3-6-6-3 14-5z" />
    </svg>
  );
}
