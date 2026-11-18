import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { REEL_CELLS, reelColumns } from "./reels";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const readMs = (style: CSSStyleDeclaration, name: string) => Number.parseFloat(style.getPropertyValue(name)) || 0;

export function NumberRoll({ from, to, cell = "1.25em" }: { from: string; to: string; cell?: string }) {
  const columns = reelColumns(from, to);
  const filterId = useId().replaceAll(":", "");
  const root = useRef<HTMLSpanElement>(null);
  const blurs = useRef<(SVGFEGaussianBlurElement | null)[]>([]);
  const [rolled, setRolled] = useState(reducedMotion);
  const [settled, setSettled] = useState(reducedMotion);

  useEffect(() => {
    if (rolled || !root.current) return;
    const style = getComputedStyle(root.current);
    const duration = readMs(style, "--reel-dur");
    const stagger = readMs(style, "--reel-stagger");
    const spinBlur = Number.parseFloat(style.getPropertyValue("--reel-spin-blur")) || 0;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame((started) => {
        setRolled(true);
        const tick = (now: number) => {
          let moving = false;
          blurs.current.forEach((blur, index) => {
            if (!blur) return;
            const progress = Math.min(1, Math.max(0, (now - started - index * stagger) / duration));
            if (progress < 1) moving = true;
            blur.setAttribute("stdDeviation", `0 ${(spinBlur * (1 - progress) ** 3).toFixed(2)}`);
          });
          if (moving) frame = requestAnimationFrame(tick);
          else setSettled(true);
        };
        frame = requestAnimationFrame(tick);
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [rolled]);

  let reelIndex = 0;
  return (
    <span className="t-reel" ref={root} style={{ "--reel-cell": cell } as CSSProperties}>
      <span className="sr-only">{to}</span>
      {columns.map((column, index) => {
        if (column.kind === "still") {
          return (
            <span key={index} aria-hidden className="t-reel-digit">
              {column.char}
            </span>
          );
        }
        const position = reelIndex;
        reelIndex += 1;
        const at = rolled ? column.to : column.from;
        const id = `${filterId}-${position}`;
        const moves = column.from !== column.to;
        return (
          <span key={index} aria-hidden className="t-reel-col">
            {moves && !settled && (
              <svg width="0" height="0" className="absolute">
                <filter id={id}>
                  <feGaussianBlur
                    ref={(element) => {
                      blurs.current[position] = element;
                    }}
                    stdDeviation="0 0"
                  />
                </filter>
              </svg>
            )}
            <span
              className="t-reel-strip"
              style={{
                transform: `translateY(calc(var(--reel-cell) * ${-at}))`,
                transition: rolled && moves ? `transform var(--reel-dur) var(--reel-ease) calc(var(--reel-stagger) * ${position})` : "none",
                filter: moves && !settled ? `url(#${id})` : "none",
              }}
            >
              {REEL_CELLS.map((digit, cellIndex) => (
                <span key={cellIndex} className="t-reel-digit">
                  {digit}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}
