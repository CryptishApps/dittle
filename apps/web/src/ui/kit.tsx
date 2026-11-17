import { useEffect, useState, type ReactNode } from "react";

export const ease = [0.22, 1, 0.36, 1] as const;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function useTypeOn(text: string, duration = 420): number {
  const [settled, setSettled] = useState(() => (reducedMotion() ? text.length : 0));
  useEffect(() => {
    if (reducedMotion()) {
      setSettled(text.length);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setSettled(Math.floor(progress * text.length));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [text, duration]);
  return settled;
}

export function TypeOn({ text, duration }: { text: string; duration?: number }) {
  const settled = useTypeOn(text, duration);
  return (
    <span>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {settled >= text.length ? (
          text
        ) : (
          <>
            {text.slice(0, settled)}
            <span className="opacity-40 blur-[1px]">{text.slice(settled, settled + 2)}</span>
            <span className="opacity-0">{text.slice(settled + 2)}</span>
          </>
        )}
      </span>
    </span>
  );
}

type BtnVariant = "primary" | "secondary" | "quiet" | "danger" | "inverse";
type BtnSize = "sm" | "md" | "lg";

const BTN_VARIANT: Record<BtnVariant, string> = {
  primary: "bg-accent text-on-accent shadow-press hover:bg-accent-ink",
  secondary: "border border-line-strong bg-card text-ink hover:border-ink",
  quiet: "text-soft hover:bg-chip hover:text-ink",
  danger: "bg-danger text-page hover:opacity-90",
  inverse: "bg-ink text-page hover:opacity-90",
};

const BTN_SIZE: Record<BtnSize, string> = {
  sm: "h-8 gap-1.5 rounded-[10px] px-3 text-[13px]",
  md: "h-10 gap-2 rounded-xl px-4 text-[14.5px]",
  lg: "h-13 gap-2 rounded-[14px] px-6 text-[16px]",
};

export function btnClass({ variant = "secondary", size = "md" }: { variant?: BtnVariant; size?: BtnSize } = {}): string {
  return `inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 ${BTN_VARIANT[variant]} ${BTN_SIZE[size]}`;
}

export function Btn({
  children,
  onClick,
  primary,
  variant,
  size = "sm",
  type = "button",
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  primary?: boolean;
  variant?: BtnVariant;
  size?: BtnSize;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${btnClass({ variant: variant ?? (primary ? "primary" : "secondary"), size })} ${className}`}>
      {children}
    </button>
  );
}

export const POPOVER = "rounded-2xl bg-card shadow-pop";

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="inline-flex h-6 items-center rounded-md border border-line-strong border-b-2 bg-card px-2 font-sans text-[12px] text-soft">{children}</kbd>;
}

export type MIconName = "inbox" | "today" | "notes" | "folder" | "file" | "search" | "plus" | "chevron" | "left" | "right" | "close" | "check" | "sidebar" | "chip" | "share" | "equals" | "home" | "table";

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
  home: <path d="M3.5 9.5 10 4l6.5 5.5V16a.5.5 0 0 1-.5.5h-4v-4.5H8v4.5H4a.5.5 0 0 1-.5-.5z" />,
  table: (
    <>
      <rect x="3.5" y="4.5" width="13" height="11" rx="2" />
      <path d="M3.5 8.5h13M8.5 8.5v7" />
    </>
  ),
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
  equals: <path d="M5 7.5h10M5 12.5h10" />,
};

export function MIcon({ name, className = "size-4" }: { name: MIconName; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {PATHS[name]}
    </svg>
  );
}
