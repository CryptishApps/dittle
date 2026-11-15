import { Reprint } from "./Reprint";

type VarChipProps = {
  name: string;
  value: string;
  usedIn?: number;
  formula?: string;
};

export function VarChip({ name, value, usedIn, formula }: VarChipProps) {
  return (
    <span className="group/chip relative inline-block rounded-[4px] bg-ditto-wash px-[3px] text-ink">
      <Reprint value={value} />
      <span aria-hidden className="ml-px align-[0.45em] font-mono text-[0.55em] leading-none text-ditto">
        {formula ? "=" : "〃"}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 translate-y-0.5 whitespace-nowrap rounded-md bg-ink px-2 py-1 font-ui text-[11px] leading-tight text-paper opacity-0 transition duration-150 group-hover/chip:translate-y-0 group-hover/chip:opacity-100"
      >
        <span className="font-mono">{name}</span>
        {formula && <span className="opacity-70"> = {formula}</span>}
        {usedIn !== undefined && <span className="opacity-70"> · in {usedIn} notes</span>}
      </span>
    </span>
  );
}
