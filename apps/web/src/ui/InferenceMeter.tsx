import { Reprint } from "./Reprint";

export function InferenceMeter({ local, cloud }: { local: number; cloud: number }) {
  return (
    <span className="inline-flex items-center gap-3 text-[12px] text-ink-soft tabular-nums">
      <span className="inline-flex items-center gap-1.5" title="AI calls that ran on this device">
        <span aria-hidden className="size-2 rounded-full bg-accent" />
        <Reprint value={local.toLocaleString("en-GB")} /> on device
      </span>
      <span className="inline-flex items-center gap-1.5" title="AI calls that ran in the cloud">
        <span aria-hidden className="size-2 rounded-full border-[1.5px] border-ink-faint" />
        <Reprint value={cloud.toLocaleString("en-GB")} /> cloud
      </span>
    </span>
  );
}

export function SourceTag({ source }: { source: "device" | "cloud" }) {
  return source === "device" ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-wash px-2 py-0.5 text-[11px] font-medium text-accent-strong">
      <span aria-hidden className="size-1.5 rounded-full bg-accent-strong" />
      On device
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-paper-sunk px-2 py-0.5 text-[11px] font-medium text-ink-soft">
      <span aria-hidden className="size-1.5 rounded-full border-[1.5px] border-ink-soft" />
      Cloud
    </span>
  );
}
