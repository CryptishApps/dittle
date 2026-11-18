import type { KeyboardEvent, ReactNode } from "react";
import { ease } from "@/ui/kit";

export const PRIMARY = "inline-flex h-11 items-center gap-2.5 rounded-xl bg-ink px-4.5 text-[15px] font-semibold text-page transition-opacity hover:opacity-90 disabled:opacity-40";
export const enter = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 }, transition: { duration: 0.22, ease } };

export const isEnter = (event: KeyboardEvent) => event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing;

export function Heading({ eyebrow, title, sub }: { eyebrow: ReactNode; title: string; sub?: string }) {
  return (
    <>
      <p className="flex items-center gap-1.5 text-[13.5px] text-faint">{eyebrow}</p>
      <h1 className="mt-2 text-[34px] leading-[1.1] font-semibold tracking-[-0.03em] text-ink sm:text-[40px]">{title}</h1>
      {sub && <p className="mt-2.5 text-[16px] leading-[1.55] text-soft">{sub}</p>}
    </>
  );
}
