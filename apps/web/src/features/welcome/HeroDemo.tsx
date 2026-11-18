import { AnimatePresence, m } from "motion/react";
import type { ReactNode } from "react";
import { TypeOn, ease } from "../../ui/kit";
import { FRAME, Icon, VALUE, useLoop, type IconName } from "./quiet";

const STEPS = [1400, 2400, 5200];
const SAID = "Actually Sunday was 10 km, not 8";

export function HeroDemo() {
  const { ref, step, still } = useLoop(STEPS);
  const changed = step === 2;
  return (
    <div ref={ref} className={`${FRAME} p-4 sm:p-6`} role="img" aria-label="A running log where the user types that Sunday was 10 km, not 8. Dittle updates the note, the pace in the Runs collection and the month total, then says it updated 3 places.">
      <p className="flex items-center gap-2 text-[13.5px] text-faint">
        <Icon name="run" className="size-4" />
        Running log
      </p>
      <div className="mt-3 flex h-12 items-center gap-3 rounded-xl border border-line-strong px-4 text-[15.5px]">
        <span className="min-w-0 flex-1 truncate">
          {step === 0 ? <span className="text-faint">Tell Dittle what changed</span> : still ? SAID : <TypeOn text={SAID} duration={1400} />}
        </span>
        <Icon name="arrow" className="size-4 text-faint" />
      </div>
      <div className="mt-5 flex h-5 items-center justify-between text-[13px]">
        <AnimatePresence>
          {changed ? (
            <m.span key="r" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="font-semibold text-faint">
              Updated in 3 places
            </m.span>
          ) : null}
          {changed ? (
            <m.span key="u" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="text-faint">
              Undo
            </m.span>
          ) : null}
        </AnimatePresence>
      </div>
      <ul className="mt-2 divide-y divide-line">
        <Row icon="note" where="Running log">
          <span className="block truncate">
            On Sunday I ran <Swap from="8 km" to="10 km" on={changed} delay={0} inline /> to Battersea Park
          </span>
        </Row>
        <Row icon="table" where="Runs · Sun 15 Nov" label="Pace">
          <Swap from="5:46 /km" to="4:37 /km" on={changed} delay={0.15} />
        </Row>
        <Row icon="home" where="Home · Runs" label="This month">
          <Swap from="17 km" to="19 km" on={changed} delay={0.3} />
        </Row>
      </ul>
    </div>
  );
}

function Row({ icon, where, label, children }: { icon: IconName; where: string; label?: string; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3.5 py-3">
      <Icon name={icon} className="size-[18px] text-faint" />
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] text-faint">{where}</p>
        {label ? <p className="text-[15px]">{label}</p> : <div className="text-[15px]">{children}</div>}
      </div>
      {label ? <div className="text-right text-[15px]">{children}</div> : null}
    </li>
  );
}

function Swap({ from, to, on, delay, inline = false }: { from: string; to: string; on: boolean; delay: number; inline?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap tabular-nums">
      <AnimatePresence initial={false}>
        {on ? (
          <m.span key="old" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, delay }} className="text-faint line-through">
            {from}
          </m.span>
        ) : null}
      </AnimatePresence>
      <m.span
        key={on ? "new" : "base"}
        initial={on ? { opacity: 0, y: 4 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay, ease }}
        className={inline || on ? `${VALUE} ${on && !inline ? "font-semibold" : ""}` : ""}
      >
        {on ? to : from}
      </m.span>
    </span>
  );
}
