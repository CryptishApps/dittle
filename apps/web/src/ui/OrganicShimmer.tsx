import type { CSSProperties } from "react";

export function OrganicShimmer({
  width,
  height,
  radius = 12,
  playing = true,
}: {
  width: number;
  height: number;
  radius?: number;
  playing?: boolean;
}) {
  const scale = Math.min(width, height) / 142;
  return (
    <>
      <div
        className="t-shimmer-tile"
        aria-hidden
        data-playing={playing ? undefined : "false"}
        style={{ width, height, borderRadius: radius, "--shimmer-scale": scale } as CSSProperties}
      >
        <span className="t-shimmer">
          <span className="t-shimmer-band" />
        </span>
        <span className="t-shimmer-edge">
          <span className="t-shimmer-edge-bloom" />
          <span className="t-shimmer-edge-glow" />
          <span className="t-shimmer-edge-ring" />
        </span>
      </div>
      <ShimmerWarpFilter />
    </>
  );
}

function ShimmerWarpFilter() {
  if (typeof document !== "undefined" && document.getElementById("t-shimmer-warp")) return null;
  return (
    <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden focusable="false">
      <filter id="t-shimmer-warp" x="-40%" y="-40%" width="180%" height="180%">
        <feTurbulence type="fractalNoise" baseFrequency="0.009 0.015" numOctaves={2} seed={7} result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale={46} xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}
