import { AnimatePresence, m, useInView } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ease } from "../../ui/kit";
import { Browser } from "./quiet";

export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.6, delay, ease }}
    >
      {children}
    </m.div>
  );
}

export type Step = { key: string; label: string; title: string; body: string; visual: ReactNode };

export function StickySteps({ steps }: { steps: Step[] }) {
  const [active, setActive] = useState(0);
  const current = steps[active]!;
  return (
    <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
      <div>
        {steps.map((step, index) => (
          <StepText key={step.key} step={step} index={index} total={steps.length} onActive={() => setActive(index)} active={index === active} />
        ))}
      </div>
      <div className="hidden lg:block">
        <div className="sticky top-[14vh] flex h-[72vh] flex-col justify-center">
          <div className="mb-3 flex items-center justify-between px-1 text-[13px] text-faint">
            <span className="font-semibold text-[var(--sky-ink)]">{current.label}</span>
            <span className="flex gap-1.5">
              {steps.map((step, index) => (
                <span key={step.key} className={`h-1.5 rounded-full transition-all duration-500 ${index === active ? "w-[18px] bg-[var(--brand-blue)]" : "w-1.5 bg-line-strong"}`} />
              ))}
            </span>
          </div>
          <Browser>
            <div className="relative aspect-[16/11] overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <m.div
                key={current.key}
                className="absolute inset-0 overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease }}
              >
                {current.visual}
              </m.div>
            </AnimatePresence>
            </div>
          </Browser>
        </div>
      </div>
    </div>
  );
}

function StepText({ step, index, total, onActive, active }: { step: Step; index: number; total: number; onActive: () => void; active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-45% 0px -45% 0px" });
  useEffect(() => {
    if (inView) onActive();
  }, [inView, onActive]);
  return (
    <div ref={ref} className="flex flex-col justify-center py-8 lg:min-h-[72vh] lg:py-0">
      <div className={active ? "" : "lg:[&_h3]:text-faint lg:[&_p]:text-faint"}>
        <p className="text-[13px] text-faint tabular-nums">
          <span aria-hidden className="mr-2 inline-grid size-6 place-items-center rounded-full bg-[var(--brand-blue)] text-[12px] font-semibold text-white">{index + 1}</span>
          <span className="sr-only">
            Step {index + 1} of {total}.{" "}
          </span>
          {step.label}
        </p>
        <h3 className="mt-3 transition-colors duration-500 text-[26px] leading-[1.15] font-semibold tracking-[-0.03em] sm:text-[32px]">{step.title}</h3>
        <p className="mt-3 max-w-[44ch] text-[16px] leading-[1.7] text-soft">{step.body}</p>
        <Browser className="mt-6 lg:hidden">
          <div className="relative aspect-[16/11] overflow-hidden">{step.visual}</div>
        </Browser>
      </div>
    </div>
  );
}
