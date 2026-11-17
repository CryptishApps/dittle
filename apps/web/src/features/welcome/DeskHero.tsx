import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { btnClass, ease, MIcon } from "../../ui/kit";
import { LogoMark } from "../../ui/Wordmark";
import { Rise } from "./motion";

const CHANGE_AFTER_MS = 1800;

export function DeskHero({ onStart }: { onStart: () => void }) {
  const reduce = useReducedMotion();
  const [changed, setChanged] = useState(Boolean(reduce));
  useEffect(() => {
    if (reduce) return;
    const timer = window.setTimeout(() => setChanged(true), CHANGE_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [reduce]);

  return (
    <header className="px-2 pt-[76px] sm:px-4">
      <div className="desk relative overflow-hidden rounded-[26px] sm:rounded-[34px] lg:min-h-[800px]">
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
          <Sticky changed={changed} className="absolute top-[56px] left-[46px] w-[268px] -rotate-[5deg]" />
          <CountKey changed={changed} className="absolute top-[262px] left-[180px] rotate-[6deg]" />
          <Calendar className="top-[78px] right-[430px] -rotate-[8deg]" />
          <Folder title="Lisbon trip" className="top-[82px] right-[64px] w-[340px] rotate-[4deg]">
            <p className="rounded-[14px] bg-card px-4 py-3 text-[15px] leading-[1.85] text-soft shadow-[0_1px_2px_rgb(18_20_24/0.06)]">
              Dinner at Taberna da Rua for <Key fresh={changed}>{changed ? "8" : "6"}</Key> on <Key>Sat 12 December</Key>, then fado in Alfama.
            </p>
          </Folder>
          <ChipTile className="top-[400px] right-[140px] -rotate-[10deg]" />
          <Folder title="Budget" className="bottom-[-18px] left-[96px] w-[350px] -rotate-3">
            <div className="rounded-[14px] bg-card px-4 py-1.5 text-[15px] text-soft shadow-[0_1px_2px_rgb(18_20_24/0.06)]">
              <Row label="Villa, each" value={changed ? "€210" : "€280"} fresh={changed} />
              <Row label="Flights, total" value={changed ? "£944" : "£708"} fresh={changed} />
              <Row label="Fado night, each" value="€45" />
            </div>
          </Folder>
          <AnimatePresence>
            {changed && (
              <m.div
                initial={{ opacity: 0, y: 18, rotate: -4 }}
                animate={{ opacity: 1, y: 0, rotate: -3 }}
                transition={{ duration: 0.5, ease, delay: 0.25 }}
                className="absolute right-[110px] bottom-[36px] w-[330px]"
              >
                <Folder title="Just now" className="relative">
                  <div className="flex items-center gap-3 rounded-[14px] bg-card px-4 py-3 shadow-[0_1px_2px_rgb(18_20_24/0.06)]">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-on-accent shadow-press">
                      <MIcon name="check" className="size-5" />
                    </span>
                    <span>
                      <span className="block text-[15px] font-semibold text-ink">Group size is now 8</span>
                      <span className="block text-[13.5px] text-soft">Updated in 3 notes</span>
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
            <p className="mx-auto mt-7 max-w-[34ch] text-[18px] leading-[1.55] text-soft sm:text-[21px]">
              Write the plan in plain notes. Change a price, a date or a headcount once, and every note that mentions it follows.
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
            <CountKey changed={changed} className="relative rotate-[-4deg]" />
            <Sticky changed={changed} className="relative w-[210px] rotate-[3deg] !text-[23px]" />
          </div>
        </div>
      </div>
    </header>
  );
}

function Sticky({ changed, className }: { changed: boolean; className: string }) {
  return (
    <div className={`sticky-note px-6 pt-10 pb-8 font-hand text-[29px] leading-[1.15] ${className}`}>
      <span className="absolute top-[-9px] left-1/2 size-[18px] rounded-full bg-[radial-gradient(circle_at_35%_30%,#ff8a8a,#d92b2b)] shadow-[0_4px_6px_rgb(0_0_0/0.25)]" />
      Villa in Alfama
      <br />
      sleeps {changed ? <s className="decoration-2 opacity-60">6</s> : "6"} {changed && <span className="text-sticky-mark">8</span>} of us
      <br />
      €1,680 for the week
      <br />→ {changed ? "€210" : "€280"} each!
    </div>
  );
}

function CountKey({ changed, className }: { changed: boolean; className: string }) {
  return (
    <div className={`tile w-[150px] shrink-0 px-4 pt-4 pb-4 text-center ${className}`}>
      <AnimatePresence>
        {changed && (
          <m.span
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease }}
            className="absolute -top-3 -right-3 rounded-full bg-accent px-2.5 py-1 text-[13px] font-bold text-on-accent shadow-press"
          >
            was 6
          </m.span>
        )}
      </AnimatePresence>
      <span className="relative block h-[84px] overflow-hidden text-[84px] leading-none font-semibold tracking-[-0.04em]">
        <AnimatePresence initial={false}>
          <m.span key={changed ? "8" : "6"} initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "-100%" }} transition={{ duration: 0.45, ease }} className="absolute inset-0">
            {changed ? "8" : "6"}
          </m.span>
        </AnimatePresence>
      </span>
      <span className="mt-1 block text-[14px] font-semibold text-soft">people coming</span>
      <span className="mt-3 flex justify-center gap-2.5">
        <span className="grid h-6 w-8 place-items-center rounded-lg bg-chip text-[16px] font-semibold text-soft">−</span>
        <span className={`grid h-6 w-8 place-items-center rounded-lg text-[16px] font-semibold transition-colors ${changed ? "bg-accent-tint text-accent-ink" : "bg-chip text-soft"}`}>+</span>
      </span>
    </div>
  );
}

function Calendar({ className }: { className: string }) {
  return (
    <div className={`tile absolute w-[96px] overflow-hidden text-center ${className}`}>
      <span className="block bg-date py-1.5 text-[13px] font-bold tracking-[0.08em] text-date-ink">DEC</span>
      <span className="mt-1 block text-[44px] leading-[1.1] font-semibold tracking-[-0.03em]">11</span>
      <span className="block pb-2.5 text-[12px] font-semibold text-soft">Friday</span>
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

function Key({ fresh = false, children }: { fresh?: boolean; children: ReactNode }) {
  return (
    <span className="value-chip" data-proposal={fresh ? "true" : undefined}>
      {children}
    </span>
  );
}

function Row({ label, value, fresh = false }: { label: string; value: string; fresh?: boolean }) {
  return (
    <span className="flex items-center justify-between border-t border-line py-2 first:border-t-0">
      <span>{label}</span>
      <Key fresh={fresh}>{value}</Key>
    </span>
  );
}
