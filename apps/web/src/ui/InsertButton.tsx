import { useState } from "react";
import { SourceTag } from "./InferenceMeter";

export function InsertButton({
  label,
  preview,
  onInsert,
}: {
  label: string;
  preview: string[];
  onInsert: () => void;
}) {
  const [peeking, setPeeking] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={onInsert}
        onMouseEnter={() => setPeeking(true)}
        onMouseLeave={() => setPeeking(false)}
        onFocus={() => setPeeking(true)}
        onBlur={() => setPeeking(false)}
        className="ml-2 inline-flex translate-y-[-2px] items-center gap-1 rounded-full bg-ditto px-2.5 py-0.5 align-middle font-ui text-[12px] font-medium text-white not-italic shadow-[0_1px_0_rgb(0_0_0/0.08)] transition hover:brightness-110"
      >
        <span aria-hidden>+</span> {label}
      </button>
      <span
        aria-hidden={!peeking}
        className={`mt-2 block overflow-hidden border-l-2 border-dashed border-ditto pl-4 transition-[opacity,max-height,filter] duration-300 ease-out ${
          peeking ? "max-h-80 opacity-100 blur-0" : "max-h-0 opacity-0 blur-[2px]"
        }`}
      >
        <span className="mb-1 flex items-center gap-2 font-ui text-[11px] text-ink-faint not-italic">
          Preview <SourceTag source="device" />
        </span>
        {preview.map((line) => (
          <span key={line} className="block text-ink-soft not-italic opacity-70">
            {line}
          </span>
        ))}
      </span>
    </>
  );
}
