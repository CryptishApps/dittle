import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { InferenceMeter, SourceTag } from "../../../ui/InferenceMeter";
import { InsertButton } from "../../../ui/InsertButton";
import { OrganicShimmer } from "../../../ui/OrganicShimmer";
import { Popover } from "../../../ui/Popover";
import { Reprint } from "../../../ui/Reprint";
import { SyncBadge, type SyncState } from "../../../ui/SyncBadge";
import { UpdateCard, type Mention } from "../../../ui/UpdateCard";

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

export function Window({
  notebook = "Wedding weekend",
  title,
  sync = "synced",
  aside,
  children,
  className = "",
}: {
  notebook?: string;
  title: string;
  sync?: SyncState;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-rule bg-paper-raised shadow-card ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-rule px-5 py-3">
        <p className="truncate text-[13px] text-ink-faint">
          {notebook} <span className="px-1">/</span> <span className="font-medium text-ink">{title}</span>
        </p>
        <div className="flex shrink-0 items-center gap-3">
          {aside}
          <SyncBadge state={sync} />
        </div>
      </div>
      <div className="px-6 py-6 text-[16px] leading-[1.7]">{children}</div>
    </div>
  );
}

export function UpdatePanel({ playing = true }: { playing?: boolean }) {
  const edited = useAfter(500, playing);
  const [result, setResult] = useState<"asking" | "updated" | "skipped">("asking");
  const guests = edited ? 95 : 80;
  return (
    <Window title="Catering quote" sync={result === "updated" ? "syncing" : "synced"}>
      <p>
        Rosa's Kitchen can do a buffet for{" "}
        <span className={edited ? "rounded-[3px] bg-accent-wash px-0.5" : ""}>
          <Reprint value={String(guests)} />
        </span>{" "}
        guests at £38 a head, so roughly <Reprint value={money(guests * 38)} highlight /> before drinks.
      </p>
      <div className={`grid transition-[grid-template-rows] duration-300 ${edited && result === "asking" ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden px-1 pb-2">
          <Popover open={edited && result === "asking"} className="mt-4">
            <UpdateCard
              change="80 guests → 95 guests"
              mentions={GUEST_MENTIONS(80, 95)}
              onUpdateAll={() => setResult("updated")}
              onSkip={() => setResult("skipped")}
            />
          </Popover>
        </div>
      </div>
      {result === "updated" && <p className="row-in mt-4 text-[13px] text-accent-strong">Updated 3 other notes</p>}
    </Window>
  );
}

export function InsertPanel({ peek = false }: { peek?: boolean }) {
  const [inserted, setInserted] = useState(false);
  return (
    <Window title="Catering quote">
      <p>Tastings are on Thursdays. Ask about a vegan cake.</p>
      <div className="mt-4">
        {inserted ? (
          <ul className="space-y-0.5">
            {MEALS.map((meal, index) => (
              <li key={meal} className="row-in flex gap-2" style={{ "--row": index } as CSSProperties}>
                <span aria-hidden className="text-accent-strong">•</span>
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
    </Window>
  );
}

export function RecalcPanel({ playing = true }: { playing?: boolean }) {
  const changed = useAfter(700, playing);
  const guests = changed ? 95 : 80;
  const rows = [
    { label: "Food", working: `${guests} × £38`, value: guests * 38 },
    { label: "Chairs", working: `${guests} × £2`, value: guests * 2 },
    { label: "Venue", working: "weekend", value: 2400 },
  ];
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  return (
    <Window title="Budget">
      <table className="w-full text-[15px] tabular-nums">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-rule">
              <td className="py-2.5 font-medium">{row.label}</td>
              <td className="py-2.5 text-ink-soft">
                <Reprint value={row.working} />
              </td>
              <td className="py-2.5 text-right">
                <Reprint value={money(row.value)} highlight />
              </td>
            </tr>
          ))}
          <tr>
            <td className="pt-3 font-semibold">Total</td>
            <td />
            <td className="pt-3 text-right font-semibold">
              <Reprint value={money(total)} highlight />
            </td>
          </tr>
        </tbody>
      </table>
      <p className="mt-4 text-[12px] text-ink-faint">
        {changed ? "Guests changed to 95 in Catering quote. Totals worked out again." : " "}
      </p>
    </Window>
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
    <Window notebook="Collections" title="Vendors" aside={<SourceTag source="cloud" />}>
      {!done ? (
        <div className="flex flex-col items-center gap-4 py-2">
          <OrganicShimmer width={360} height={132} radius={14} />
          <span className="t-shimmer-text text-[13px]" data-text="Looking across 12 notes">
            Looking across 12 notes
          </span>
        </div>
      ) : (
        <div>
          <p className="row-in mb-3 text-[13px] text-ink-soft">3 notes share a price, a deposit and a contact.</p>
          <table className="w-full text-left text-[14px] tabular-nums">
            <thead className="text-[12px] text-ink-faint">
              <tr className="row-in border-b border-rule">
                <th className="py-2 font-medium">Vendor</th>
                <th className="py-2 font-medium">Price</th>
                <th className="py-2 font-medium">Deposit</th>
                <th className="py-2 font-medium">Contact</th>
              </tr>
            </thead>
            <tbody>
              {VENDORS.map((vendor, index) => (
                <tr key={vendor.name} className="row-in border-b border-rule last:border-0" style={{ "--row": index + 1 } as CSSProperties}>
                  <td className="py-2.5 font-medium">{vendor.name}</td>
                  <td className="py-2.5">{vendor.price}</td>
                  <td className="py-2.5">{vendor.deposit}</td>
                  <td className="py-2.5 text-ink-soft">{vendor.contact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Window>
  );
}

export function OfflinePanel() {
  return (
    <Window
      title="Readings"
      sync="local"
      aside={
        <span className="inline-flex items-center gap-1.5 rounded-full bg-paper-sunk px-2 py-0.5 text-[11px] font-medium text-ink-soft">
          <WifiOffIcon /> Offline
        </span>
      }
    >
      <p>Sam's sister will read the Mary Oliver poem. Keep it under three minutes.</p>
      <p className="mt-4">
        Second reading: my uncle, if he's back from Lisbon by the 12th
        <span aria-hidden className="ml-px inline-block h-[1.1em] w-[2px] translate-y-[3px] animate-pulse bg-accent-strong" />
      </p>
      <p className="mt-6 rounded-xl bg-paper px-4 py-3 text-[13px] text-ink-soft">
        You're offline. Notes save to this device, AI still runs on it, and everything syncs when you reconnect.
      </p>
    </Window>
  );
}

const CALLS = [
  { what: "Read your note", where: "Catering quote", source: "device", ms: "180 ms" },
  { what: "Found 3 matching notes", where: "Catering quote", source: "device", ms: "240 ms" },
  { what: "Wrote 7 meals", where: "Catering quote", source: "device", ms: "1.9 s" },
  { what: "Found a collection", where: "12 notes", source: "cloud", ms: "2.6 s" },
] as const;

export function MeterPanel({ playing = true }: { playing?: boolean }) {
  const ticked = useAfter(600, playing);
  return (
    <Window notebook="Settings" title="AI activity">
      <p className="text-[13px] text-ink-faint">Today</p>
      <div className="mt-1 flex items-baseline gap-6 tabular-nums">
        <p className="text-[34px] font-bold tracking-[-0.03em]">
          <Reprint value={ticked ? "412" : "409"} />
          <span className="ml-2 text-[14px] font-medium text-accent-strong">on device</span>
        </p>
        <p className="text-[34px] font-bold tracking-[-0.03em] text-ink-soft">
          6<span className="ml-2 text-[14px] font-medium">cloud</span>
        </p>
      </div>
      <ul className="mt-4">
        {CALLS.map((call) => (
          <li key={call.what} className="flex items-center gap-3 border-t border-rule py-2.5 text-[14px]">
            <span className="min-w-0 flex-1 truncate">
              {call.what} <span className="text-ink-faint">· {call.where}</span>
            </span>
            <span className="text-[12px] text-ink-faint tabular-nums">{call.ms}</span>
            <SourceTag source={call.source} />
          </li>
        ))}
      </ul>
    </Window>
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
    <div className="flex flex-col items-start gap-5">
      <SyncBadge state={state} />
      <InferenceMeter local={412} cloud={6} />
    </div>
  );
}

function WifiOffIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M2 2l12 12M5.5 8.6a4 4 0 0 1 2-.9M3 6a7.5 7.5 0 0 1 2.4-1.5M10.6 7.9c.4.2.7.4 1 .7M8.2 4.5A7.5 7.5 0 0 1 13 6" />
      <circle cx="8" cy="12" r="0.9" fill="currentColor" />
    </svg>
  );
}
