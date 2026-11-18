import { AnimatePresence, m } from "motion/react";
import type { ReactNode } from "react";
import { Shot } from "../../ui/Shot";
import { SpinCheck } from "../../ui/SpinCheck";
import { TypeOn, ease } from "../../ui/kit";
import { Browser, Icon, Roll, useLoop } from "./quiet";

const STEPS = [1300, 1900, 1300, 1300, 4600];
const SAID = "Fado’s gone up to €50 each";
const PILL = "rounded-[5px] px-1 py-px font-medium tabular-nums transition-[background-color,box-shadow,color] duration-500";

export function HeroDemo() {
  const { ref, step, still } = useLoop(STEPS);
  const noted = step >= 2;
  const totalled = step >= 3;
  const done = step >= 4;
  return (
    <div
      ref={ref}
      className="relative"
      role="img"
      aria-label="Dittle’s home page in a browser. Someone types that the fado night has gone up to €50 each. The Fado night note changes from €45 to €50, the Things to do total rolls from €95 to €100, and a message says it updated 3 places, with Undo."
    >
      <div className="relative">
        <Browser>
          <div className="aspect-[16/10] overflow-hidden">
            <Shot name="home" alt="" priority sizes="(min-width: 1184px) 1120px, calc(100vw - 32px)" />
          </div>
        </Browser>
        <div className="pointer-events-none absolute right-3 bottom-3 left-3 z-10 flex justify-center sm:right-[-2%] sm:bottom-[-5%] sm:left-auto sm:justify-end">
          <AnimatePresence>
            {noted ? (
              <m.div
                key="toast"
                initial={{ opacity: 0, y: 18, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.25 } }}
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
                className="flex items-center gap-2.5 rounded-full bg-[var(--brand-ink)] py-2 pr-4 pl-2.5 text-[14px] text-white shadow-[0_18px_40px_-14px_rgb(18_20_24/0.6)] ring-1 ring-white/12"
              >
                <span className="grid size-6 place-items-center text-[var(--brand-yellow)] [--spin-mark:var(--brand-ink)]">
                  <SpinCheck done={done || still} />
                </span>
                <span className="font-semibold">{done || still ? "Updated in 3 places" : "Updating"}</span>
                <span className="text-white/60">Undo</span>
              </m.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <Float className="sm:top-[14%] sm:left-[19%] sm:w-[62%]" delay={0.15}>
        <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--sky-ink)]">
          <Icon name="spark" className="size-3.5" />
          Jot it down
        </p>
        <div className="mt-2 flex h-11 items-center gap-2.5 rounded-xl border border-[var(--accent-line)] bg-page px-3.5 text-[15px] shadow-[0_0_0_4px_var(--sky)]">
          <span className="min-w-0 flex-1 truncate">{step === 0 ? <span className="text-faint">New note, or jot something down</span> : still ? SAID : <TypeOn text={SAID} duration={1300} />}</span>
          <Icon name="arrow" className="size-4 text-faint" />
        </div>
      </Float>

      <Float className="sm:top-[44%] sm:right-[-5%] sm:w-[min(360px,42%)]" delay={0.3}>
        <p className="flex items-center gap-1.5 text-[12.5px] text-faint">
          <Icon name="note" className="size-3.5" />
          Fado night
        </p>
        <p className="mt-1.5 text-[15.5px] leading-[1.7]">
          Clube de Fado with dinner,{" "}
          <span className={`${PILL} ${noted ? "bg-[var(--sun-strong)] text-[var(--sun-ink)] shadow-[0_0_0_2px_var(--brand-yellow)]" : "bg-accent-tint text-accent-ink"}`}>
            <Roll from="€45" to="€50" on={noted} />
          </span>{" "}
          each, on <span className={`${PILL} whitespace-nowrap bg-accent-tint text-accent-ink`}>Sat 12 December</span> at 9pm.
        </p>
      </Float>

      <Float className="hidden sm:bottom-[-7%] sm:left-[6%] sm:block sm:w-[min(270px,32%)]" delay={0.45}>
        <div className="flex items-center justify-between text-[13px] text-soft">
          <span className="flex items-center gap-1.5">
            <Icon name="table" className="size-3.5" />
            Things to do
          </span>
          <span className="flex h-4 items-end gap-[3px]" aria-hidden>
            {[18, 32, 45].map((height, index) => (
              <m.i key={height} className={`w-[5px] rounded-[1.5px] ${index === 2 ? "bg-[var(--brand-blue)]" : "bg-[var(--sky-strong)]"}`} animate={{ height: `${((index === 2 && totalled ? 50 : height) / 50) * 16}px` }} transition={{ duration: 0.6, ease }} />
            ))}
          </span>
        </div>
        <p className="mt-1 flex items-baseline gap-1.5 text-[30px] font-semibold tracking-[-0.03em]">
          <Roll from="€95" to="€100" on={totalled} />
          <span className="text-[14px] font-normal tracking-normal text-soft">in total</span>
        </p>
      </Float>
    </div>
  );
}

function Float({ className, delay, children }: { className: string; delay: number; children: ReactNode }) {
  return (
    <m.div
      className={`welcome-float relative mx-3 mt-3 rounded-2xl bg-card p-4 sm:absolute sm:mx-0 sm:mt-0 ${className}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease }}
    >
      {children}
    </m.div>
  );
}
