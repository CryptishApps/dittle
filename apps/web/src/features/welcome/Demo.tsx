import { useInView } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Reprint } from "../../ui/Reprint";
import { MIcon } from "../../ui/kit";

const TODAY_SECONDS = 27 * 60 + 40;
const EARLIER = [
  { day: "Sat", km: 8, seconds: 46 * 60 + 10 },
  { day: "Wed", km: 6, seconds: 33 * 60 + 5 },
];
const START_KM = 5;
const STEP = 0.5;
const MIN_KM = 1;
const MAX_KM = 42;

const km = (value: number) => `${Number.isInteger(value) ? value : value.toFixed(1)} km`;
const clock = (seconds: number) => {
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
};
const pace = (seconds: number, distance: number) => clock(seconds / distance);

export function Demo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20% 0px" });
  const [found, setFound] = useState(false);
  const [distance, setDistance] = useState(START_KM);

  useEffect(() => {
    if (!inView) return;
    const timer = window.setTimeout(() => setFound(true), 500);
    return () => window.clearTimeout(timer);
  }, [inView]);

  const edit = (next: number) => {
    const rounded = Math.round(next / STEP) * STEP;
    if (rounded >= MIN_KM && rounded <= MAX_KM) setDistance(rounded);
  };

  const totalKm = distance + EARLIER.reduce((sum, run) => sum + run.km, 0);
  const totalSeconds = TODAY_SECONDS + EARLIER.reduce((sum, run) => sum + run.seconds, 0);
  const changed = distance !== START_KM;

  return (
    <div ref={ref} className="grid overflow-hidden rounded-[24px] bg-card shadow-sheet lg:grid-cols-[1fr_1.15fr]">
      <div className="min-w-0 border-b border-line lg:border-r lg:border-b-0">
        <Bar icon="file" left="Morning run" right={found ? "2 values · on device" : "Reading"} />
        <div className="px-6 pt-3 pb-8 sm:px-9 sm:pb-10">
          <p className="text-[19px] leading-[1.95]">
            Ran{" "}
            <span
              role="textbox"
              aria-label="Distance in kilometres"
              contentEditable
              suppressContentEditableWarning
              spellCheck={false}
              key={distance}
              className="token"
              data-found={found}
              data-state={changed ? "changed" : "idle"}
              onBlur={(event) => {
                const next = Number(event.currentTarget.textContent?.trim());
                if (Number.isFinite(next)) edit(next);
                event.currentTarget.textContent = String(distance);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
              }}
            >
              {distance}
            </span>{" "}
            km along the river today in{" "}
            <span className="token" data-found={found} style={{ "--token-delay": "160ms" } as CSSProperties}>
              27:40
            </span>
            . Legs felt fine after Saturday.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3 text-[14px] font-medium text-soft">
            Distance
            <span className="flex items-center rounded-xl bg-panel p-1">
              <button type="button" aria-label="Half a kilometre less" onClick={() => edit(distance - STEP)} className="grid size-8 place-items-center rounded-lg text-[18px] text-ink transition-colors hover:bg-card">
                −
              </button>
              <span className="grid min-w-16 place-items-center px-1 text-[17px] font-semibold text-ink tabular-nums">
                <Reprint value={km(distance)} />
              </span>
              <button type="button" aria-label="Half a kilometre more" onClick={() => edit(distance + STEP)} className="grid size-8 place-items-center rounded-lg text-[18px] text-ink transition-colors hover:bg-card">
                +
              </button>
            </span>
            <span className="hidden sm:inline">or click the distance and type</span>
          </div>

          <p className="mt-7 rounded-2xl bg-panel px-5 py-4 text-[14.5px] leading-[1.6] text-soft">
            Dittle read a distance and a time, saw the run was today, and filed both as today's row in Runs. The pace column is worked out by code from the time and the distance, not by the model.
          </p>
        </div>
      </div>

      <div className="min-w-0 bg-page">
        <Bar icon="table" left="Runs" right="One row per day" />
        <div className="px-4 pt-2 pb-6 sm:px-6">
          <div className="overflow-x-auto rounded-2xl shadow-[0_0_0_1px_var(--line)]">
            <table className="w-full text-left text-[15px] whitespace-nowrap">
              <thead className="bg-panel text-[13px] text-faint">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Day</th>
                  <th className="px-4 py-2.5 font-semibold">Distance</th>
                  <th className="px-4 py-2.5 font-semibold">Time</th>
                  <th className="px-4 py-2.5 font-semibold">
                    Pace <span className="font-medium">= time ÷ distance</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                <Run day="Today" distance={km(distance)} time={clock(TODAY_SECONDS)} pace={pace(TODAY_SECONDS, distance)} fresh={changed} />
                {EARLIER.map((run) => (
                  <Run key={run.day} day={run.day} distance={km(run.km)} time={clock(run.seconds)} pace={pace(run.seconds, run.km)} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Total label="This week" value={km(totalKm)} />
            <Total label="Average pace" value={`${pace(totalSeconds, totalKm)} a km`} />
          </div>
          <p className="sr-only" aria-live="polite">
            Runs this week: {km(totalKm)}, average pace {pace(totalSeconds, totalKm)} a kilometre.
          </p>
        </div>
      </div>
    </div>
  );
}

function Run({ day, distance, time, pace: perKm, fresh = false }: { day: string; distance: string; time: string; pace: string; fresh?: boolean }) {
  return (
    <tr className="bg-card">
      <td className={`px-4 py-2.5 ${fresh ? "font-semibold text-ink" : "text-soft"}`}>{day}</td>
      <td className="px-4 py-2.5">
        <span className="value-chip" data-proposal={fresh ? "true" : undefined}>
          <Reprint value={distance} />
        </span>
      </td>
      <td className="px-4 py-2.5">
        <span className="value-chip">{time}</span>
      </td>
      <td className="px-4 py-2.5 text-soft tabular-nums">
        <Reprint value={perKm} />
      </td>
    </tr>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div className="tile px-4 py-3.5">
      <p className="text-[13px] font-semibold text-faint">{label}</p>
      <p className="mt-1 text-[28px] leading-none font-semibold tracking-[-0.04em] tabular-nums">
        <Reprint value={value} />
      </p>
    </div>
  );
}

function Bar({ icon, left, right }: { icon: "file" | "table"; left: string; right: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-2 text-[14px] sm:px-9">
      <span className="flex items-center gap-2 font-semibold">
        <MIcon name={icon} className="size-4 text-accent" />
        {left}
      </span>
      <span className="text-faint">{right}</span>
    </div>
  );
}
