import Lenis from "lenis";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Mark } from "../../ui/Mark";

export function useSmoothScroll() {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const lenis = new Lenis({ lerp: 0.09 });
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

export function Shot({ name, alt, theme }: { name: string; alt: string; theme?: "light" | "dark" }) {
  if (theme) {
    return <img src={`/shots/${name}-${theme}.png`} alt={alt} className="block h-auto w-full" />;
  }
  return (
    <picture>
      <source srcSet={`/shots/${name}-dark.png`} media="(prefers-color-scheme: dark)" />
      <img src={`/shots/${name}-light.png`} alt={alt} className="block h-auto w-full" />
    </picture>
  );
}

const ease = [0.22, 1, 0.36, 1] as const;

export function Rise({ delay = 0, children, className }: { delay?: number; children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.8, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

export function TiltedShot({ children, floating }: { children: ReactNode; floating?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.12"] });
  const rotateX = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [26, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [0.84, 1]);
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [60, 0]);
  return (
    <div ref={ref} className="relative [perspective:1800px]">
      <motion.div style={{ rotateX, scale, y, transformOrigin: "50% 0%" }} className="relative">
        {children}
      </motion.div>
      {floating}
    </div>
  );
}

export function Floating({
  progress,
  distance,
  className,
  children,
}: {
  progress: MotionValue<number>;
  distance: number;
  className: string;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const y = useTransform(progress, [0, 1], reduce ? [0, 0] : [0, -distance]);
  return (
    <motion.div style={{ y }} className={`absolute ${className}`}>
      {children}
    </motion.div>
  );
}

export function ScrollWords({ text, marked }: { text: string; marked: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });
  const [before = "", after = ""] = text.split(marked);
  const tokens = [
    ...before.trim().split(" ").map((word) => ({ word, marked: false })),
    { word: marked, marked: true },
    ...after.trim().split(" ").filter(Boolean).map((word) => ({ word, marked: false })),
  ];
  return (
    <p ref={ref} className="text-[32px] leading-[1.18] font-extrabold tracking-[-0.035em] sm:text-[52px]">
      {tokens.map((token, index) => {
        const from = index / tokens.length;
        const to = (index + 1) / tokens.length;
        return (
          <Word key={index} progress={scrollYProgress} from={from} to={to}>
            {token.marked ? (
              <MarkWhenReached progress={scrollYProgress} at={to}>
                {token.word}
              </MarkWhenReached>
            ) : (
              token.word
            )}
          </Word>
        );
      })}
    </p>
  );
}

function Word({ progress, from, to, children }: { progress: MotionValue<number>; from: number; to: number; children: ReactNode }) {
  const reduce = useReducedMotion();
  const opacity = useTransform(progress, [from, to], reduce ? [1, 1] : [0.14, 1]);
  return (
    <>
      <motion.span style={{ opacity }}>{children}</motion.span>{" "}
    </>
  );
}

function MarkWhenReached({ progress, at, children }: { progress: MotionValue<number>; at: number; children: ReactNode }) {
  const [reached, setReached] = useState(false);
  useEffect(() => progress.on("change", (value) => setReached(value >= at)), [progress, at]);
  return reached ? <Mark swipe>{children}</Mark> : <span className="px-[0.12em]">{children}</span>;
}

export type Step = { shot: string; alt: string; tag: ReactNode; title: string; body: string };

export function StickySteps({ steps }: { steps: Step[] }) {
  const [active, setActive] = useState(0);
  const current = steps[active]!;
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
      <div>
        {steps.map((step, index) => (
          <StepText key={step.shot} step={step} onActive={() => setActive(index)} active={index === active} />
        ))}
      </div>
      <div className="hidden lg:block">
        <div className="sticky top-[14vh] flex h-[72vh] items-center justify-center">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={current.shot}
              className="w-full max-w-[600px]"
              initial={{ opacity: 0, y: 40, scale: 0.96, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -30, scale: 0.98, filter: "blur(6px)" }}
              transition={{ duration: 0.6, ease }}
            >
              <Shot name={current.shot} alt={current.alt} theme="dark" />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function StepText({ step, onActive, active }: { step: Step; onActive: () => void; active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-45% 0px -45% 0px" });
  useEffect(() => {
    if (inView) onActive();
  }, [inView, onActive]);
  return (
    <div ref={ref} className="flex min-h-[72vh] flex-col justify-center py-10 lg:py-0">
      <div className={`transition-opacity duration-500 ${active ? "opacity-100" : "lg:opacity-30"}`}>
        {step.tag}
        <h3 className="mt-5 text-[36px] leading-[1.05] font-extrabold tracking-[-0.04em] sm:text-[52px]">{step.title}</h3>
        <p className="mt-4 max-w-[38ch] text-[18px] leading-relaxed text-white/60">{step.body}</p>
        <div className="mt-8 lg:hidden">
          <Shot name={step.shot} alt={step.alt} theme="dark" />
        </div>
      </div>
    </div>
  );
}
