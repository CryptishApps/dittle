import type { CSSProperties, ReactNode } from "react";

export type MarkColor = "green" | "violet" | "yellow" | "orange" | "blue";

export function Mark({
  color = "green",
  swipe = false,
  delay = 0,
  children,
}: {
  color?: MarkColor;
  swipe?: boolean;
  delay?: number;
  children: ReactNode;
}) {
  return (
    <span
      className={swipe ? "hl hl-swipe" : "hl"}
      style={{ "--hl": `var(--hl-${color})`, "--hl-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </span>
  );
}
