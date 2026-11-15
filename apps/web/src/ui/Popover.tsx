import { useEffect, useState, type ReactNode } from "react";

type Phase = "open" | "closing" | "closed";

const CLOSE_MS = 150;

export function Popover({
  open,
  origin = "top-left",
  className = "",
  children,
}: {
  open: boolean;
  origin?: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";
  className?: string;
  children: ReactNode;
}) {
  const [phase, setPhase] = useState<Phase>(open ? "open" : "closed");

  useEffect(() => {
    if (open) {
      setPhase("open");
      return;
    }
    setPhase((current) => (current === "open" ? "closing" : current));
    const timer = window.setTimeout(() => setPhase("closed"), CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  const stateClass = phase === "open" ? "is-open" : phase === "closing" ? "is-closing" : "";
  return (
    <div
      data-origin={origin}
      aria-hidden={phase !== "open"}
      inert={phase !== "open"}
      className={`t-dropdown ${stateClass} ${className}`}
    >
      {children}
    </div>
  );
}
