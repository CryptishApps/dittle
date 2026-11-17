export const VALUE_KINDS = ["money", "count", "number", "date", "duration", "percent", "person", "place"] as const;
export type ValueKind = (typeof VALUE_KINDS)[number];

export const TAG_KINDS = [...VALUE_KINDS, "text"] as const;
export type TagKind = (typeof TAG_KINDS)[number];

export const GRAINS = ["time", "day", "month", "year"] as const;
export type Grain = (typeof GRAINS)[number];

export type When = { on: string; grain: Grain };

const WHEN_SHAPE: Record<Grain, RegExp> = {
  time: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
  day: /^\d{4}-\d{2}-\d{2}$/,
  month: /^\d{4}-\d{2}$/,
  year: /^\d{4}$/,
};

export function validWhen(on: unknown, grain: unknown): When | undefined {
  const found = GRAINS.find((candidate) => candidate === grain);
  if (!found || typeof on !== "string" || !WHEN_SHAPE[found].test(on)) return undefined;
  const probe = found === "year" ? `${on}-01-01` : found === "month" ? `${on}-01` : on;
  return Number.isNaN(Date.parse(probe)) ? undefined : { on, grain: found };
}
