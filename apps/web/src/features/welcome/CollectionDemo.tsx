import { AnimatePresence, m } from "motion/react";
import { ease } from "../../ui/kit";
import { FRAME, Icon, Roll, useLoop } from "./quiet";

const STEPS = [1800, 1800, 6000];

const RUNS = [
  { day: "Tue 3 Nov", km: 5, time: "27:40", pace: "5:32" },
  { day: "Thu 12 Nov", km: 4, time: "22:00", pace: "5:30" },
  { day: "Sun 15 Nov", km: 10, time: "46:08", pace: "4:37" },
];

export function CollectionDemo() {
  const { ref, step } = useLoop(STEPS);
  const rows = RUNS.slice(0, step + 1);
  const total = rows.reduce((sum, run) => sum + run.km, 0);
  const previous = step > 0 ? total - (rows.at(-1)?.km ?? 0) : total;
  return (
    <div ref={ref} className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]" role="img" aria-label="A Runs collection with date, distance, time and a calculated pace column. As runs are added, a tracking card adds up the month to 19 km.">
      <div className={`${FRAME} overflow-hidden p-4 sm:p-6`}>
        <p className="flex items-center gap-2 text-[15px] font-semibold">
          <Icon name="table" className="size-[18px] text-faint" />
          Runs
        </p>
        <table className="mt-4 w-full text-left text-[14.5px] tabular-nums">
          <thead>
            <tr className="border-b border-line text-[12.5px] text-faint">
              <th className="py-2 pr-2 font-semibold">Date</th>
              <th className="px-2 py-2 font-semibold">Distance</th>
              <th className="px-2 py-2 font-semibold">Time</th>
              <th className="py-2 pl-2 font-semibold">
                <span className="inline-flex items-center gap-1">
                  Pace <span className="hidden rounded bg-[var(--sky)] px-1 text-[11.5px] text-[var(--sky-ink)] sm:inline">= time ÷ km</span>
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {rows.map((run) => (
                <m.tr key={run.day} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease }} className="welcome-flash border-b border-line last:border-b-0">
                  <td className="py-2.5 pr-2 whitespace-nowrap">{run.day}</td>
                  <td className="px-2 py-2.5 whitespace-nowrap">{run.km} km</td>
                  <td className="px-2 py-2.5">{run.time}</td>
                  <td className="py-2.5 pl-2 whitespace-nowrap text-soft">{run.pace} /km</td>
                </m.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
      <div className={`${FRAME} p-4 sm:p-5`}>
        <div className="flex items-center justify-between text-[13.5px] text-soft">
          <span>Runs</span>
          <span className="flex h-[18px] items-end gap-[3px]" aria-hidden>
            {RUNS.map((run, index) => (
              <m.i key={run.day} className={`w-[5px] rounded-[1.5px] ${index === rows.length - 1 ? "bg-[var(--brand-blue)]" : "bg-[var(--sky-strong)]"}`} animate={{ height: index < rows.length ? `${(run.km / 10) * 18}px` : "3px" }} transition={{ duration: 0.5, ease }} />
            ))}
          </span>
        </div>
        <p className="mt-1.5 flex items-baseline text-[28px] font-semibold tracking-[-0.03em] tabular-nums">
          <Roll from={`${previous} km`} to={`${total} km`} on={step > 0} />
          <span className="ml-1.5 text-[14px] font-normal tracking-normal text-soft">this month</span>
        </p>
        <p className="mt-3 border-t border-line pt-3 text-[13.5px] leading-relaxed text-soft">Average pace {step === 2 ? "5:03" : step === 1 ? "5:31" : "5:32"} /km, worked out by code from the rows.</p>
      </div>
    </div>
  );
}
