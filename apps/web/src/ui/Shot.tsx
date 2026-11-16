import type { CSSProperties } from "react";

export type Focus = { x: number; y: number; zoom: number };

const SHOT = { width: 2880, height: 1800, widths: [1440, 2880] } as const;

type ShotProps = { name: string; alt: string; theme?: "light" | "dark"; focus?: Focus; priority?: boolean; sizes?: string };

export function Shot({ name, alt, theme, focus, priority = false, sizes: sizesOverride }: ShotProps) {
  const style: CSSProperties | undefined = focus
    ? { width: `${focus.zoom * 100}%`, maxWidth: "none", transform: `translate(-${focus.x}%, -${focus.y}%)` }
    : undefined;
  const zoom = focus?.zoom ?? 1;
  const sizes =
    sizesOverride ??
    (focus
    ? `(min-width: 1024px) ${Math.round(zoom * 620)}px, calc(${zoom * 100}vw - ${zoom * 48}px)`
    : "(min-width: 1232px) 1188px, calc(100vw - 48px)");
  const srcSet = (variant: string, format: "avif" | "webp") => SHOT.widths.map((w) => `/shots/${name}-${variant}-${w}.${format} ${w}w`).join(", ");
  const sources = (variant: string, media?: string) =>
    (["avif", "webp"] as const).map((format) => <source key={`${variant}-${format}`} type={`image/${format}`} srcSet={srcSet(variant, format)} sizes={sizes} media={media} />);
  const fallback = theme ?? "light";
  return (
    <picture>
      {theme ? sources(theme) : [...sources("dark", "(prefers-color-scheme: dark)"), ...sources("light")]}
      <img
        src={`/shots/${name}-${fallback}-1440.webp`}
        alt={alt}
        width={SHOT.width}
        height={SHOT.height}
        className="block h-auto w-full"
        style={style}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
      />
    </picture>
  );
}
