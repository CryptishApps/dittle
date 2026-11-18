import type { ReactNode } from "react";

export type CaptureIconName = "file" | "update" | "note" | "add" | "arrow" | "close" | "enter" | "pen";

const PATHS: Record<CaptureIconName, ReactNode> = {
  file: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M4 10h16M10 10v9" />
    </>
  ),
  update: <path d="M5 12a7 7 0 0 1 12-4.9L19 9M19 4v5h-5M19 12a7 7 0 0 1-12 4.9L5 15M5 20v-5h5" />,
  note: (
    <>
      <path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5a1.5 1.5 0 0 1 1-1.5Z" />
      <path d="M12 10.5v6M9 13.5h6" />
    </>
  ),
  add: (
    <>
      <path d="M5 6h14M5 11h14M5 16h7" />
      <path d="M17 14v6M14 17h6" />
    </>
  ),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  enter: <path d="M19 5v7a2 2 0 0 1-2 2H6M10 10l-4 4 4 4" />,
  pen: <path d="M4.5 19.5h4l10-10a2.83 2.83 0 0 0-4-4l-10 10v4ZM13 7l4 4" />,
};

export function CaptureIcon({ name, className = "size-4" }: { name: CaptureIconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      {PATHS[name]}
    </svg>
  );
}
