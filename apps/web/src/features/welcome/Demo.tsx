import { AnimatePresence, motion, useInView } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Reprint } from "../../ui/Reprint";
import { Btn, ease, MIcon, Scramble } from "../../ui/kit";

type OtherId = "budget" | "chairs" | "email";
type Phase = "idle" | "updating" | "done";

const money = (n: number) => `£${n.toLocaleString("en-GB")}`;

const OTHERS: { id: OtherId; title: string; path: string; body: (value: ReactNode, g: number) => ReactNode }[] = [
  {
    id: "budget",
    title: "Budget",
    path: "Wedding → Budget",
    body: (value, g) => (
      <>
        Food: {value} × £38 = <Reprint value={money(g * 38)} />. Barn £2,400.
      </>
    ),
  },
  { id: "chairs", title: "Chair hire", path: "Wedding → Vendors", body: (value) => <>{value} chairs, plus 4 spare for the top table.</> },
  { id: "email", title: "Email to Sam", path: "Wedding → Drafts", body: (value) => <>We're expecting {value} people on 14 June, so the barn works.</> },
];

const START = 80;

export function Demo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20% 0px" });
  const [found, setFound] = useState(false);
  const [guests, setGuests] = useState(START);
  const [values, setValues] = useState<Record<OtherId, number>>({ budget: START, chairs: START, email: START });
  const [phase, setPhase] = useState<Record<OtherId, Phase>>({ budget: "idle", chairs: "idle", email: "idle" });
  const [skipped, setSkipped] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (!inView) return;
    const timer = window.setTimeout(() => setFound(true), 500);
    return () => window.clearTimeout(timer);
  }, [inView]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const stale = OTHERS.filter((other) => values[other.id] !== guests);
  const changed = guests !== START || OTHERS.some((other) => values[other.id] !== START);
  const allDone = changed && stale.length === 0 && OTHERS.every((other) => phase[other.id] === "done");

  const edit = (next: number) => {
    if (!Number.isInteger(next) || next < 1 || next > 999 || next === guests) return;
    setGuests(next);
    setSkipped(false);
    setPhase({ budget: "idle", chairs: "idle", email: "idle" });
  };

  const update = () => {
    stale.forEach((other, index) => {
      timers.current.push(
        window.setTimeout(() => setPhase((p) => ({ ...p, [other.id]: "updating" })), index * 240),
        window.setTimeout(
          () => {
            setValues((v) => ({ ...v, [other.id]: guests }));
            setPhase((p) => ({ ...p, [other.id]: "done" }));
          },
          index * 240 + 420,
        ),
      );
    });
  };

  const reset = () => {
    setGuests(START);
    setValues({ budget: START, chairs: START, email: START });
    setPhase({ budget: "idle", chairs: "idle", email: "idle" });
    setSkipped(false);
  };

  return (
    <div ref={ref} className="grid border border-line-strong lg:grid-cols-[1.15fr_1fr]">
      <div className="border-b border-line-strong bg-card lg:border-r lg:border-b-0">
        <Bar left="Catering quote" right={found ? "4 values · on device" : "Reading"} />
        <div className="px-6 py-8 sm:px-10 sm:py-10">
          <p className="text-[17px] leading-[2]">
            Rosa's Kitchen can do a buffet for{" "}
            <span
              role="textbox"
              aria-label="Guest count"
              contentEditable
              suppressContentEditableWarning
              spellCheck={false}
              key={guests}
              className="token"
              data-found={found}
              data-state={stale.length && !skipped ? "changed" : "idle"}
              onBlur={(event) => {
                const next = Number(event.currentTarget.textContent?.trim());
                if (Number.isInteger(next) && next > 0 && next < 1000) edit(next);
                else event.currentTarget.textContent = String(guests);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
              }}
            >
              {guests}
            </span>{" "}
            guests at{" "}
            <span className="token" data-found={found} style={{ "--token-delay": "120ms" } as CSSProperties}>
              £38
            </span>{" "}
            a head, so roughly{" "}
            <span className="token" data-kind="derived" data-found={found} style={{ "--token-delay": "240ms" } as CSSProperties}>
              <Reprint value={money(guests * 38)} />
            </span>{" "}
            before drinks.
          </p>

          <div className="mt-6 flex items-center gap-3 text-[11px] tracking-[0.05em] text-faint uppercase">
            Guest count
            <span className="flex border border-line-strong">
              <button type="button" aria-label="Fewer guests" onClick={() => edit(guests - 5)} className="grid size-8 place-items-center hover:bg-chip">
                −
              </button>
              <span className="grid w-12 place-items-center border-x border-line-strong text-[13px] text-ink tabular-nums">
                <Reprint value={String(guests)} />
              </span>
              <button type="button" aria-label="More guests" onClick={() => edit(guests + 5)} className="grid size-8 place-items-center hover:bg-chip">
                +
              </button>
            </span>
            <span className="hidden sm:inline">or click the number and type</span>
          </div>

          <AnimatePresence initial={false} mode="wait">
            {(stale.length > 0 && !skipped) || allDone ? (
              <motion.div
                key={allDone ? "done" : "ask"}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease }}
                className="overflow-hidden"
              >
                <div className="mt-6 border-l-2 border-accent bg-panel px-4 py-3 text-[13px] leading-[1.6]">
                  {allDone ? (
                    <div className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-2">
                        <MIcon name="check" className="size-4 text-accent" />
                        <Scramble text="3 notes updated on device" />
                      </span>
                      <Btn onClick={reset}>Reset</Btn>
                    </div>
                  ) : (
                    <>
                      <p className="text-soft">
                        {stale.length} {stale.length === 1 ? "note still says" : "notes still say"} {values[stale[0]!.id]}.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Btn primary onClick={update}>
                          Update {stale.length} {stale.length === 1 ? "note" : "notes"}
                        </Btn>
                        <Btn onClick={() => setSkipped(true)}>Only this note</Btn>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <div className="divide-y divide-line-strong bg-panel">
        {OTHERS.map((other) => {
          const isStale = values[other.id] !== guests;
          const status =
            phase[other.id] === "updating" ? (
              <span className="t-shimmer-text" data-text="Updating">
                Updating
              </span>
            ) : phase[other.id] === "done" && !isStale ? (
              <Scramble text="Updated · 190 ms" />
            ) : isStale ? (
              <span className="text-accent-ink">Says {values[other.id]}</span>
            ) : (
              "In step"
            );
          return (
            <div key={other.id} className="relative">
              <span aria-hidden className={`absolute inset-y-0 left-0 w-[2px] transition-colors duration-300 ${isStale ? "bg-accent" : "bg-transparent"}`} />
              <Bar left={other.title} right={status} />
              <p className="px-6 pt-1 pb-5 text-[14px] leading-[1.9] text-soft">
                {other.body(
                  <span className="token text-ink" data-found={found} data-state={isStale ? "stale" : "idle"}>
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
    <div className="flex items-center justify-between gap-3 px-6 pt-4 pb-2 text-[11px] tracking-[0.05em] uppercase">
      <span className="flex items-center gap-2 font-medium">
        <MIcon name="file" className="size-3.5 text-soft" />
        {left}
      </span>
      <span className="text-faint">{right}</span>
    </div>
  );
}
