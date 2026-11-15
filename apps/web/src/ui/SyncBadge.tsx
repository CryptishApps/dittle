import { useEffect, useRef, useState } from "react";

export type SyncState = "syncing" | "synced" | "local";

const LABEL: Record<SyncState, string> = {
  syncing: "Syncing",
  synced: "Synced",
  local: "Saved on this device",
};

export function SyncBadge({ state }: { state: SyncState }) {
  const markRef = useRef<SVGPathElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const [crossing, setCrossing] = useState(false);

  useEffect(() => {
    const mark = markRef.current;
    const badge = badgeRef.current;
    if (mark && badge) badge.style.setProperty("--check-mark-len", String(Math.ceil(mark.getTotalLength())));
  }, []);

  useEffect(() => {
    setCrossing(true);
    const timer = window.setTimeout(() => setCrossing(false), 160);
    return () => window.clearTimeout(timer);
  }, [state]);

  return (
    <span className="inline-flex items-center gap-2 text-[12px] text-ink-soft" role="status">
      <span className={`t-check-blur-wrap ${crossing ? "is-crossing" : ""} scale-[0.64]`}>
        <span
          ref={badgeRef}
          className="t-check-badge"
          data-state={state === "synced" ? "done" : "spinning"}
          aria-hidden
        >
          <span className="t-check-ring" />
          <span className="t-check-arc" style={state === "local" ? { opacity: 0 } : undefined} />
          <span className="t-check-fill" />
          <span className="t-check-disc">
            <svg viewBox="0 0 24 24">
              <path ref={markRef} className="t-check-mark" d="M8 12.5L10.8 15.5L16.4 9.5" />
            </svg>
          </span>
        </span>
      </span>
      <span className="-ml-1.5">{LABEL[state]}</span>
    </span>
  );
}
