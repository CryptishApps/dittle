import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { BucketPill, BucketTag, type Bucket } from "../../../ui/BucketPill";
import { InferenceMeter, SourceTag } from "../../../ui/InferenceMeter";
import { InsertButton } from "../../../ui/InsertButton";
import { Mark } from "../../../ui/Mark";
import { OrganicShimmer } from "../../../ui/OrganicShimmer";
import { Popover } from "../../../ui/Popover";
import { Reprint } from "../../../ui/Reprint";
import { SyncBadge, type SyncState } from "../../../ui/SyncBadge";
import { UpdateCard, type Mention } from "../../../ui/UpdateCard";

export const BUCKETS = {
  wedding: { name: "Wedding", color: "green" },
  work: { name: "Work", color: "blue" },
  personal: { name: "Personal", color: "violet" },
  lisbon: { name: "Lisbon trip", color: "orange" },
  recipes: { name: "Recipes", color: "yellow" },
} satisfies Record<string, Bucket>;

export const MEALS = [
  "Roast chicken with lemon and thyme",
  "Mushroom and chestnut Wellington (v)",
  "Slow-cooked lamb shoulder",
  "Charred broccoli with chilli and almonds (vg)",
  "Herby new potatoes",
  "Burnt aubergine with yoghurt",
  "Lemon posset with shortbread",
];

export const GUEST_MENTIONS = (from: number, to: number): Mention[] => [
  { note: "Budget", before: `Food: ${from} × £38`, after: `Food: ${to} × £38` },
  { note: "Chair hire", before: `${from} chairs, plus 4 spare`, after: `${to} chairs, plus 4 spare` },
  { note: "Email to Sam", before: `expecting ${from} people`, after: `expecting ${to} people` },
];

export function useAfter(ms: number, enabled = true): boolean {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setTimeout(() => setDone(true), ms);
    return () => window.clearTimeout(timer);
  }, [ms, enabled]);
  return done;
}

export const money = (n: number) => `£${n.toLocaleString("en-GB")}`;

export function NoteFrame({
  bucket = BUCKETS.wedding,
  date = "Thu, 14 Nov",
  title,
  sync = "synced",
  aside,
  children,
}: {
  bucket?: Bucket;
  date?: string;
  title?: string;
  sync?: SyncState;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[28px] bg-paper-raised p-7 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-[13px] font-semibold text-ink-faint">
          <BucketTag bucket={bucket} />
          {date}
        </div>
        <div className="flex items-center gap-2">
          {aside}
          <SyncBadge state={sync} />
        </div>
      </div>
      {title && <h3 className="mt-5 text-[26px] leading-tight font-extrabold tracking-[-0.03em]">{title}</h3>}
      <div className="mt-4 text-[17px] leading-[1.7]">{children}</div>
    </div>
  );
}

export function UpdatePanel({ playing = true }: { playing?: boolean }) {
  const edited = useAfter(500, playing);
  const [result, setResult] = useState<"asking" | "updated" | "skipped">("asking");
  const guests = edited ? 95 : 80;
  return (
    <NoteFrame title="Catering quote" sync={result === "updated" ? "syncing" : "synced"}>
      <p>
        Rosa's Kitchen can do a buffet for <Reprint value={String(guests)} highlight /> guests at £38 a head, so roughly{" "}
        {money(guests * 38)} before drinks.
      </p>
      <div className={`grid transition-[grid-template-rows] duration-300 ${edited && result === "asking" ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden px-1 pb-3">
          <Popover open={edited && result === "asking"} className="mt-4">
            <UpdateCard
              change="80 guests → 95 guests"
              mentions={GUEST_MENTIONS(80, 95)}
              onUpdateAll={() => setResult("updated")}
              onSkip={() => setResult("skipped")}
              flat
            />
          </Popover>
        </div>
      </div>
      {result === "updated" && (
        <p className="row-in mt-3 text-[14px] font-semibold">
          <Mark swipe>Updated 3 other notes</Mark>
        </p>
      )}
    </NoteFrame>
  );
}

export function InsertPanel({ peek = false }: { peek?: boolean }) {
  const [inserted, setInserted] = useState(false);
  return (
    <NoteFrame title="Catering quote">
      <p>Tastings are on Thursdays. Ask about a vegan cake.</p>
      <div className="mt-4">
        {inserted ? (
          <ul className="space-y-0.5">
            {MEALS.map((meal, index) => (
              <li key={meal} className="row-in flex gap-2.5" style={{ "--row": index } as CSSProperties}>
                <span aria-hidden className="text-ink-faint">•</span>
                {meal}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-soft">
            add in a list of meals here
            <InsertButton label="Add 7 meals" preview={MEALS} peek={peek} onInsert={() => setInserted(true)} />
          </p>
        )}
      </div>
    </NoteFrame>
  );
}

export function RecalcPanel({ playing = true }: { playing?: boolean }) {
  const changed = useAfter(700, playing);
  const guests = changed ? 95 : 80;
  const rows = [
    { label: "Food", working: `${guests} × £38`, value: guests * 38 },
    { label: "Chairs", working: `${guests} × £2`, value: guests * 2 },
    { label: "Venue", working: "Weekend", value: 2400 },
  ];
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  return (
    <NoteFrame title="Budget" date="Tue, 12 Nov">
      <table className="w-full tabular-nums">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-rule">
              <td className="py-3 font-bold">{row.label}</td>
              <td className="py-3 text-ink-soft">
                <Reprint value={row.working} />
              </td>
              <td className="py-3 text-right font-semibold">
                <Reprint value={money(row.value)} highlight />
              </td>
            </tr>
          ))}
          <tr>
            <td className="pt-4 text-[20px] font-extrabold">Total</td>
            <td />
            <td className="pt-4 text-right text-[20px] font-extrabold">
              <Reprint value={money(total)} highlight />
            </td>
          </tr>
        </tbody>
      </table>
      <p className="mt-5 text-[13px] font-semibold text-ink-faint">
        {changed ? "Guests went up to 95 in Catering quote, so the totals were worked out again." : " "}
      </p>
    </NoteFrame>
  );
}

export function BucketsPanel({ playing = true }: { playing?: boolean }) {
  const sorted = useAfter(1400, playing);
  return (
    <div className="rounded-[28px] bg-paper-sunk/70 p-5">
      <div className="flex flex-wrap gap-2">
        <BucketPill bucket={{ name: "All", color: "yellow" }} count={<Reprint value={sorted ? "25" : "24"} />} active />
        <BucketPill bucket={BUCKETS.wedding} count={<Reprint value={sorted ? "10" : "9"} />} />
        <BucketPill bucket={BUCKETS.work} count={6} />
        <BucketPill bucket={BUCKETS.lisbon} count={4} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-paper-raised p-5 shadow-card">
          <p className="text-[17px] leading-snug font-extrabold tracking-[-0.02em]">Pick up the rings</p>
          <p className="mt-1.5 text-[14px] leading-snug text-ink-soft">Hatton Garden, Friday after 2pm. Bring the receipt.</p>
          <div className="mt-4 h-6">
            {sorted ? (
              <span className="row-in inline-block">
                <BucketTag bucket={BUCKETS.wedding} />
              </span>
            ) : (
              <span className="t-shimmer-text text-[12px] font-bold" data-text="Sorting">
                Sorting
              </span>
            )}
          </div>
          <p className="mt-3 text-[12px] font-semibold text-ink-faint">Just now</p>
        </div>
        <div className="rounded-3xl bg-paper-raised p-5 shadow-card">
          <p className="text-[17px] leading-snug font-extrabold tracking-[-0.02em]">Flights to Lisbon</p>
          <p className="mt-1.5 text-[14px] leading-snug text-ink-soft">TAP from Gatwick, 2 adults, back on the 22nd.</p>
          <div className="mt-4">
            <BucketTag bucket={BUCKETS.lisbon} />
          </div>
          <p className="mt-3 text-[12px] font-semibold text-ink-faint">Mon, 11 Nov</p>
        </div>
      </div>
      <p className="mt-4 flex items-center gap-2 px-1 text-[13px] font-semibold text-ink-soft">
        <SourceTag source="device" /> New notes find their own bucket.
      </p>
    </div>
  );
}

const VENDORS = [
  { name: "Rosa's Kitchen", price: "£3,610", deposit: "£500", contact: "07700 900123" },
  { name: "Hartley Barn", price: "£2,400", deposit: "£600", contact: "07700 900456" },
  { name: "Chair Hire Co", price: "£190", deposit: "None", contact: "07700 900789" },
];

export function CollectionsPanel({ playing = true }: { playing?: boolean }) {
  const done = useAfter(2600, playing);
  return (
    <NoteFrame title="Vendors" date="From 3 notes" aside={<SourceTag source="cloud" />}>
      {!done ? (
        <div className="flex flex-col items-center gap-4 py-2">
          <OrganicShimmer width={380} height={132} radius={18} />
          <span className="t-shimmer-text text-[14px] font-bold" data-text="Looking across 25 notes">
            Looking across 25 notes
          </span>
        </div>
      ) : (
        <table className="w-full text-left text-[15px] tabular-nums">
          <thead className="text-[12px] text-ink-faint">
            <tr className="row-in border-b border-rule">
              <th className="py-2 font-bold">Vendor</th>
              <th className="py-2 font-bold">Price</th>
              <th className="py-2 font-bold">Deposit</th>
              <th className="py-2 font-bold">Contact</th>
            </tr>
          </thead>
          <tbody>
            {VENDORS.map((vendor, index) => (
              <tr key={vendor.name} className="row-in border-b border-rule last:border-0" style={{ "--row": index + 1 } as CSSProperties}>
                <td className="py-3 font-bold">{vendor.name}</td>
                <td className="py-3">{vendor.price}</td>
                <td className="py-3">{vendor.deposit}</td>
                <td className="py-3 text-ink-soft">{vendor.contact}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </NoteFrame>
  );
}

export function OfflinePanel() {
  return (
    <NoteFrame
      title="Readings"
      sync="local"
      aside={<span className="rounded-full bg-paper-sunk px-2.5 py-1 text-[11px] leading-none font-bold text-ink-soft">Offline</span>}
    >
      <p>Sam's sister will read the Mary Oliver poem. Keep it under three minutes.</p>
      <p className="mt-4">
        Second reading: my uncle, if he's back from Lisbon by the 12th
        <span aria-hidden className="ml-px inline-block h-[1.1em] w-[2px] translate-y-[3px] animate-pulse bg-ink" />
      </p>
      <p className="mt-6 rounded-2xl bg-paper px-4 py-3 text-[14px] text-ink-soft">
        You're offline. Notes save to this device, the AI still runs on it, and everything syncs when you reconnect.
      </p>
    </NoteFrame>
  );
}

const CALLS = [
  { what: "Read your note", where: "Catering quote", source: "device", ms: "180 ms" },
  { what: "Sorted into Wedding", where: "Pick up the rings", source: "device", ms: "210 ms" },
  { what: "Found 3 matching notes", where: "Catering quote", source: "device", ms: "240 ms" },
  { what: "Wrote 7 meals", where: "Catering quote", source: "device", ms: "1.9 s" },
  { what: "Found a collection", where: "25 notes", source: "cloud", ms: "2.6 s" },
] as const;

export function MeterPanel({ playing = true }: { playing?: boolean }) {
  const ticked = useAfter(600, playing);
  return (
    <div className="rounded-[28px] bg-paper-raised p-7 shadow-card">
      <p className="text-[13px] font-bold text-ink-faint">AI today</p>
      <div className="mt-2 flex items-end gap-8 tabular-nums">
        <p>
          <span className="block text-[44px] leading-none font-extrabold tracking-[-0.04em]">
            <Reprint value={ticked ? "412" : "409"} />
          </span>
          <span className="mt-2 inline-block">
            <SourceTag source="device" />
          </span>
        </p>
        <p>
          <span className="block text-[44px] leading-none font-extrabold tracking-[-0.04em] text-ink-soft">6</span>
          <span className="mt-2 inline-block">
            <SourceTag source="cloud" />
          </span>
        </p>
      </div>
      <ul className="mt-5">
        {CALLS.map((call) => (
          <li key={call.what} className="flex items-center gap-3 border-t border-rule py-3 text-[15px]">
            <span aria-hidden className={`size-2 shrink-0 rounded-full ${call.source === "device" ? "bg-hl-green" : "bg-hl-blue"}`} />
            <span className="min-w-0 flex-1 truncate font-semibold">
              {call.what} <span className="font-medium text-ink-faint">· {call.where}</span>
            </span>
            <span className="text-[13px] font-semibold text-ink-faint tabular-nums">{call.ms}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SavingPanel() {
  const [state, setState] = useState<SyncState>("local");
  useEffect(() => {
    const timers = [
      window.setTimeout(() => setState("syncing"), 1400),
      window.setTimeout(() => setState("synced"), 2600),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);
  return (
    <div className="flex flex-col items-start gap-5 rounded-[28px] bg-paper-raised p-7 shadow-card">
      <SyncBadge state={state} />
      <InferenceMeter local={412} cloud={6} />
    </div>
  );
}
