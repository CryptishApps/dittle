import { AnimatePresence, m, useInView } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Reprint } from "../../ui/Reprint";
import { Btn, ease, MIcon, TypeOn } from "../../ui/kit";

type OtherId = "flights" | "dinner" | "chat";
type Phase = "idle" | "updating" | "done";

const pounds = (n: number) => `£${n.toLocaleString("en-GB")}`;
const euros = (n: number) => `€${Math.round(n).toLocaleString("en-GB")}`;
const VILLA = 1680;

const OTHERS: { id: OtherId; title: string; path: string; body: (value: ReactNode, g: number) => ReactNode }[] = [
  {
    id: "flights",
    title: "Flights",
    path: "Lisbon → Flights",
    body: (value, people) => (
      <>
        {value} seats at £118 each, <Reprint value={pounds(people * 118)} /> in total. We land Fri 11 December.
      </>
    ),
  },
  { id: "dinner", title: "Saturday dinner", path: "Lisbon → Food", body: (value) => <>Table for {value} at Taberna da Rua, 8pm.</> },
  { id: "chat", title: "Message to the group", path: "Lisbon → Drafts", body: (value) => <>The villa's booked for {value} of us, 11 to 14 December.</> },
];

const START = 6;
const MAX = 20;

export function Demo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20% 0px" });
  const [found, setFound] = useState(false);
  const [people, setPeople] = useState(START);
  const [values, setValues] = useState<Record<OtherId, number>>({ flights: START, dinner: START, chat: START });
  const [phase, setPhase] = useState<Record<OtherId, Phase>>({ flights: "idle", dinner: "idle", chat: "idle" });
  const [skipped, setSkipped] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (!inView) return;
    const timer = window.setTimeout(() => setFound(true), 500);
    return () => window.clearTimeout(timer);
  }, [inView]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const stale = OTHERS.filter((other) => values[other.id] !== people);
  const changed = people !== START || OTHERS.some((other) => values[other.id] !== START);
  const allDone = changed && stale.length === 0 && OTHERS.every((other) => phase[other.id] === "done");

  const edit = (next: number) => {
    if (!Number.isInteger(next) || next < 1 || next > MAX || next === people) return;
    setPeople(next);
    setSkipped(false);
    setPhase({ flights: "idle", dinner: "idle", chat: "idle" });
  };

  const update = () => {
    stale.forEach((other, index) => {
      timers.current.push(
        window.setTimeout(() => setPhase((p) => ({ ...p, [other.id]: "updating" })), index * 240),
        window.setTimeout(
          () => {
            setValues((v) => ({ ...v, [other.id]: people }));
            setPhase((p) => ({ ...p, [other.id]: "done" }));
          },
          index * 240 + 420,
        ),
      );
    });
  };

  const reset = () => {
    setPeople(START);
    setValues({ flights: START, dinner: START, chat: START });
    setPhase({ flights: "idle", dinner: "idle", chat: "idle" });
    setSkipped(false);
  };

  return (
    <div ref={ref} className="grid overflow-hidden rounded-[22px] border border-line bg-card shadow-pop lg:grid-cols-[1.15fr_1fr]">
      <div className="border-b border-line bg-card lg:border-r lg:border-b-0">
        <Bar left="Villa" right={found ? "3 values · on device" : "Reading"} />
        <div className="px-6 pt-4 pb-8 sm:px-10 sm:pb-10">
          <p className="text-[19px] leading-[1.95]">
            The villa in Alfama sleeps{" "}
            <span
              role="textbox"
              aria-label="Group size"
              contentEditable
              suppressContentEditableWarning
              spellCheck={false}
              key={people}
              className="token"
              data-found={found}
              data-state={stale.length && !skipped ? "changed" : "idle"}
              onBlur={(event) => {
                const next = Number(event.currentTarget.textContent?.trim());
                if (Number.isInteger(next) && next > 0 && next <= MAX) edit(next);
                else event.currentTarget.textContent = String(people);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
              }}
            >
              {people}
            </span>{" "}
            of us for{" "}
            <span className="token" data-found={found} style={{ "--token-delay": "120ms" } as CSSProperties}>
              €1,680
            </span>
            , so about{" "}
            <span className="token" data-kind="derived" data-found={found} style={{ "--token-delay": "240ms" } as CSSProperties}>
              <Reprint value={euros(VILLA / people)} />
            </span>{" "}
            each.
          </p>

          <div className="mt-7 flex items-center gap-3 text-[14px] font-medium text-soft">
            Group size
            <span className="flex items-center rounded-full border border-line-strong bg-card p-1">
              <button type="button" aria-label="Fewer people" onClick={() => edit(people - 1)} className="grid size-8 place-items-center rounded-full text-[18px] text-ink transition-colors hover:bg-chip">
                −
              </button>
              <span className="grid w-10 place-items-center font-heading text-[18px] font-semibold text-ink tabular-nums">
                <Reprint value={String(people)} />
              </span>
              <button type="button" aria-label="More people" onClick={() => edit(people + 1)} className="grid size-8 place-items-center rounded-full text-[18px] text-ink transition-colors hover:bg-chip">
                +
              </button>
            </span>
            <span className="hidden sm:inline">or click the number and type</span>
          </div>

          <AnimatePresence initial={false} mode="wait">
            {(stale.length > 0 && !skipped) || allDone ? (
              <m.div
                key={allDone ? "done" : "ask"}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease }}
                className="overflow-hidden"
              >
                <div className={`mt-6 rounded-2xl px-5 py-4 text-[14.5px] leading-[1.6] ${allDone ? "bg-accent-tint" : "bg-accent-tint"}`}>
                  {allDone ? (
                    <div className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-2.5 font-semibold text-accent-ink">
                        <span className="grid size-7 place-items-center rounded-full bg-sticky text-sticky-ink">
                          <MIcon name="check" className="size-4" />
                        </span>
                        <TypeOn text="3 notes updated on device" />
                      </span>
                      <Btn size="md" onClick={reset}>
                        Reset
                      </Btn>
                    </div>
                  ) : (
                    <>
                      <p className="font-medium text-accent-ink">
                        {stale.length} {stale.length === 1 ? "note still says" : "notes still say"} {values[stale[0]!.id]}.
                      </p>
                      <div className="mt-3.5 flex flex-wrap gap-2">
                        <Btn primary size="md" onClick={update}>
                          Update {stale.length} {stale.length === 1 ? "note" : "notes"}
                        </Btn>
                        <Btn size="md" onClick={() => setSkipped(true)}>
                          Only in this note
                        </Btn>
                      </div>
                    </>
                  )}
                </div>
              </m.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <div className="divide-y divide-line bg-page">
        {OTHERS.map((other) => {
          const isStale = values[other.id] !== people;
          const status =
            phase[other.id] === "updating" ? (
              <span className="t-shimmer-text" data-text="Updating">
                Updating
              </span>
            ) : phase[other.id] === "done" && !isStale ? (
              <TypeOn text="Updated · 190 ms" />
            ) : isStale ? (
              <span className="font-semibold text-accent-ink">Says {values[other.id]}</span>
            ) : (
              "In step"
            );
          return (
            <div key={other.id} className="relative">
              <span aria-hidden className={`absolute inset-y-3 left-0 w-[3px] rounded-full transition-colors duration-300 ${isStale ? "bg-accent" : "bg-transparent"}`} />
              <Bar left={other.title} right={status} />
              <p className="px-6 pt-1 pb-5 text-[15.5px] leading-[1.9] text-soft">
                {other.body(
                  <span className="token" data-found={found} data-state={isStale ? "stale" : "idle"}>
                    <Reprint value={String(values[other.id])} />
                  </span>,
                  values[other.id],
                )}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Bar({ left, right }: { left: string; right: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-2 text-[13.5px]">
      <span className="flex items-center gap-2 font-semibold">
        <MIcon name="file" className="size-4 text-accent" />
        {left}
      </span>
      <span className="text-faint">{right}</span>
    </div>
  );
}
