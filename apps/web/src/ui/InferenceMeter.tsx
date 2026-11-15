import { Reprint } from "./Reprint";

export function InferenceMeter({ local, cloud }: { local: number; cloud: number }) {
  return (
    <span className="inline-flex items-center gap-3 text-[13px] font-semibold text-ink-soft tabular-nums">
      <span className="inline-flex items-center gap-1.5" title="AI calls that ran on this device">
        <span aria-hidden className="size-2 rounded-full bg-hl-green ring-1 ring-positive/40" />
        <Reprint value={local.toLocaleString("en-GB")} /> on device
      </span>
      <span className="inline-flex items-center gap-1.5" title="AI calls that ran in the cloud">
        <span aria-hidden className="size-2 rounded-full bg-hl-blue ring-1 ring-ink-faint/40" />
        <Reprint value={cloud.toLocaleString("en-GB")} /> cloud
      </span>
    </span>
  );
}

export function SourceTag({ source }: { source: "device" | "cloud" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] leading-none font-bold text-hl-ink ${
        source === "device" ? "bg-hl-green" : "bg-hl-blue"
      }`}
    >
      {source === "device" ? "On device" : "Cloud"}
    </span>
  );
}
