import { useEffect, useState, type ReactNode } from "react";

export const ease = [0.22, 1, 0.36, 1] as const;

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#_";

export function useScramble(text: string, duration = 420): string {
  const [out, setOut] = useState(text);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOut(text);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const settled = Math.floor(progress * text.length);
      setOut(
        [...text]
          .map((char, index) => (index < settled || char === " " ? char : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
          .join(""),
      );
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [text, duration]);
  return out;
}

export function Scramble({ text, duration }: { text: string; duration?: number }) {
  const shown = useScramble(text, duration);
  return (
    <span aria-label={text}>
      <span aria-hidden>{shown}</span>
    </span>
  );
}

export function Code({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`m-brackets grid size-9 shrink-0 place-items-center text-[12px] font-medium text-(--m-accent-ink) ${className}`}>{children}</span>
  );
}

export function Btn({
  children,
  onClick,
  primary,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  primary?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-7 items-center gap-1.5 border px-2.5 text-[11px] font-medium tracking-[0.02em] uppercase transition-colors ${
        primary
          ? "border-(--m-ink) bg-(--m-ink) text-(--m-page) hover:opacity-90"
          : "border-(--m-line-strong) bg-(--m-card) text-(--m-ink) hover:border-(--m-ink)"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function Path({ parts }: { parts: string[] }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 bg-(--m-chip) px-2 py-1 text-[11px] tracking-[0.02em] text-(--m-soft) uppercase">
      {parts.map((part, index) => (
        <span key={index} className="inline-flex items-center gap-1.5">
          {index > 0 && <span aria-hidden>→</span>}
          {part}
        </span>
      ))}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="grid size-5 place-items-center bg-(--m-chip) text-[10px] text-(--m-soft)">{children}</kbd>;
}

export type MIconName = "inbox" | "today" | "notes" | "folder" | "file" | "search" | "plus" | "chevron" | "left" | "right" | "close" | "check" | "sidebar" | "chip" | "share";

const PATHS: Record<MIconName, ReactNode> = {
  inbox: (
    <>
      <path d="M3 13h4l1 2h4l1-2h4" />
      <path d="M3 13V5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v8v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
    </>
  ),
  today: (
    <>
      <rect x="3.5" y="4.5" width="13" height="12" rx="1" />
      <path d="M3.5 8h13M7 3v3M13 3v3M9 11h1.5v3.5" />
    </>
  ),
  notes: (
    <>
      <rect x="4" y="3.5" width="12" height="13" rx="1" />
      <path d="M7 7.5h6M7 10.5h6M7 13.5h3" />
    </>
  ),
  folder: <path d="M3 6a1 1 0 0 1 1-1h4l1.5 1.5H16a1 1 0 0 1 1 1V15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />,
  file: (
    <>
      <path d="M6 3h5.5L15 6.5V16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M11 3v4h4" />
    </>
  ),
  search: (
    <>
      <circle cx="9" cy="9" r="5" />
      <path d="m13 13 3.5 3.5" />
    </>
  ),
  plus: <path d="M10 4v12M4 10h12" />,
  chevron: <path d="m8 6 4 4-4 4" />,
  left: <path d="m12 5-5 5 5 5" />,
  right: <path d="m8 5 5 5-5 5" />,
  close: <path d="m5 5 10 10M15 5 5 15" />,
  check: <path d="m4.5 10.5 3.5 3.5 7.5-8" />,
  sidebar: (
    <>
      <rect x="3" y="4" width="14" height="12" rx="1" />
      <path d="M8 4v12" />
    </>
  ),
  chip: (
    <>
      <rect x="5.5" y="5.5" width="9" height="9" />
      <path d="M8 3v2.5M12 3v2.5M8 14.5V17M12 14.5V17M3 8h2.5M3 12h2.5M14.5 8H17M14.5 12H17" />
    </>
  ),
  share: <path d="M10 13V3.5M6.5 7 10 3.5 13.5 7M4 11v4.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V11" />,
};

export function MIcon({ name, className = "size-4" }: { name: MIconName; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
      {PATHS[name]}
    </svg>
  );
}
