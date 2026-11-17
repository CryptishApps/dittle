import Lenis from "lenis";
import { AnimatePresence, m, useInView, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ease } from "../../ui/kit";

export function useSmoothScroll() {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const lenis = new Lenis({ lerp: 0.09, anchors: true });
    let frame = requestAnimationFrame(function loop(time) {
      lenis.raf(time);
      frame = requestAnimationFrame(loop);
    });
    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [reduce]);
}

export function Rise({ delay = 0, children, className }: { delay?: number; children: ReactNode; className?: string }) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.8, delay, ease }}
    >
      {children}
    </m.div>
  );
}

export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ duration: 0.7, delay, ease }}
    >
      {children}
    </m.div>
  );
}

export function TiltedShot({ children, floating }: { children: ReactNode; floating?: (progress: MotionValue<number>) => ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.1"] });
  const rotateX = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [24, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [0.86, 1]);
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [50, 0]);
  return (
    <div ref={ref} className="relative [perspective:1800px]">
      <m.div style={{ rotateX, scale, y, transformOrigin: "50% 0%" }} className="relative">
        {children}
      </m.div>
      {floating?.(scrollYProgress)}
    </div>
  );
}

export function Floating({ progress, distance, className, children }: { progress: MotionValue<number>; distance: number; className: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  const y = useTransform(progress, [0, 1], reduce ? [0, 0] : [distance, 0]);
  const opacity = useTransform(progress, [0.35, 0.8], reduce ? [1, 1] : [0, 1]);
  return (
    <m.div style={{ y, opacity }} className={`absolute ${className}`}>
      {children}
    </m.div>
  );
}

type Unit = { text: string; token: boolean; trail: string };

function units(text: string): Unit[] {
  const list: Unit[] = [];
  for (const chunk of text.split(/(\[[^\]]+\])/)) {
    if (chunk.startsWith("[")) {
      list.push({ text: chunk.slice(1, -1), token: true, trail: "" });
      continue;
    }
    const words = chunk.split(" ");
    const last = list[list.length - 1];
    if (last?.token && words[0]) last.trail = words.shift()!;
    for (const word of words.filter(Boolean)) list.push({ text: word, token: false, trail: "" });
  }
  return list;
}

export function ScrollWords({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });
  const list = units(text);
  return (
    <p ref={ref} className="font-heading text-[30px] leading-[1.22] font-semibold tracking-[-0.03em] sm:text-[50px]">
      {list.map((unit, index) => (
        <Word key={index} progress={scrollYProgress} from={index / list.length} to={(index + 1) / list.length} unit={unit} />
      ))}
    </p>
  );
}

function Word({ progress, from, to, unit }: { progress: MotionValue<number>; from: number; to: number; unit: Unit }) {
  const reduce = useReducedMotion();
  const opacity = useTransform(progress, [from, to], reduce ? [1, 1] : [0.5, 1]);
  const [reached, setReached] = useState(false);
  useEffect(() => progress.on("change", (value) => setReached(value >= to)), [progress, to]);
  return (
    <>
      <m.span style={{ opacity }}>
        {unit.token ? (
          <span className="whitespace-nowrap">
            <span className="token" data-found={reached || reduce ? "true" : "false"}>
              {unit.text}
            </span>
            {unit.trail}
          </span>
        ) : (
          unit.text
        )}
      </m.span>{" "}
    </>
  );
}

export type Step = { key: string; label: string; title: string; body: string; visual: ReactNode };

export function StickySteps({ steps }: { steps: Step[] }) {
  const [active, setActive] = useState(0);
  const current = steps[active]!;
  return (
    <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
      <div>
        {steps.map((step, index) => (
          <StepText key={step.key} step={step} index={index} total={steps.length} onActive={() => setActive(index)} active={index === active} />
        ))}
      </div>
      <div className="hidden lg:block">
        <div className="sticky top-[14vh] flex h-[72vh] flex-col justify-center">
          <div className="mb-3.5 flex items-center justify-between px-1.5 text-[14px] font-medium text-faint">
            <span>{current.label}</span>
            <span className="flex gap-1.5">
              {steps.map((step, index) => (
                <span key={step.key} className={`h-1.5 rounded-full transition-all duration-500 ${index === active ? "w-7 bg-sticky" : index < active ? "w-3 bg-accent" : "w-3 bg-line-strong"}`} />
              ))}
            </span>
          </div>
          <div className="rounded-[22px] border border-line bg-card p-2 shadow-pop">
          <div className="relative aspect-[16/11] overflow-hidden rounded-[14px] bg-card">
            <AnimatePresence mode="popLayout" initial={false}>
              <m.div
                key={current.key}
                className="absolute inset-0 overflow-hidden"
                initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -20, filter: "blur(6px)" }}
                transition={{ duration: 0.55, ease }}
              >
                {current.visual}
              </m.div>
            </AnimatePresence>
          </div>
          </div>
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
    <div ref={ref} className="flex min-h-[72vh] flex-col justify-center py-10 lg:py-0">
      <div className={active ? "" : "lg:[&_h3]:text-faint lg:[&_p]:text-faint lg:[&_span]:text-faint"}>
        <p className="flex items-center gap-3 text-[14px] font-medium text-faint">
          <span className="inline-flex h-7 items-center rounded-full bg-accent-tint px-3 font-semibold text-accent-ink tabular-nums transition-colors duration-500">
            {index + 1} of {total}
          </span>
          {step.label}
        </p>
        <h3 className="mt-5 font-heading text-[34px] leading-[1.04] font-semibold tracking-[-0.045em] transition-colors duration-500 sm:text-[48px]">{step.title}</h3>
        <p className="mt-5 max-w-[42ch] text-[16.5px] leading-[1.7] text-soft transition-colors duration-500">{step.body}</p>
        <div className="mt-8 rounded-[22px] border border-line bg-card p-2 lg:hidden">
          <div className="relative aspect-[16/11] overflow-hidden rounded-[14px] bg-card">{step.visual}</div>
        </div>
      </div>
    </div>
  );
}
