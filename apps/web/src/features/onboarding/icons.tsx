const PATHS = {
  run: "M13.5 4.5a1.5 1.5 0 1 0 0-.01M9 20l2.5-5 2.5 2v4M7 11l3-3.5 3.5 1 2 3 2.5 1M11.5 15l1-6",
  dumbbell: "M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11",
  fork: "M7 3v8a2 2 0 0 0 2 2v8M11 3v8a2 2 0 0 1-2 2M9 3v6M17 21V3c-2 1.5-3 4-3 7s1 3.5 3 3.5",
  plane: "M10.5 20.5 12 15l-6 2.5-1.5-1.5 7-5V5.5a1.5 1.5 0 0 1 3 0V11l7 5-1.5 1.5-6-2.5 1.5 5.5-2.5 1Z",
  heart: "M12 19.5s-7.5-4.6-7.5-10A4 4 0 0 1 12 7.2a4 4 0 0 1 7.5 2.3c0 5.4-7.5 10-7.5 10Z",
  book: "M4 5.5C6.5 4.5 9.5 4.5 12 6.5c2.5-2 5.5-2 8-1v13c-2.5-1-5.5-1-8 1-2.5-2-5.5-2-8-1v-13ZM12 6.5v13",
  receipt: "M6 3.5h12v17l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5v-17ZM9 8h6M9 11.5h6M9 15h4",
  box: "M12 3 20 7v10l-8 4-8-4V7l8-4ZM4 7l8 4 8-4M12 11v10",
  plus: "M12 5v14M5 12h14",
  sparkle: "M12 4.5c.6 3.6 2.9 5.9 6.5 6.5-3.6.6-5.9 2.9-6.5 6.5-.6-3.6-2.9-5.9-6.5-6.5 3.6-.6 5.9-2.9 6.5-6.5Z",
  note: "M7 3.5h7l4 4v13H7a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1ZM14 3.5v4h4M9 12h6M9 15.5h6",
  table: "M4 5h16v14H4V5ZM4 10h16M4 14.5h16M10 10v9",
  home: "M4.5 10.5 12 4l7.5 6.5V20h-5v-5.5h-5V20h-5v-9.5Z",
  enter: "M19 5v6a3 3 0 0 1-3 3H6m3.5-3.5L6 14l3.5 3.5",
  check: "m5 12.5 4.5 4.5L19 7.5",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "size-4" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d={PATHS[name]} />
    </svg>
  );
}
