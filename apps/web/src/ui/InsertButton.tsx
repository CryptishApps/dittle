import { useState } from "react";
import { SourceTag } from "./InferenceMeter";

export function InsertButton({
  label,
  preview,
  onInsert,
  peek = false,
}: {
  label: string;
  preview: string[];
  onInsert: () => void;
  peek?: boolean;
}) {
  const [hovering, setHovering] = useState(false);
  const open = peek || hovering;
  return (
    <>
      <button
        type="button"
        onClick={onInsert}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onFocus={() => setHovering(true)}
        onBlur={() => setHovering(false)}
        className="ml-2 inline-flex -translate-y-px items-center gap-1 rounded-full bg-accent px-3 py-0.5 align-middle text-[13px] font-semibold text-accent-ink not-italic transition hover:brightness-105"
      >
        <span aria-hidden>+</span> {label}
      </button>
      <span
        aria-hidden={!open}
        className={`mt-3 block overflow-hidden rounded-xl border border-rule bg-paper not-italic transition-[opacity,max-height,filter] duration-300 ease-out ${
          open ? "max-h-96 opacity-100 blur-0" : "max-h-0 border-transparent opacity-0 blur-[2px]"
        }`}
      >
        <span className="flex items-center justify-between gap-2 border-b border-rule px-4 py-2 text-[12px] text-ink-faint">
          Preview
          <SourceTag source="device" />
        </span>
        <span className="block px-4 py-3">
          {preview.map((line) => (
            <span key={line} className="flex gap-2 text-ink-soft">
              <span aria-hidden className="text-ink-faint">•</span>
              {line}
            </span>
          ))}
        </span>
      </span>
    </>
  );
}
