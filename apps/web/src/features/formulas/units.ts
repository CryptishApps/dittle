export const MEASURE_UNITS = ["km", "m", "cm", "mi", "ft", "kg", "g", "lb", "oz", "l", "ml"] as const;
export type MeasureUnit = (typeof MEASURE_UNITS)[number];

type Dimension = "length" | "mass" | "volume";

const MEASURES: Record<MeasureUnit, { dimension: Dimension; base: number }> = {
  km: { dimension: "length", base: 1000 },
  m: { dimension: "length", base: 1 },
  cm: { dimension: "length", base: 0.01 },
  mi: { dimension: "length", base: 1609.344 },
  ft: { dimension: "length", base: 0.3048 },
  kg: { dimension: "mass", base: 1000 },
  g: { dimension: "mass", base: 1 },
  lb: { dimension: "mass", base: 453.592_37 },
  oz: { dimension: "mass", base: 28.349_523_125 },
  l: { dimension: "volume", base: 1000 },
  ml: { dimension: "volume", base: 1 },
};

const CURRENCIES = new Set(Intl.supportedValuesOf("currency"));

export const isMeasure = (unit: string | undefined): unit is MeasureUnit => MEASURE_UNITS.some((candidate) => candidate === unit);
export const isCurrency = (unit: string | undefined): unit is string => unit !== undefined && CURRENCIES.has(unit);

export function groupOf(unit: string | undefined): string | undefined {
  if (isMeasure(unit)) return MEASURES[unit].dimension;
  return isCurrency(unit) ? unit : undefined;
}

export function convert(amount: number, from: MeasureUnit, to: MeasureUnit): number | undefined {
  if (MEASURES[from].dimension !== MEASURES[to].dimension) return undefined;
  return from === to ? amount : (amount * MEASURES[from].base) / MEASURES[to].base;
}
