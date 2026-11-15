import { useEffect, useRef, useState, type ReactNode } from "react";
import { BucketPill, BucketTag, type Bucket } from "../../../ui/BucketPill";
import { InferenceMeter } from "../../../ui/InferenceMeter";
import { InsertButton } from "../../../ui/InsertButton";
import { Mark } from "../../../ui/Mark";
import { Popover } from "../../../ui/Popover";
import { Reprint } from "../../../ui/Reprint";
import { StreamedText, useStreamedWords } from "../../../ui/StreamIn";
import { SyncBadge, type SyncState } from "../../../ui/SyncBadge";
import { UpdateCard } from "../../../ui/UpdateCard";
import { Wordmark } from "../../../ui/Wordmark";
import { BUCKETS, GUEST_MENTIONS, MEALS, money } from "./panels";

export function EditorMock() {
  const [guests, setGuests] = useState(80);
  const [pending, setPending] = useState<{ from: number; to: number } | null>(null);
  const [updated, setUpdated] = useState(false);
  const [reading, setReading] = useState(true);
  const [sorted, setSorted] = useState(false);
  const [meals, setMeals] = useState<"request" | "inserted">("request");
  const [sync, setSync] = useState<SyncState>("synced");
  const [calls, setCalls] = useState({ local: 409, cloud: 6 });
  const [status, setStatus] = useState<ReactNode>("Spotted 4 values");
  const syncTimer = useRef<number>(undefined);

  useEffect(() => {
    const timers = [
      window.setTimeout(() => {
        setReading(false);
        setCalls((c) => ({ ...c, local: c.local + 1 }));
      }, 1500),
      window.setTimeout(() => {
        setSorted(true);
        setCalls((c) => ({ ...c, local: c.local + 1 }));
      }, 2400),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
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
    setUpdated(true);
    setStatus("Updated 3 other notes");
    save();
  };

  const insertMeals = () => {
    setMeals("inserted");
    setCalls((c) => ({ ...c, local: c.local + 1 }));
    setStatus("Added 7 meals");
    save();
  };

  const updatedTag = updated ? (
    <span className="row-in text-[12px] font-bold">
      <Mark swipe>Updated</Mark>
    </span>
  ) : null;

  return (
    <div className="flex h-dvh gap-3 overflow-hidden bg-paper p-3 text-ink">
      <section aria-label="Notes" className="relative hidden w-[540px] shrink-0 flex-col lg:flex">
        <div className="flex items-center justify-between px-3 pt-3">
          <Wordmark className="text-[24px]" />
          <RoundButton label="More">
            <DotsIcon />
          </RoundButton>
        </div>
        <h1 className="mt-6 px-3 text-[40px] leading-none font-extrabold tracking-[-0.04em]">My notes</h1>
        <label className="mx-3 mt-5 flex items-center gap-3 rounded-2xl bg-paper-sunk px-4 py-3 text-[15px] text-ink-faint">
          <SearchIcon />
          <input placeholder="Search notes" className="w-full bg-transparent font-semibold text-ink outline-none placeholder:text-ink-faint" />
        </label>
        <div className="mt-4 flex gap-2 overflow-x-auto px-3 pb-1 [mask-image:linear-gradient(to_right,black_85%,transparent)] [scrollbar-width:none]">
          <BucketPill bucket={{ name: "All", color: "yellow" }} count={25} active />
          <BucketPill bucket={BUCKETS.wedding} count={<Reprint value={sorted ? "10" : "9"} />} />
          <BucketPill bucket={BUCKETS.work} count={6} />
          <BucketPill bucket={BUCKETS.lisbon} count={4} />
          <BucketPill bucket={BUCKETS.recipes} count={3} />
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-3 pb-28 [scrollbar-width:none]">
          <div className="columns-2 gap-3 [&>*]:mb-3">
            <NoteCard title="Catering quote" bucket={BUCKETS.wedding} date="Edited now" active>
              Rosa's Kitchen can do a buffet for {guests} guests at £38 a head.
            </NoteCard>
            <NoteCard title="Pick up the rings" bucket={sorted ? BUCKETS.wedding : undefined} date="Just now" sorting={!sorted}>
              Hatton Garden, Friday after 2pm. Bring the receipt.
            </NoteCard>
            <ChecklistCard />
            <NoteCard title="Budget" bucket={BUCKETS.wedding} date="Tue, 12 Nov" extra={updatedTag}>
              Food {guests} × £38, chairs, the barn and flowers.
            </NoteCard>
            <NoteCard title="Flights to Lisbon" bucket={BUCKETS.lisbon} date="Mon, 11 Nov">
              TAP from Gatwick, 2 adults, back on the 22nd.
            </NoteCard>
            <NoteCard title="Chair hire" bucket={BUCKETS.wedding} date="Tue, 12 Nov" extra={updatedTag}>
              {guests} chairs, plus 4 spare for the top table.
            </NoteCard>
            <NoteCard title="Q4 roadmap" bucket={BUCKETS.work} date="Fri, 8 Nov">
              Ship offline mode first, then the Android beta.
            </NoteCard>
            <NoteCard title="Email to Sam" bucket={BUCKETS.wedding} date="Mon, 11 Nov" extra={updatedTag}>
              We're expecting {guests} people, so the barn works.
            </NoteCard>
            <NoteCard title="Sourdough starter" bucket={BUCKETS.recipes} date="3 Nov">
              Feed at 9am and 9pm. 50g flour, 50g water.
            </NoteCard>
          </div>
        </div>

        <button
          type="button"
          aria-label="New note"
          className="absolute right-4 bottom-4 grid size-16 place-items-center rounded-full bg-primary text-primary-ink shadow-pop transition active:scale-95"
        >
          <PlusIcon />
        </button>
      </section>

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-[32px] bg-paper-raised shadow-card">
        <header className="flex items-center justify-between px-6 pt-6">
          <RoundButton label="Back" muted>
            <BackIcon />
          </RoundButton>
          <div className="flex items-center gap-3">
            <SyncBadge state={sync} />
            <button
              type="button"
              aria-label="Done"
              className="grid size-12 place-items-center rounded-full bg-primary text-primary-ink transition active:scale-95"
            >
              <CheckIcon />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <article className="mx-auto max-w-[680px] px-8 pt-8 pb-40">
            <h2 className="text-[44px] leading-[1.05] font-extrabold tracking-[-0.04em]">Catering quote</h2>
            <p className="mt-4 flex items-center gap-3 text-[14px] font-semibold text-ink-faint">
              <BucketTag bucket={BUCKETS.wedding} />
              <span>Thu, 14 Nov 2026 · 09:41</span>
            </p>

            <div className="mt-8 space-y-5 text-[18px] leading-[1.75]">
              <p>
                Rosa's Kitchen can do a buffet for{" "}
                <span className="relative inline-block">
                  <EditableNumber value={guests} onCommit={editGuests} />
                  <Popover open={pending !== null} className="absolute top-full left-0 z-30 mt-3">
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
                They need a £500 deposit to hold the date, and the menu has to be final two weeks before the 14th of
                June.
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
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-1 rounded-[22px] bg-[#121212] p-2 text-white shadow-pop dark:bg-[#232322]">
            <ToolButton label="Highlight">
              <PenIcon />
            </ToolButton>
            <ToolButton label="Checklist">
              <CheckCircleIcon />
            </ToolButton>
            <ToolButton label="Table">
              <TableIcon />
            </ToolButton>
            <ToolButton label="Text style">
              <TextIcon />
            </ToolButton>
            <span aria-hidden className="mx-2 h-6 w-px bg-white/15" />
            <span className="min-w-44 px-2 text-[13px] font-semibold text-white/70">
              {reading ? (
                <span className="t-shimmer-text [--shimmer-text-base:rgb(255_255_255/0.45)] [--shimmer-text-highlight:#fff]" data-text="Reading your note">
                  Reading your note
                </span>
              ) : (
                <span key={String(status)} className="row-in inline-block">
                  {status}
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="absolute right-6 bottom-8 hidden xl:block">
          <InferenceMeter local={calls.local} cloud={calls.cloud} />
        </div>
      </main>
    </div>
  );
}

function NoteCard({
  title,
  bucket,
  date,
  active,
  sorting,
  extra,
  children,
}: {
  title: string;
  bucket?: Bucket;
  date: string;
  active?: boolean;
  sorting?: boolean;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <a
      href="#"
      aria-current={active ? "page" : undefined}
      className="block break-inside-avoid rounded-[24px] bg-paper-raised p-5 transition hover:shadow-card aria-[current=page]:ring-2 aria-[current=page]:ring-ink"
    >
      <p className="text-[18px] leading-snug font-extrabold tracking-[-0.02em]">{title}</p>
      <p className="mt-2 text-[14px] leading-snug text-ink-soft">{children}</p>
      <div className="mt-4 flex min-h-6 items-center gap-2">
        {bucket ? (
          <span className={sorting === false ? "row-in" : undefined}>
            <BucketTag bucket={bucket} />
          </span>
        ) : sorting ? (
          <span className="t-shimmer-text text-[12px] font-bold" data-text="Sorting">
            Sorting
          </span>
        ) : null}
        {extra}
      </div>
      <p className="mt-3 text-[12px] font-semibold text-ink-faint">{date}</p>
    </a>
  );
}

function ChecklistCard() {
  return (
    <a href="#" className="block break-inside-avoid rounded-[24px] bg-paper-raised p-5 transition hover:shadow-card">
      <p className="text-[18px] leading-snug font-extrabold tracking-[-0.02em]">Wedding to-dos</p>
      <ul className="mt-3 space-y-2 text-[14px] font-semibold">
        <li className="flex items-center gap-2.5 text-ink-faint line-through">
          <span aria-hidden className="grid size-5 place-items-center rounded-full bg-primary text-primary-ink">
            <CheckIcon small />
          </span>
          Book the barn
        </li>
        <li className="flex items-center gap-2.5">
          <span aria-hidden className="size-5 rounded-full border-2 border-ink-faint" />
          Confirm the playlist
        </li>
        <li className="flex items-center gap-2.5">
          <span aria-hidden className="size-5 rounded-full border-2 border-ink-faint" />
          Print the seating plan
        </li>
      </ul>
      <div className="mt-4">
        <BucketTag bucket={BUCKETS.wedding} />
      </div>
      <p className="mt-3 text-[12px] font-semibold text-ink-faint">Wed, 13 Nov</p>
    </a>
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
      className="rounded-[4px] outline-none focus:bg-hl-yellow focus:text-hl-ink"
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
          <li key={index} className="flex gap-3">
            <span aria-hidden className={start < shown ? "text-ink-faint" : "text-transparent"}>
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

function RoundButton({ label, muted, children }: { label: string; muted?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`grid size-12 place-items-center rounded-full text-ink transition active:scale-95 ${
        muted ? "bg-paper" : "bg-paper-raised shadow-card"
      }`}
    >
      {children}
    </button>
  );
}

function ToolButton({ label, children }: { label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="grid size-11 place-items-center rounded-2xl text-white/85 transition hover:bg-white/10 hover:text-white"
    >
      {children}
    </button>
  );
}

const icon = {
  "aria-hidden": true,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "size-[22px]",
};

function PlusIcon() {
  return (
    <svg {...icon} className="size-7">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg {...icon} className="size-5">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}
function DotsIcon() {
  return (
    <svg {...icon}>
      <circle cx="6" cy="12" r="1.4" fill="currentColor" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      <circle cx="18" cy="12" r="1.4" fill="currentColor" />
    </svg>
  );
}
function BackIcon() {
  return (
    <svg {...icon}>
      <path d="m14.5 6-6 6 6 6" />
    </svg>
  );
}
function CheckIcon({ small }: { small?: boolean }) {
  return (
    <svg {...icon} strokeWidth={small ? 3 : 2.4} className={small ? "size-3" : "size-[22px]"}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}
function PenIcon() {
  return (
    <svg {...icon}>
      <path d="m4 20 1.2-4.6L15.6 5a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8z" />
      <path d="M13 20h7" />
    </svg>
  );
}
function CheckCircleIcon() {
  return (
    <svg {...icon}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12.2 2.4 2.4 4.6-4.8" />
    </svg>
  );
}
function TableIcon() {
  return (
    <svg {...icon}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
      <path d="M3.5 10h17M10 10v9.5" />
    </svg>
  );
}
function TextIcon() {
  return (
    <svg {...icon}>
      <path d="M5 6.5V5h14v1.5M12 5v14M9 19h6" />
    </svg>
  );
}
