import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { InferenceMeter, SourceTag } from "../../../ui/InferenceMeter";
import { InsertButton } from "../../../ui/InsertButton";
import { OptionsMenu } from "../../../ui/OptionsMenu";
import { OrganicShimmer } from "../../../ui/OrganicShimmer";
import { Popover } from "../../../ui/Popover";
import { SyncBadge, type SyncState } from "../../../ui/SyncBadge";
import { VarChip } from "../../../ui/VarChip";

export function Moments() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
      <h1 className="font-note text-[36px] font-medium tracking-[-0.02em]">Where the AI shows its work</h1>
      <p className="mt-2 max-w-[60ch] text-ink-soft">
        Each moment the model does something, and how it looks. Purple is on-device, teal is cloud. Replay any card.
      </p>
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <Moment title="Spotting" source="device" note="Runs on every typing pause. Values print in as dotted ink.">
          {() => <SpottingDemo />}
        </Moment>
        <Moment title="Suggesting" source="device" note="Options are ready before you click. Nothing changes until you pick.">
          {() => <SuggestingDemo />}
        </Moment>
        <Moment title="Reprinting" source="none" note="Plain code, no AI. A changed value lands with a violet copy slipping into register.">
          {() => <ReprintDemo />}
        </Moment>
        <Moment title="Inserting" source="device" note="Hover to preview what was written ahead of time. Click to add it.">
          {() => <InsertDemo />}
        </Moment>
        <Moment title="Finding collections" source="cloud" note="The cloud sees extracted values only, never full notes.">
          {() => <CollectionsDemo />}
        </Moment>
        <Moment title="Saving" source="none" note="Writes land on the device first. Never wait on a save.">
          {() => <SavingDemo />}
        </Moment>
      </div>
    </div>
  );
}

function Moment({
  title,
  source,
  note,
  children,
}: {
  title: string;
  source: "device" | "cloud" | "none";
  note: string;
  children: () => ReactNode;
}) {
  const [run, setRun] = useState(0);
  return (
    <section className="flex flex-col rounded-2xl border border-rule bg-paper-raised">
      <header className="flex items-center justify-between gap-3 border-b border-rule px-5 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[14px] font-medium">{title}</h2>
          {source === "none" ? (
            <span className="font-mono text-[10px] text-ink-faint">no AI</span>
          ) : (
            <SourceTag source={source} />
          )}
        </div>
        <button
          type="button"
          onClick={() => setRun((n) => n + 1)}
          className="rounded-full px-2.5 py-1 text-[12px] text-ink-soft transition hover:bg-paper-sunk hover:text-ink"
        >
          Replay
        </button>
      </header>
      <div key={run} className="flex min-h-56 flex-1 items-center px-6 py-8">
        <div className="w-full">{children()}</div>
      </div>
      <p className="border-t border-rule px-5 py-3 text-[12px] text-ink-soft">{note}</p>
    </section>
  );
}

function useAfter(ms: number): boolean {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setDone(true), ms);
    return () => window.clearTimeout(timer);
  }, [ms]);
  return done;
}

function SpottingDemo() {
  const spotted = useAfter(1300);
  const ink = (text: string, delay: number) =>
    spotted ? (
      <span className="ink-detected" style={{ "--ink-delay": `${delay}ms` } as CSSProperties}>
        {text}
      </span>
    ) : (
      text
    );
  return (
    <div>
      <p className="font-note text-[19px] leading-[1.7]">
        Hartley Barn holds {ink("120 seated", 0)}, costs {ink("£2,400", 120)} for the weekend and needs a{" "}
        {ink("£600", 240)} deposit.
      </p>
      <p className="mt-4 text-[12px] text-ink-soft">
        {spotted ? (
          "Spotted 3 values"
        ) : (
          <span className="t-shimmer-text" data-text="Reading this paragraph">
            Reading this paragraph
          </span>
        )}
      </p>
    </div>
  );
}

function SuggestingDemo() {
  const open = useAfter(500);
  return (
    <div className="font-note text-[19px] leading-[1.7]">
      Final numbers are due by{" "}
      <span className="relative inline-block">
        <span className="ink-detected" data-open={open}>
          the 14th of June
        </span>
        <Popover open={open} className="absolute top-full left-0 z-10 mt-2">
          <OptionsMenu
            quote="the 14th of June"
            kind="date"
            onPick={() => undefined}
            options={[
              { id: "link", mark: "〃", label: "Link to", detail: "event_date", hint: "14 June · used in 3 notes" },
              { id: "new", mark: "+", label: "New variable", detail: "numbers_due" },
              { id: "text", mark: "", label: "Keep as text" },
            ]}
          />
        </Popover>
      </span>
      <div className="h-48" />
    </div>
  );
}

function ReprintDemo() {
  const changed = useAfter(700);
  const guests = changed ? 95 : 80;
  return (
    <div className="space-y-3 font-note text-[18px] leading-[1.7]">
      <p>
        Buffet for <VarChip name="guest_count" value={String(guests)} usedIn={4} /> guests.
      </p>
      <p>
        Food: <VarChip name="guest_count" value={String(guests)} usedIn={4} /> × £38 ={" "}
        <VarChip name="food_total" value={`£${(guests * 38).toLocaleString("en-GB")}`} formula="guest_count × 38" />
      </p>
      <p>
        <VarChip name="guest_count" value={String(guests)} usedIn={4} /> chairs, plus 4 spare.
      </p>
    </div>
  );
}

function InsertDemo() {
  const [inserted, setInserted] = useState(false);
  const items = ["Pick up the rings", "Confirm the playlist", "Print the seating plan"];
  return (
    <div className="font-note text-[19px] leading-[1.7]">
      {inserted ? (
        <ul className="list-disc pl-6 marker:text-ditto">
          {items.map((item, index) => (
            <li key={item} className="row-in" style={{ "--row": index } as CSSProperties}>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ink-soft italic">
          make a to-do list for the day before
          <InsertButton label="Add 3 to-dos" preview={items} onInsert={() => setInserted(true)} />
        </p>
      )}
    </div>
  );
}

const VENDORS = [
  { name: "Rosa's Kitchen", price: "£3,610", deposit: "£500", contact: "Rosa · 07700 900123" },
  { name: "Hartley Barn", price: "£2,400", deposit: "£600", contact: "Bookings · 07700 900456" },
  { name: "Chair Hire Co", price: "£190", deposit: "None", contact: "Dev · 07700 900789" },
];

function CollectionsDemo() {
  const done = useAfter(2600);
  if (!done) {
    return (
      <div className="flex flex-col items-center gap-4">
        <OrganicShimmer width={320} height={120} radius={14} />
        <span className="t-shimmer-text text-[12px]" data-text="Looking across 12 notes">
          Looking across 12 notes
        </span>
      </div>
    );
  }
  return (
    <div>
      <p className="row-in mb-3 text-[13px] text-ink-soft">
        <span className="font-medium text-ink">Vendors</span> · 3 notes share price, deposit and contact
      </p>
      <table className="w-full text-left text-[13px]">
        <thead className="text-[11px] text-ink-faint">
          <tr className="row-in border-b border-rule">
            <th className="py-1.5 font-normal">Vendor</th>
            <th className="py-1.5 font-normal">Price</th>
            <th className="py-1.5 font-normal">Deposit</th>
            <th className="hidden py-1.5 font-normal sm:table-cell">Contact</th>
          </tr>
        </thead>
        <tbody>
          {VENDORS.map((vendor, index) => (
            <tr key={vendor.name} className="row-in border-b border-rule last:border-0" style={{ "--row": index + 1 } as CSSProperties}>
              <td className="py-2 font-medium">{vendor.name}</td>
              <td className="py-2 font-note text-[15px] tabular-nums">{vendor.price}</td>
              <td className="py-2 font-note text-[15px] tabular-nums">{vendor.deposit}</td>
              <td className="hidden py-2 text-ink-soft sm:table-cell">{vendor.contact}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SavingDemo() {
  const [state, setState] = useState<SyncState>("local");
  const [calls, setCalls] = useState({ local: 409, cloud: 6 });
  useEffect(() => {
    const steps: [number, SyncState][] = [
      [1400, "syncing"],
      [2600, "synced"],
    ];
    const timers = steps.map(([ms, next]) => window.setTimeout(() => setState(next), ms));
    const counter = window.setTimeout(() => setCalls({ local: 412, cloud: 6 }), 900);
    return () => [...timers, counter].forEach((t) => window.clearTimeout(t));
  }, []);
  return (
    <div className="flex flex-col items-start gap-5">
      <SyncBadge state={state} />
      <InferenceMeter local={calls.local} cloud={calls.cloud} />
    </div>
  );
}
