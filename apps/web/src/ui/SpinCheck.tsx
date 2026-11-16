import { useEffect, useRef } from "react";

export function SpinCheck({ done = false, className = "" }: { done?: boolean; className?: string }) {
  const markRef = useRef<SVGPathElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const mark = markRef.current;
    if (mark) badgeRef.current?.style.setProperty("--check-mark-len", String(Math.ceil(mark.getTotalLength())));
  }, []);

  return (
    <span className={`t-check-blur-wrap spin-current ${className}`} aria-hidden>
      <span ref={badgeRef} className="t-check-badge" data-state={done ? "done" : "spinning"}>
        <span className="t-check-ring" />
        <span className="t-check-arc" />
        <span className="t-check-fill" />
        <span className="t-check-disc">
          <svg viewBox="0 0 24 24">
            <path ref={markRef} className="t-check-mark" d="M8 12.5L10.8 15.5L16.4 9.5" />
          </svg>
        </span>
      </span>
    </span>
  );
}
