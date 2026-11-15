import type { ReactNode } from "react";
import type { MarkColor } from "./Mark";

export type Bucket = { name: string; color: MarkColor };

export function BucketPill({ bucket, count, active = false }: { bucket: Bucket; count?: ReactNode; active?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[14px] font-bold whitespace-nowrap transition ${
        active ? "bg-primary text-primary-ink" : "bg-paper-raised text-ink"
      }`}
    >
      <span aria-hidden className="size-2.5 rounded-full" style={{ background: `var(--hl-${bucket.color})` }} />
      {bucket.name}
      {count !== undefined && <span className={active ? "opacity-60" : "text-ink-faint"}>{count}</span>}
    </span>
  );
}

export function BucketTag({ bucket }: { bucket: Bucket }) {
  return (
    <span
      className="inline-flex items-center rounded-lg px-2.5 py-1 text-[12px] leading-none font-bold text-hl-ink"
      style={{ background: `var(--hl-${bucket.color})` }}
    >
      {bucket.name}
    </span>
  );
}
