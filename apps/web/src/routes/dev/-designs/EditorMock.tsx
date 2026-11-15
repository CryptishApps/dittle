import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { InferenceMeter } from "../../../ui/InferenceMeter";
import { InsertButton } from "../../../ui/InsertButton";
import { OptionsMenu, type Option } from "../../../ui/OptionsMenu";
import { Popover } from "../../../ui/Popover";
import { Reprint } from "../../../ui/Reprint";
import { useStreamedWords, StreamedText } from "../../../ui/StreamIn";
import { SyncBadge, type SyncState } from "../../../ui/SyncBadge";
import { VarChip } from "../../../ui/VarChip";
import { Wordmark } from "../../../ui/Wordmark";

type Spot = "detected" | "linked" | "text";
type SpotId = "deposit" | "date";

const MEALS = [
  "Roast chicken with lemon and thyme",
  "Mushroom and chestnut Wellington (v)",
  "Slow-cooked lamb shoulder",
  "Charred broccoli with chilli and almonds (vg)",
  "Herby new potatoes",
  "Burnt aubergine with yoghurt",
  "Lemon posset with shortbread",
];

const NOTES = [
  { title: "Catering quote", meta: "Edited now", active: true },
  { title: "Hartley Barn", meta: "Venue · yesterday" },
  { title: "Budget", meta: "Tue" },
  { title: "Chair hire", meta: "Tue" },
  { title: "Email to Sam", meta: "Draft · Mon" },
  { title: "Readings", meta: "12 Nov" },
];

const OPTIONS: Record<SpotId, { quote: string; kind: string; options: Option[] }> = {
  deposit: {
    quote: "£500",
    kind: "money",
    options: [
      { id: "new", mark: "〃", label: "New variable", detail: "catering_deposit" },
      { id: "formula", mark: "=", label: "Use in a formula", hint: "e.g. food_total + catering_deposit" },
      { id: "text", mark: "", label: "Keep as text" },
    ],
  },
  date: {
    quote: "the 14th of June",
    kind: "date",
    options: [
      { id: "link", mark: "〃", label: "Link to", detail: "event_date", hint: "14 June · used in 3 notes" },
      { id: "new", mark: "+", label: "New variable", detail: "menu_deadline" },
      { id: "text", mark: "", label: "Keep as text" },
    ],
  },
};

export function EditorMock() {
  const [guests, setGuests] = useState(80);
  const perHead = 38;
  const [spots, setSpots] = useState<Record<SpotId, Spot>>({ deposit: "detected", date: "detected" });
  const [openSpot, setOpenSpot] = useState<SpotId | null>(null);
  const [reading, setReading] = useState(true);
  const [meals, setMeals] = useState<"request" | "inserted">("request");
  const [sync, setSync] = useState<SyncState>("synced");
  const [calls, setCalls] = useState({ local: 409, cloud: 6 });
  const [status, setStatus] = useState<ReactNode>(null);
  const syncTimer = useRef<number>(undefined);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setReading(false);
      setCalls((c) => ({ ...c, local: c.local + 1 }));
      setStatus("Spotted 2 values and a request");
    }, 1500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!openSpot) return;
    const close = (event: KeyboardEvent | MouseEvent) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (event instanceof MouseEvent && (event.target as Element).closest("[data-spot]")) return;
      setOpenSpot(null);
    };
    window.addEventListener("keydown", close);
    window.addEventListener("mousedown", close);
    return () => {
      window.removeEventListener("keydown", close);
      window.removeEventListener("mousedown", close);
    };
  }, [openSpot]);

  const save = () => {
    window.clearTimeout(syncTimer.current);
    setSync("syncing");
    syncTimer.current = window.setTimeout(() => setSync("synced"), 1100);
  };

  const open = (id: SpotId) => {
    if (openSpot !== id) setCalls((c) => ({ ...c, local: c.local + 1 }));
    setOpenSpot(openSpot === id ? null : id);
  };

  const pick = (id: SpotId, choice: string) => {
    setOpenSpot(null);
    const next: Spot = choice === "text" ? "text" : "linked";
    setSpots((s) => ({ ...s, [id]: next }));
    if (next === "linked") {
      setStatus(id === "date" ? "Linked to event_date" : "Created catering_deposit");
      save();
    }
  };

  const changeGuests = (value: number) => {
    setGuests(value);
    setStatus(
      <>
        <span className="font-mono">guest_count</span> is now {value} · 4 notes updated
      </>,
    );
    save();
  };

  const insertMeals = () => {
    setMeals("inserted");
    setCalls((c) => ({ ...c, local: c.local + 1 }));
    setStatus("Added 7 meals");
    save();
  };

  const money = (n: number) => `£${n.toLocaleString("en-GB")}`;
  const dateUses = spots.date === "linked" ? 4 : 3;

  return (
    <div className="flex h-dvh overflow-hidden bg-paper text-ink">
      <aside className="hidden w-[272px] shrink-0 flex-col border-r border-rule bg-paper-sunk lg:flex">
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <Wordmark className="text-[24px]" />
          <button
            type="button"
            aria-label="New note"
            className="grid size-7 place-items-center rounded-lg text-ink-soft transition hover:bg-paper-raised hover:text-ink"
          >
            <PlusIcon />
          </button>
        </div>
        <div className="px-3">
          <label className="flex items-center gap-2 rounded-lg border border-rule bg-paper-raised px-2.5 py-1.5 text-[13px] text-ink-faint">
            <SearchIcon />
            <input
              placeholder="Search notes"
              className="w-full bg-transparent text-ink outline-none placeholder:text-ink-faint"
            />
          </label>
        </div>

        <nav aria-label="Notes" className="mt-5 px-3">
          <SidebarHeading>Wedding weekend</SidebarHeading>
          <ul>
            {NOTES.map((note) => (
              <li key={note.title}>
                <a
                  href="#"
                  aria-current={note.active ? "page" : undefined}
                  className="flex items-baseline justify-between gap-2 rounded-lg px-2.5 py-1.5 text-[14px] transition hover:bg-paper-raised aria-[current=page]:bg-paper-raised aria-[current=page]:shadow-[0_1px_0_var(--rule)]"
                >
                  <span className="truncate">{note.title}</span>
                  <span className="shrink-0 text-[11px] text-ink-faint">{note.meta}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <section aria-label="Variables" className="mt-6 px-3">
          <SidebarHeading>Variables</SidebarHeading>
          <ul className="space-y-px">
            <VariableRow name="guest_count" uses={4}>
              <EditableNumber value={guests} onChange={changeGuests} />
            </VariableRow>
            <VariableRow name="per_head" uses={2}>
              {money(perHead)}
            </VariableRow>
            <VariableRow name="food_total" formula>
              <Reprint value={money(guests * perHead)} />
            </VariableRow>
            <VariableRow name="event_date" uses={dateUses}>
              14 June
            </VariableRow>
            {spots.deposit === "linked" && (
              <VariableRow name="catering_deposit" uses={1} fresh>
                £500
              </VariableRow>
            )}
          </ul>
        </section>

        <section aria-label="Collections" className="mt-6 px-3">
          <SidebarHeading>Collections</SidebarHeading>
          <a href="#" className="flex items-baseline justify-between rounded-lg px-2.5 py-1.5 text-[14px] hover:bg-paper-raised">
            Vendors <span className="text-[11px] text-ink-faint">3 notes</span>
          </a>
          <button
            type="button"
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-ink-soft hover:bg-paper-raised hover:text-ink"
          >
            <span aria-hidden className="size-1.5 rounded-full border border-cloud" />
            Find collections
          </button>
        </section>

        <div className="mt-auto border-t border-rule px-5 py-3">
          <InferenceMeter local={calls.local} cloud={calls.cloud} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <p className="truncate text-[13px] text-ink-faint">
            Wedding weekend <span className="px-1">/</span> <span className="text-ink-soft">Catering quote</span>
          </p>
          <SyncBadge state={sync} />
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <article className="mx-auto max-w-[680px] px-5 pt-8 pb-40 sm:px-8 sm:pt-14">
            <h1 className="font-note text-[40px] leading-tight font-medium tracking-[-0.02em]">Catering quote</h1>
            <p className="mt-1 text-[13px] text-ink-faint">Rosa's Kitchen · called on Tuesday</p>

            <div className="mt-8 space-y-5 font-note text-[19px] leading-[1.7]">
              <p>
                Rosa's Kitchen can do a buffet for <VarChip name="guest_count" value={String(guests)} usedIn={4} />{" "}
                guests at <VarChip name="per_head" value={money(perHead)} usedIn={2} /> a head, so roughly{" "}
                <VarChip name="food_total" value={money(guests * perHead)} formula="guest_count × per_head" /> before
                drinks.
              </p>
              <p>
                They need a{" "}
                <SpotValue
                  id="deposit"
                  text="£500"
                  linkedValue="£500"
                  linkedName="catering_deposit"
                  state={spots.deposit}
                  visible={!reading}
                  delay={0}
                  open={openSpot === "deposit"}
                  onOpen={open}
                  onPick={pick}
                />{" "}
                deposit to hold the date, and the menu has to be final two weeks before{" "}
                <SpotValue
                  id="date"
                  text="the 14th of June"
                  linkedValue="14 June"
                  linkedName="event_date"
                  state={spots.date}
                  visible={!reading}
                  delay={140}
                  open={openSpot === "date"}
                  onOpen={open}
                  onPick={pick}
                />
                .
              </p>
              {meals === "request" ? (
                <p className="text-ink-soft italic">
                  add in a list of meals here
                  {!reading && <InsertButton label="Add 7 meals" preview={MEALS} onInsert={insertMeals} />}
                </p>
              ) : (
                <InsertedMeals guests={guests} />
              )}
              <p>Tastings are on Thursdays. Ask about a vegan cake.</p>
            </div>
          </article>
        </main>

        <footer className="flex items-center justify-between gap-4 border-t border-rule px-4 py-2.5 text-[12px] sm:px-8">
          <span className="truncate text-ink-soft">
            {reading ? (
              <span className="t-shimmer-text" data-text="Reading this paragraph">
                Reading this paragraph
              </span>
            ) : (
              status
            )}
          </span>
          <span className="lg:hidden">
            <InferenceMeter local={calls.local} cloud={calls.cloud} />
          </span>
          <span className="hidden text-ink-faint lg:inline">Gemini Nano in Chrome · Gemini Flash in the cloud</span>
        </footer>
      </div>
    </div>
  );
}

function SpotValue({
  id,
  text,
  linkedValue,
  linkedName,
  state,
  visible,
  delay,
  open,
  onOpen,
  onPick,
}: {
  id: SpotId;
  text: string;
  linkedValue: string;
  linkedName: string;
  state: Spot;
  visible: boolean;
  delay: number;
  open: boolean;
  onOpen: (id: SpotId) => void;
  onPick: (id: SpotId, choice: string) => void;
}) {
  if (state === "linked") return <VarChip name={linkedName} value={linkedValue} />;
  if (state === "text" || !visible) return <>{text}</>;
  const menu = OPTIONS[id];
  return (
    <span data-spot className="relative inline-block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        data-open={open}
        onClick={() => onOpen(id)}
        className="ink-detected"
        style={{ "--ink-delay": `${delay}ms` } as CSSProperties}
      >
        {text}
      </button>
      <Popover open={open} origin="top-left" className="absolute top-full left-0 z-30 mt-2">
        <OptionsMenu quote={menu.quote} kind={menu.kind} options={menu.options} onPick={(choice) => onPick(id, choice)} />
      </Popover>
    </span>
  );
}

function InsertedMeals({ guests }: { guests: number }) {
  const words = MEALS.map((meal) => meal.split(" "));
  const total = words.reduce((sum, w) => sum + w.length, 0);
  const shown = useStreamedWords(total, true);
  let offset = 0;
  return (
    <div>
      <h3 className="font-note text-[21px] font-semibold tracking-[-0.01em]">
        Meals for <VarChip name="guest_count" value={String(guests)} usedIn={4} /> guests
      </h3>
      <ul className="mt-2 list-disc space-y-1 pl-6 marker:text-ditto">
        {words.map((meal, index) => {
          const start = offset;
          offset += meal.length;
          return (
            <li key={index}>
              <StreamedText words={meal} offset={start} shown={shown} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SidebarHeading({ children }: { children: ReactNode }) {
  return <h2 className="mb-1 px-2.5 text-[11px] font-medium tracking-[0.02em] text-ink-faint">{children}</h2>;
}

function VariableRow({
  name,
  uses,
  formula,
  fresh,
  children,
}: {
  name: string;
  uses?: number;
  formula?: boolean;
  fresh?: boolean;
  children: ReactNode;
}) {
  return (
    <li
      className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] hover:bg-paper-raised ${fresh ? "row-in" : ""}`}
    >
      <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-ink-soft">{name}</span>
      <span className="font-note text-[15px] tabular-nums">{children}</span>
      <span className="w-6 text-right font-mono text-[10px] text-ink-faint">
        {formula ? "=" : <Reprint value={`×${uses}`} />}
      </span>
    </li>
  );
}

function EditableNumber({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  const commit = () => {
    setEditing(false);
    const parsed = Number(draft);
    if (Number.isFinite(parsed) && parsed !== value) onChange(parsed);
    else setDraft(String(value));
  };

  if (editing) {
    return (
      <input
        autoFocus
        inputMode="numeric"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
          if (event.key === "Escape") {
            setDraft(String(value));
            setEditing(false);
          }
        }}
        className="w-12 rounded border border-ditto bg-paper-raised px-1 text-right outline-none"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Change everywhere"
      className="rounded px-1 underline decoration-ditto decoration-dotted underline-offset-4 hover:bg-ditto-wash"
    >
      <Reprint value={String(value)} />
    </button>
  );
}

function PlusIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="7" cy="7" r="4.5" />
      <path d="m10.5 10.5 3 3" />
    </svg>
  );
}
