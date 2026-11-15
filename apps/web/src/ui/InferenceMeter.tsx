import { Reprint } from "./Reprint";

export function InferenceMeter({ local, cloud }: { local: number; cloud: number }) {
  return (
    <span className="inline-flex items-center gap-3 font-mono text-[11px] tracking-tight text-ink-soft">
      <span className="inline-flex items-center gap-1.5" title="AI calls that ran on this device">
        <span aria-hidden className="size-1.5 rounded-full bg-ditto" />
        <Reprint value={local.toLocaleString("en-GB")} />
        <span>on device</span>
      </span>
      <span className="inline-flex items-center gap-1.5" title="AI calls that ran in the cloud">
        <span aria-hidden className="size-1.5 rounded-full border border-cloud" />
        <Reprint value={cloud.toLocaleString("en-GB")} />
        <span>cloud</span>
      </span>
    </span>
  );
}

export function SourceTag({ source }: { source: "device" | "cloud" }) {
  return source === "device" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-ditto-wash px-1.5 py-px font-mono text-[10px] text-ditto">
      <span aria-hidden className="size-1 rounded-full bg-ditto" />
      on device
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-cloud-wash px-1.5 py-px font-mono text-[10px] text-cloud">
      <span aria-hidden className="size-1 rounded-full border border-cloud" />
      cloud
    </span>
  );
}
