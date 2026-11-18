import { useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";

export const VALUE = "rounded-[5px] bg-accent-tint px-1 py-px font-medium text-accent-ink";
export const FRAME = "welcome-float rounded-2xl bg-page";
export const PRIMARY = "welcome-cta inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-[var(--brand-blue)] px-[18px] text-[15px] font-semibold whitespace-nowrap text-white hover:bg-[#1a52d6]";
export const SECONDARY = "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[10px] border border-line-strong bg-page/70 px-[18px] text-[15px] font-semibold whitespace-nowrap text-ink backdrop-blur transition-colors hover:border-ink";

export function useLoop(durations: number[]): { ref: RefObject<HTMLDivElement | null>; step: number; still: boolean } {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-15% 0px" });
  const still = useReducedMotion() ?? false;
  const [step, setStep] = useState(0);
  const last = durations.length - 1;
  useEffect(() => {
    if (still || !inView) return;
    const timer = window.setTimeout(() => setStep((current) => (current >= last ? 0 : current + 1)), durations[step] ?? 2000);
    return () => window.clearTimeout(timer);
  }, [still, inView, step, last, durations]);
  return { ref, step: still ? last : step, still };
}

export function useReplay(): { replay: number; again: () => void } {
  const [replay, setReplay] = useState(0);
  return { replay, again: () => setReplay((count) => count + 1) };
}

const DIGITS = "0123456789";
const CELLS = [...DIGITS, ...DIGITS];

export function Roll({ from, to, on, className = "" }: { from: string; to: string; on: boolean; className?: string }) {
  return on ? <Reels key={`${from}-${to}`} from={from} to={to} className={className} /> : <span className={`tabular-nums ${className}`}>{from}</span>;
}

function Reels({ from, to, className }: { from: string; to: string; className: string }) {
  const [rolled, setRolled] = useState(false);
  useEffect(() => {
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setRolled(true));
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  const before = [...from];
  const shift = before.length - to.length;
  let reel = 0;
  return (
    <span className={`t-reel ${className}`} style={{ "--reel-cell": "1.25em", "--reel-dur": "1100ms" } as CSSProperties}>
      <span className="sr-only">{to}</span>
      {[...to].map((char, index) => {
        const digit = DIGITS.indexOf(char);
        if (digit < 0) {
          return (
            <span key={index} aria-hidden className="t-reel-digit">
              {char === " " ? "\u00a0" : char}
            </span>
          );
        }
        const old = Math.max(DIGITS.indexOf(before[index + shift] ?? ""), 0);
        const target = old === digit ? digit : DIGITS.length + digit;
        const position = reel;
        reel += 1;
        return (
          <span key={index} aria-hidden className="t-reel-col">
            <span
              className="t-reel-strip"
              style={{
                transform: `translateY(calc(var(--reel-cell) * ${-(rolled ? target : old)}))`,
                transition: rolled ? `transform var(--reel-dur) var(--reel-ease) calc(var(--reel-stagger) * ${position})` : "none",
              }}
            >
              {CELLS.map((cell, cellIndex) => (
                <span key={cellIndex} className="t-reel-digit">
                  {cell}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}

export function Browser({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`welcome-frame overflow-hidden rounded-[14px] bg-page ${className}`}>
      <div className="flex h-8 items-center gap-3 border-b border-line bg-panel px-3 sm:h-9 sm:px-3.5">
        <span className="flex gap-1.5" aria-hidden>
          <i className="size-2.5 rounded-full bg-[var(--mark-ink)]" />
          <i className="size-2.5 rounded-full bg-[var(--brand-blue)]" />
          <i className="size-2.5 rounded-full bg-[var(--brand-yellow)]" />
        </span>
        <span className="mx-auto flex h-5 min-w-0 items-center gap-1.5 rounded-md bg-page px-3 text-[11.5px] text-faint sm:h-6 sm:min-w-[220px] sm:justify-center sm:text-[12.5px]">
          <Icon name="lock" className="size-3" />
          dittle.app
        </span>
        <span className="w-[42px]" aria-hidden />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

const TONES = {
  sky: "bg-[var(--sky-strong)] text-[var(--sky-ink)]",
  sun: "bg-[var(--sun-strong)] text-[var(--sun-ink)]",
} as const;

export function Eyebrow({ tone, icon, children }: { tone: keyof typeof TONES; icon: IconName; children: ReactNode }) {
  return (
    <p className={`mb-5 inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ${TONES[tone]}`}>
      <Icon name={icon} className="size-[15px]" />
      {children}
    </p>
  );
}

type IconName = "note" | "table" | "home" | "sync" | "spark" | "chip" | "mic" | "image" | "chat" | "type" | "lock" | "offline" | "code" | "run" | "meal" | "plane" | "ring" | "book" | "receipt" | "plant" | "box" | "plus" | "arrow" | "dumbbell";

const PATHS: Record<IconName, ReactNode> = {
  note: <path d="M6 3.5h6l3 3V16a.5.5 0 0 1-.5.5h-8.5a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5ZM8 9.5h5M8 12.5h5" />,
  table: <path d="M3.5 4.5h13v11h-13zM3.5 8.5h13M3.5 12h13M8.5 8.5v7" />,
  home: <path d="M3.5 9.5 10 4l6.5 5.5V16a.5.5 0 0 1-.5.5h-4v-4.5H8v4.5H4a.5.5 0 0 1-.5-.5z" />,
  sync: <path d="M15.5 8A6 6 0 0 0 4.8 6.5M4.5 12a6 6 0 0 0 10.7 1.5M15.5 4v4h-4M4.5 16v-4h4" />,
  mic: <path d="M10 3a2.5 2.5 0 0 1 2.5 2.5v4a2.5 2.5 0 0 1-5 0v-4A2.5 2.5 0 0 1 10 3ZM5 9.5a5 5 0 0 0 10 0M10 14.5V17" />,
  image: <path d="M3.5 4.5h13v11h-13zM3.5 13l4-4 3.5 3.5 2-2 3.5 3.5M12.5 8a1 1 0 1 0 0-.01" />,
  chat: <path d="M4 4.5h12v8.5H8l-4 3z" />,
  type: <path d="M4 5.5h12M10 5.5v10M7.5 15.5h5" />,
  lock: <path d="M5 9h10v7.5H5zM7 9V6.5a3 3 0 0 1 6 0V9" />,
  offline: <path d="M3 3l14 14M6.5 7a4 4 0 0 0-1 7.5h9M9 5.5a5 5 0 0 1 6 4 3 3 0 0 1 2 3.5" />,
  code: <path d="m7 6-4 4 4 4M13 6l4 4-4 4" />,
  run: <path d="M12 4.5a1 1 0 1 0 0-.01M8 17l2.5-4.5L13 14v3M6 9.5l3-2.5 3 1 2 2.5h2.5M10.5 12.5 9 7" />,
  meal: <path d="M6 3v5.5a2 2 0 0 0 4 0V3M8 3v14M14 3c-1.5 1-2 3-2 5.5h2V17" />,
  plane: <path d="M10 3.5c.8 0 1.2.8 1.2 2V8l5.3 3v1.5l-5.3-1.5v3.5l1.8 1.5v1l-3-1-3 1v-1L8.8 14.5V11l-5.3 1.5V11l5.3-3V5.5c0-1.2.4-2 1.2-2Z" />,
  ring: <path d="M10 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM8 7.5 7 4.5h6l-1 3" />,
  book: <path d="M4 4.5h4.5A1.5 1.5 0 0 1 10 6v10a1.5 1.5 0 0 0-1.5-1.5H4zM16 4.5h-4.5A1.5 1.5 0 0 0 10 6v10a1.5 1.5 0 0 1 1.5-1.5H16z" />,
  receipt: <path d="M5 3.5h10v13l-2-1.2-1.7 1.2-1.3-1.2-1.3 1.2L7 15.3l-2 1.2zM7.5 7.5h5M7.5 10.5h5" />,
  plant: <path d="M10 17v-6M10 11c0-3 2-5 5.5-5 0 3-2 5-5.5 5ZM10 13c0-2.5-1.7-4-4.5-4 0 2.5 1.7 4 4.5 4ZM6.5 17h7" />,
  box: <path d="M3.5 6.5 10 3.5l6.5 3v7L10 16.5l-6.5-3zM3.5 6.5 10 9.5l6.5-3M10 9.5v7" />,
  plus: <path d="M10 4v12M4 10h12" />,
  arrow: <path d="M4 10h12M11.5 5.5 16 10l-4.5 4.5" />,
  dumbbell: <path d="M3 8v4M5.5 6v8M14.5 6v8M17 8v4M5.5 10h9" />,
  spark: <path d="M10 3.5c.4 3.3 1.7 4.6 5 5-3.3.4-4.6 1.7-5 5-.4-3.3-1.7-4.6-5-5 3.3-.4 4.6-1.7 5-5ZM15.5 13.5c.2 1.3.7 1.8 2 2-1.3.2-1.8.7-2 2-.2-1.3-.7-1.8-2-2 1.3-.2 1.8-.7 2-2Z" />,
  chip: <path d="M6 6h8v8H6zM8.5 3.5V6M11.5 3.5V6M8.5 14v2.5M11.5 14v2.5M3.5 8.5H6M3.5 11.5H6M14 8.5h2.5M14 11.5h2.5" />,
};

export function Icon({ name, className = "size-[18px]" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`shrink-0 ${className}`}>
      {PATHS[name]}
    </svg>
  );
}

export type { IconName };
