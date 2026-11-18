import { m } from "motion/react";
import { useState, type ReactNode } from "react";
import { Browser, Icon, Roll, useLoop, type IconName } from "@/features/welcome/quiet";
import { ease, TypeOn } from "@/ui/kit";
import { Shot, type Focus } from "@/ui/Shot";
import { SpinCheck } from "@/ui/SpinCheck";

type Phase = 0 | 1 | 2;

type Moment = { key: string; icon: IconName; label: string; title: string; body: string; shot: string; focus: Focus; card: (phase: Phase, still: boolean) => ReactNode };

const MOMENTS: Moment[] = [
  {
    key: "change",
    icon: "sync",
    label: "Change it once",
    title: "Every copy keeps up",
    body: "Change a price in one note and Dittle offers to update every note that uses it. Totals worked out from it follow.",
    shot: "change",
    focus: { x: 21, y: 7, zoom: 1.27 },
    card: (phase, still) => (
      <>
        <CardLabel icon="note">Catering · price per head</CardLabel>
        <p className="mt-1 text-[30px] font-semibold tracking-[-0.03em]">
          <Roll from="£38" to="£42" on={phase >= 1} />
        </p>
        <Status phase={phase} still={still} busy="Updating" done="Updated in 2 notes" />
      </>
    ),
  },
  {
    key: "home",
    icon: "table",
    label: "It adds itself up",
    title: "The whole plan, totalled",
    body: "Collections add themselves up across your notes, and the dates in them count down on your home page.",
    shot: "home",
    focus: { x: 19, y: 6, zoom: 1.45 },
    card: (phase) => (
      <>
        <div className="flex items-center justify-between">
          <CardLabel icon="table">Things to do</CardLabel>
          <span className="flex h-4 items-end gap-[3px]" aria-hidden>
            {[18, 32, 45].map((height, index) => (
              <m.i
                key={height}
                className={`w-[5px] rounded-[1.5px] ${index === 2 ? "bg-[var(--brand-blue)]" : "bg-[var(--sky-strong)]"}`}
                animate={{ height: `${((index === 2 && phase >= 1 ? 50 : height) / 50) * 16}px` }}
                transition={{ duration: 0.6, ease }}
              />
            ))}
          </span>
        </div>
        <p className="mt-1 flex items-baseline gap-1.5 text-[30px] font-semibold tracking-[-0.03em]">
          <Roll from="€95" to="€100" on={phase >= 1} />
          <span className="text-[14px] font-normal tracking-normal text-soft">in total</span>
        </p>
        <p className={`mt-2 text-[13px] text-soft transition-opacity duration-500 ${phase === 2 ? "opacity-100" : "opacity-0"}`}>Fado night went up to €50</p>
      </>
    ),
  },
  {
    key: "hover",
    icon: "chip",
    label: "AI on your device",
    title: "It knows what each value is",
    body: "Where your browser supports it, Gemini Nano runs on your device. It names each value and spots the ones worked out from others.",
    shot: "hover",
    focus: { x: 19, y: 9, zoom: 1.55 },
    card: (phase, still) => (
      <>
        <CardLabel icon="spark">About £3,040</CardLabel>
        <p className="mt-2 min-h-[1.6em] text-[15.5px] leading-[1.6]">
          {phase === 0 ? <span className="text-faint">Working it out</span> : still ? "£38 a head × 80 guests" : <TypeOn text="£38 a head × 80 guests" duration={900} />}
        </p>
        <p
          className={`mt-2.5 inline-flex h-6 items-center gap-1.5 rounded-full bg-[var(--sun-strong)] px-2.5 text-[12.5px] font-semibold text-[var(--sun-ink)] transition-opacity duration-500 ${phase === 2 ? "opacity-100" : "opacity-0"}`}
        >
          <Icon name="spark" className="size-3.5" />
          Named it: catering total
        </p>
      </>
    ),
  },
];

const STEPS = MOMENTS.flatMap(() => [700, 1300, 3600]);

const PEEK_SHOWN = "(min-width: 1024px)";

export function Showcase() {
  const [shown] = useState(() => window.matchMedia(PEEK_SHOWN).matches);
  const { ref, step, still } = useLoop(STEPS);
  const index = still ? 0 : Math.floor(step / 3);
  const phase = (still ? 2 : step % 3) as Phase;
  const moment = MOMENTS[index] ?? MOMENTS[0]!;

  return (
    <aside aria-hidden className="sticky top-3 m-3 hidden h-[calc(100dvh-24px)] min-h-[640px] overflow-hidden rounded-[24px] bg-[var(--sky)] lg:flex">
      <div className="welcome-wash absolute inset-0" />
      <div className="welcome-grid absolute inset-0" />
      <div ref={ref} className="relative mx-auto flex w-full max-w-[680px] flex-col justify-center px-[7%] py-12">
        <div className="flex items-center justify-between">
          <p className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[var(--sky-strong)] px-3 text-[13px] font-semibold text-[var(--sky-ink)]">
            <Icon name={moment.icon} className="size-[15px]" />
            {moment.label}
          </p>
          <span className="flex gap-1.5">
            {MOMENTS.map((item, itemIndex) => (
              <span key={item.key} className={`h-1.5 rounded-full transition-all duration-500 ${itemIndex === index ? "w-[18px] bg-[var(--brand-blue)]" : "w-1.5 bg-line-strong"}`} />
            ))}
          </span>
        </div>

        <div className="mt-5 grid">
          {MOMENTS.map((item, itemIndex) => (
            <div key={item.key} className={`[grid-area:1/1] transition-[opacity,translate] duration-500 motion-reduce:transition-none ${itemIndex === index ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0"}`}>
              <p className="text-[30px] leading-[1.12] font-semibold tracking-[-0.035em] xl:text-[34px]">{item.title}</p>
              <p className="mt-3 max-w-[46ch] text-[16px] leading-[1.65] text-soft">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="relative mt-9 mr-[6%]">
          <Browser>
            <div className="relative aspect-[16/10] overflow-hidden">
              {MOMENTS.map((item, itemIndex) => (
                <div key={item.key} className={`absolute inset-0 overflow-hidden transition-opacity duration-700 motion-reduce:transition-none ${itemIndex === index ? "opacity-100" : "opacity-0"}`}>
                  <Shot name={item.shot} alt="" focus={item.focus} priority={shown && itemIndex === 0} sizes={`${PEEK_SHOWN} ${Math.round(item.focus.zoom * 45)}vw, 1px`} />
                </div>
              ))}
            </div>
          </Browser>
          <m.div
            key={moment.key}
            className="welcome-float absolute right-[-9%] bottom-[-9%] w-[min(290px,54%)] rounded-2xl bg-card p-4"
            initial={still ? false : { opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          >
            {moment.card(phase, still)}
          </m.div>
        </div>
      </div>
    </aside>
  );
}

function CardLabel({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-soft">
      <Icon name={icon} className="size-3.5" />
      {children}
    </p>
  );
}

function Status({ phase, still, busy, done }: { phase: Phase; still: boolean; busy: string; done: string }) {
  const settled = still || phase === 2;
  return (
    <p className={`mt-2.5 inline-flex h-8 items-center gap-2 rounded-full bg-[var(--brand-ink)] py-1 pr-3.5 pl-1.5 text-[13px] text-white transition-opacity duration-300 ${phase === 0 ? "opacity-0" : "opacity-100"}`}>
      <span className="grid size-6 place-items-center text-[var(--brand-yellow)] [--spin-mark:var(--brand-ink)]">
        <SpinCheck done={settled} />
      </span>
      <span className="font-semibold">{settled ? done : busy}</span>
    </p>
  );
}
