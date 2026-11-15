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
        className="ml-2 inline-flex -translate-y-px items-center gap-1.5 rounded-full bg-primary px-3.5 py-1 align-middle text-[13px] font-bold text-primary-ink transition active:scale-[0.97]"
      >
        <span aria-hidden className="text-[15px] leading-none">+</span> {label}
      </button>
      <span
        aria-hidden={!open}
        className={`mt-3 block overflow-hidden rounded-2xl bg-paper transition-[opacity,max-height,filter] duration-300 ease-out ${
          open ? "max-h-96 opacity-100 blur-0" : "max-h-0 opacity-0 blur-[2px]"
        }`}
      >
        <span className="flex items-center justify-between gap-2 px-4 pt-3 text-[12px] font-semibold text-ink-faint">
          Preview
          <SourceTag source="device" />
        </span>
        <span className="block px-4 pt-1 pb-3">
          {preview.map((line) => (
            <span key={line} className="flex gap-2.5 text-ink-soft">
              <span aria-hidden className="text-ink-faint">•</span>
              {line}
            </span>
          ))}
        </span>
      </span>
    </>
  );
}
