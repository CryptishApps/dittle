import { Link } from "@tanstack/react-router";
import { m, useReducedMotion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { NumberRoll } from "@/features/what-if/NumberRoll";
import { ease } from "@/ui/kit";
import type { Collection } from "@/features/notes/fact";
import type { GlanceChart, GlanceView } from "./glance";

const seenFigures = new Map<string, string>();

const zeroed = (figure: string) => [...figure].map((char) => (char >= "0" && char <= "9" ? "0" : char)).join("");

function useRoll(id: string, figure: string) {
  const [roll, setRoll] = useState(() => ({ from: seenFigures.get(id) ?? zeroed(figure), to: figure }));
  if (roll.to !== figure) setRoll({ from: roll.to, to: figure });
  useEffect(() => {
    seenFigures.set(id, figure);
  }, [id, figure]);
  return roll;
}

export const FIGURE = "shrink-0 text-[26px] leading-none font-semibold tracking-[-0.03em] whitespace-nowrap tabular-nums";

export function useFigure(id: string, figure: string) {
  const roll = useRoll(id, figure);
  const still = useReducedMotion() ?? false;
  return { figure: <NumberRoll key={`${roll.from}→${roll.to}`} from={roll.from} to={roll.to} />, grow: roll.from !== roll.to && !still };
}

export function GlanceCard({ collection, view }: { collection: Collection; view: GlanceView }) {
  const { figure, grow } = useFigure(collection.id, view.figure);
  return (
    <Link
      to="/notes/collections/$collectionId"
      params={{ collectionId: collection.id }}
      className="flex min-h-[96px] flex-col rounded-xl border border-line px-4 pt-3 pb-3 transition-[background-color,border-color,translate] duration-200 hover:-translate-y-px hover:border-line-strong hover:bg-panel motion-reduce:hover:translate-y-0"
    >
      <span className="truncate text-[13.5px] leading-[18px] text-soft">{collection.name}</span>
      <span className="mt-auto flex min-w-0 items-end gap-3">
        <span className={FIGURE}>{figure}</span>
        {view.chart && <MiniChart chart={view.chart} grow={grow} />}
      </span>
      <span className="mt-0.5 truncate text-[13px] leading-4 text-soft">
        {view.caption}
        {view.context && <span className="text-faint"> · {view.context}</span>}
      </span>
    </Link>
  );
}

const BOX = "relative ml-auto h-[30px] min-w-[44px] max-w-[132px] flex-1";
const VIEW_W = 100;
const VIEW_H = 30;
const TOP = 3;
const BOTTOM = 28;

const yOf = (level: number) => BOTTOM - level * (BOTTOM - TOP);
const pointsOf = (series: number[], length: number) =>
  series.map((level, index) => [length > 1 ? (index / (length - 1)) * VIEW_W : VIEW_W / 2, yOf(level)] as const);
const polyline = (points: (readonly [number, number])[]) => points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");

function Reveal({ grow, children }: { grow: boolean; children: ReactNode }) {
  return (
    <m.span
      className="absolute inset-0"
      initial={grow ? { clipPath: "inset(0 100% 0 0)" } : false}
      animate={{ clipPath: "inset(0 0% 0 0)" }}
      transition={{ duration: 0.9, ease, delay: 0.15 }}
    >
      {children}
    </m.span>
  );
}

function EndDot({ x, y, grow }: { x: number; y: number; grow: boolean }) {
  return (
    <m.span
      className="absolute size-[6px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
      style={{ left: `${(x / VIEW_W) * 100}%`, top: `${(y / VIEW_H) * 100}%` }}
      initial={grow ? { scale: 0 } : false}
      animate={{ scale: 1 }}
      transition={{ duration: 0.35, ease, delay: grow ? 0.95 : 0 }}
    />
  );
}

export function MiniChart({ chart, grow }: { chart: GlanceChart; grow: boolean }) {
  if (chart.kind === "month") {
    const now = pointsOf(chart.current, chart.length);
    const then = chart.previous && pointsOf(chart.previous, chart.previous.length);
    const last = now.at(-1);
    const area = last && `M0,${BOTTOM} L${polyline(now).replaceAll(" ", " L")} L${last[0].toFixed(2)},${BOTTOM} Z`;
    return (
      <span aria-hidden className={BOX}>
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
          <line x1="0" x2={VIEW_W} y1={BOTTOM + 0.5} y2={BOTTOM + 0.5} className="stroke-line-strong" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          {then && <polyline points={polyline(then)} fill="none" className="stroke-line-strong" strokeWidth="1.5" strokeDasharray="2 2.5" vectorEffect="non-scaling-stroke" />}
        </svg>
        <Reveal grow={grow}>
          <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
            {area && <path d={area} className="fill-accent" fillOpacity="0.12" />}
            <polyline points={polyline(now)} fill="none" className="stroke-accent" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
        </Reveal>
        {last && <EndDot x={last[0]} y={last[1]} grow={grow} />}
      </span>
    );
  }

  if (chart.kind === "line") {
    const points = pointsOf(chart.points, chart.points.length);
    const last = points.at(-1);
    return (
      <span aria-hidden className={BOX}>
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
          <line x1="0" x2={VIEW_W} y1={yOf(chart.mean)} y2={yOf(chart.mean)} className="stroke-line-strong" strokeWidth="1" strokeDasharray="2 2.5" vectorEffect="non-scaling-stroke" />
        </svg>
        <Reveal grow={grow}>
          <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
            <polyline points={polyline(points)} fill="none" className="stroke-quiet" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
        </Reveal>
        {last && <EndDot x={last[0]} y={last[1]} grow={grow} />}
      </span>
    );
  }

  if (chart.kind === "bars") {
    return (
      <span aria-hidden className="ml-auto flex h-[30px] max-w-[132px] min-w-0 shrink items-end gap-[3px] border-b border-line-strong" style={{ width: chart.heights.length * 12 - 3 }}>
        {chart.heights.map((height, index) => (
          <m.span
            key={index}
            className={`min-w-0 flex-1 origin-bottom rounded-t-[2px] ${index === chart.highlight ? "bg-accent" : "bg-line-strong"}`}
            style={{ height: `${Math.max(2, height * 28)}px` }}
            initial={grow ? { scaleY: 0 } : false}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.5, ease, delay: grow ? 0.1 + index * 0.04 : 0 }}
          />
        ))}
      </span>
    );
  }

  if (chart.kind === "days") {
    return (
      <span aria-hidden className="ml-auto flex shrink-0 flex-col gap-[3px] pb-0.5">
        {chart.weeks.map((week, row) => (
          <span key={row} className="flex gap-[3px]">
            {week.map((on, column) => (
              <m.span
                key={column}
                className={`size-[9px] rounded-[2.5px] ${on ? (row === 1 ? "bg-accent" : "bg-quiet") : "bg-line"}`}
                initial={grow ? { opacity: 0, scale: 0.4 } : false}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease, delay: grow ? 0.1 + (row * 7 + column) * 0.025 : 0 }}
              />
            ))}
          </span>
        ))}
      </span>
    );
  }

  return (
    <span aria-hidden className={BOX}>
      <span className="absolute inset-x-[5px] bottom-[9px] h-px bg-line-strong" />
      <span className="absolute bottom-[5px] left-[5px] h-[9px] w-px bg-quiet" />
      <span className="absolute inset-x-[5px] bottom-[9px]">
        {chart.at.map((at, index) => ({ at, index })).reverse().map(({ at, index }) => (
          <m.span
            key={index}
            className={`absolute rounded-full ${index === 0 ? "size-[9px] bg-accent" : "size-[6px] bg-quiet"}`}
            style={{ left: `${at * 100}%`, translate: "-50% 50%", bottom: 0 }}
            initial={grow ? { scale: 0 } : false}
            animate={{ scale: 1 }}
            transition={{ duration: 0.4, ease, delay: grow ? 0.15 + index * 0.06 : 0 }}
          />
        ))}
      </span>
    </span>
  );
}
