import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { btnClass, ease, MIcon } from "../../ui/kit";
import { LogoMark } from "../../ui/Wordmark";
import { Rise } from "./motion";

const FILE_AFTER_MS = 1800;

const RUNS = [
  { day: "Sat", distance: "8 km", time: "46:10" },
  { day: "Wed", distance: "6 km", time: "33:05" },
];

export function DeskHero({ onStart }: { onStart: () => void }) {
  const reduce = useReducedMotion();
  const [filed, setFiled] = useState(Boolean(reduce));
  useEffect(() => {
    if (reduce) return;
    const timer = window.setTimeout(() => setFiled(true), FILE_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [reduce]);

  return (
    <header className="px-2 pt-[76px] sm:px-4">
      <div className="desk relative overflow-hidden rounded-[26px] sm:rounded-[34px] lg:min-h-[800px]">
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
          <RunSticky className="absolute top-[56px] left-[46px] w-[268px] -rotate-[5deg]" />
          <TotalKey filed={filed} className="absolute top-[268px] left-[176px] rotate-[6deg]" />
          <Calendar className="absolute top-[78px] right-[440px] -rotate-[8deg]" />
          <Folder title="Runs" className="top-[82px] right-[56px] w-[350px] rotate-[4deg]">
            <RunsTable filed={filed} />
          </Folder>
          <ChipTile className="top-[470px] right-[96px] -rotate-[10deg]" />
          <Folder title="Lisbon trip" className="bottom-[-18px] left-[96px] w-[360px] -rotate-3">
            <div className="rounded-[14px] bg-card px-4 py-3 text-[15px] leading-[1.85] text-soft shadow-[0_1px_2px_rgb(18_20_24/0.06)]">
              Flights land on <Key>Fri 11 December</Key> at 9:40.{" "}
              <span className="text-ink underline decoration-accent-line decoration-dashed decoration-2 underline-offset-[6px]">Write a packing list for the weekend.</span>{" "}
              <span className="ml-0.5 inline-flex items-center gap-1 rounded-[9px] bg-accent px-2.5 text-[13.5px] leading-[1.9] font-semibold text-on-accent shadow-press">
                <MIcon name="plus" className="size-3.5" />
                Add a packing list
              </span>
            </div>
          </Folder>
          <AnimatePresence>
            {filed && (
              <m.div
                initial={{ opacity: 0, y: 18, rotate: -4 }}
                animate={{ opacity: 1, y: 0, rotate: -3 }}
                transition={{ duration: 0.5, ease, delay: 0.35 }}
                className="absolute right-[120px] bottom-[34px] w-[330px]"
              >
                <Folder title="Just now" className="relative">
                  <div className="flex items-center gap-3 rounded-[14px] bg-card px-4 py-3 shadow-[0_1px_2px_rgb(18_20_24/0.06)]">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-on-accent shadow-press">
                      <MIcon name="check" className="size-5" />
                    </span>
                    <span>
                      <span className="block text-[15px] font-semibold text-ink">Added to Runs · Today</span>
                      <span className="block text-[13.5px] text-soft">5 km in 27:40, 5:32 a km</span>
                    </span>
                  </div>
                </Folder>
              </m.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative mx-auto flex max-w-[920px] flex-col items-center px-5 pt-14 pb-12 text-center sm:pt-20 lg:pt-[118px] lg:pb-0">
          <Rise>
            <span aria-hidden className="tile mb-9 grid size-[92px] place-items-center rounded-[26px] [--mark-gap:var(--card-top)] sm:mb-11 sm:size-[104px] sm:rounded-[28px]">
              <LogoMark className="size-[50px] sm:size-[54px]" />
            </span>
          </Rise>
          <h1 className="text-[48px] leading-[1.04] font-semibold tracking-[-0.05em] sm:text-[72px] lg:text-[88px]">
            Plans change.
            <span className="block text-quiet">Your notes keep up.</span>
          </h1>
          <Rise delay={0.14}>
            <p className="mx-auto mt-7 max-w-[38ch] text-[18px] leading-[1.55] text-soft sm:text-[21px]">
              Write it down in plain notes. Change a price or a date once and every note follows. Log a run or a quote and it lands in a table that adds itself up.
            </p>
          </Rise>
          <Rise delay={0.22}>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={onStart} className={btnClass({ variant: "primary", size: "lg" })}>
                Start planning, free
              </button>
            </div>
            <p className="mt-4 text-[14px] text-faint">Runs on your device with Gemini Nano · Works offline</p>
          </Rise>

          <div aria-hidden className="mt-12 flex items-start justify-center gap-4 lg:hidden">
            <TotalKey filed={filed} className="relative -rotate-[4deg]" />
            <RunSticky className="relative w-[200px] rotate-[3deg] !text-[22px]" />
          </div>
        </div>
      </div>
    </header>
  );
}

function RunSticky({ className }: { className: string }) {
  return (
    <div className={`sticky-note px-6 pt-10 pb-8 font-hand text-[29px] leading-[1.15] ${className}`}>
      <span className="absolute top-[-9px] left-1/2 size-[18px] rounded-full bg-[radial-gradient(circle_at_35%_30%,#ff8a8a,#d92b2b)] shadow-[0_4px_6px_rgb(0_0_0/0.25)]" />
      Morning run
      <br />
      5 km along the river
      <br />
      in 27:40. Legs fine!
    </div>
  );
}

function TotalKey({ filed, className }: { filed: boolean; className: string }) {
  return (
    <div className={`tile w-[160px] shrink-0 px-4 pt-4 pb-4 text-center ${className}`}>
      <AnimatePresence>
        {filed && (
          <m.span
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease }}
            className="absolute -top-3 -right-3 rounded-full bg-accent px-2.5 py-1 text-[13px] font-bold text-on-accent shadow-press"
          >
            +5 km
          </m.span>
        )}
      </AnimatePresence>
      <span className="relative block h-[76px] overflow-hidden text-[72px] leading-none font-semibold tracking-[-0.045em] tabular-nums">
        <AnimatePresence initial={false}>
          <m.span key={filed ? "47" : "42"} initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "-100%" }} transition={{ duration: 0.45, ease }} className="absolute inset-0">
            {filed ? "47" : "42"}
          </m.span>
        </AnimatePresence>
      </span>
      <span className="mt-1 block text-[14px] font-semibold text-soft">km this month</span>
      <span className="mt-1.5 block text-[13px] text-faint">Runs · total</span>
    </div>
  );
}

function RunsTable({ filed }: { filed: boolean }) {
  return (
    <div className="overflow-hidden rounded-[14px] bg-card text-[14.5px] shadow-[0_1px_2px_rgb(18_20_24/0.06)]">
      <div className="grid grid-cols-3 bg-panel px-4 py-2 text-[12.5px] font-semibold text-faint">
        <span>Day</span>
        <span>Distance</span>
        <span>Time</span>
      </div>
      <AnimatePresence initial={false}>
        {filed && (
          <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} transition={{ duration: 0.45, ease }} className="overflow-hidden">
            <div className="grid grid-cols-3 items-center border-t border-line px-4 py-2">
              <span className="font-semibold text-ink">Today</span>
              <span>
                <span className="value-chip" data-proposal="true">
                  5 km
                </span>
              </span>
              <span>
                <span className="value-chip" data-proposal="true">
                  27:40
                </span>
              </span>
            </div>
          </m.div>
        )}
      </AnimatePresence>
      {RUNS.map((run) => (
        <div key={run.day} className="grid grid-cols-3 items-center border-t border-line px-4 py-2 text-soft">
          <span>{run.day}</span>
          <span>
            <span className="value-chip">{run.distance}</span>
          </span>
          <span>
            <span className="value-chip">{run.time}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function Calendar({ className }: { className: string }) {
  return (
    <div className={`tile w-[96px] overflow-hidden text-center ${className}`}>
      <span className="block bg-date py-1.5 text-[13px] font-bold tracking-[0.08em] text-date-ink">DEC</span>
      <span className="mt-1 block text-[44px] leading-[1.1] font-semibold tracking-[-0.03em]">11</span>
      <span className="block pb-2.5 text-[12px] font-semibold text-soft">in 24 days</span>
    </div>
  );
}

function ChipTile({ className }: { className: string }) {
  return (
    <div className={`tile absolute grid size-[92px] place-items-center ${className}`}>
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="6" width="12" height="12" rx="2.5" />
        <path d="M9 2.5v3M15 2.5v3M9 18.5v3M15 18.5v3M2.5 9h3M2.5 15h3M18.5 9h3M18.5 15h3" />
        <rect x="9.5" y="9.5" width="5" height="5" rx="1" fill="var(--accent)" stroke="none" />
      </svg>
    </div>
  );
}

function Folder({ title, className, children }: { title: string; className: string; children: ReactNode }) {
  return (
    <div className={`folder absolute p-[18px] shadow-[0_30px_40px_-26px_rgb(18_20_24/0.35)] ${className}`}>
      <p className="relative mb-3.5 ml-0.5 text-[19px] font-semibold tracking-[-0.01em] text-ink">{title}</p>
      {children}
    </div>
  );
}

function Key({ children }: { children: ReactNode }) {
  return <span className="value-chip">{children}</span>;
}
