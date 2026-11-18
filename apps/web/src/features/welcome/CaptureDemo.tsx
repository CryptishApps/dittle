import { AnimatePresence, m } from "motion/react";
import type { ReactNode } from "react";
import { FRAME, Icon, VALUE, useLoop, type IconName } from "./quiet";

const STEPS = [1000, 2200, 2200, 5200];

type Receipt = { icon: IconName; tone: string; input: string; says: ReactNode };

const RECEIPTS: Receipt[] = [
  {
    icon: "type",
    tone: "bg-[var(--sky-strong)] text-[var(--sky-ink)]",
    input: "“ran 6k by the canal, 31 mins”",
    says: (
      <>
        Filed in <b className="font-semibold text-ink">Runs</b> · <span className={VALUE}>6 km</span> · <span className={VALUE}>31:00</span> · pace 5:10 /km
      </>
    ),
  },
  {
    icon: "image",
    tone: "bg-[var(--sun-strong)] text-[var(--sun-ink)]",
    input: "Screenshot of a booking",
    says: (
      <>
        Updated <b className="font-semibold text-ink">Lisbon</b> · flights <span className="line-through">£118</span> <span className={VALUE}>£140</span> each
      </>
    ),
  },
  {
    icon: "mic",
    tone: "bg-[var(--brand-blue)] text-white",
    input: "“Mum’s birthday is 3 December, the blue scarf, about £45”",
    says: (
      <>
        New note <b className="font-semibold text-ink">Mum’s birthday</b> · in Coming up, 15 days away
      </>
    ),
  },
];

const WAYS: { icon: IconName; label: string }[] = [
  { icon: "type", label: "Type" },
  { icon: "chat", label: "Paste a chat" },
  { icon: "image", label: "Drop a screenshot" },
  { icon: "mic", label: "Talk" },
];

export function CaptureDemo() {
  const { ref, step } = useLoop(STEPS);
  const shown = RECEIPTS.slice(0, step);
  return (
    <div ref={ref} className={`${FRAME} p-4 sm:p-6`} role="img" aria-label="One box takes typing, a pasted chat, a screenshot or your voice. Three receipts appear: a run filed in Runs, flight prices updated from a booking screenshot, and a new birthday note from a voice memo. Each has an Undo.">
      <div className="flex h-12 items-center gap-3 rounded-xl border border-[var(--accent-line)] px-4 text-[15.5px] text-faint shadow-[0_0_0_4px_var(--sky)]">
        <span className="flex-1 truncate">New note, or jot something down</span>
        <Icon name="mic" className="size-[18px]" />
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-faint">
        {WAYS.map((way) => (
          <li key={way.label} className="flex items-center gap-1.5">
            <Icon name={way.icon} className="size-3.5" />
            {way.label}
          </li>
        ))}
      </ul>
      <p className="mt-6 text-[13px] font-semibold text-faint">Just now</p>
      <ul className="mt-1 min-h-[246px] sm:min-h-[222px]">
        <AnimatePresence initial={false}>
          {shown.map((receipt) => (
            <m.li
              key={receipt.input}
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.25 } }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="flex items-start gap-3.5 border-b border-line py-3 last:border-b-0"
            >
              <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg ${receipt.tone}`}>
                <Icon name={receipt.icon} className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] leading-snug">{receipt.input}</p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-soft">{receipt.says}</p>
              </div>
              <span className="mt-0.5 text-[13.5px] font-semibold text-[var(--sky-ink)]">Undo</span>
            </m.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
