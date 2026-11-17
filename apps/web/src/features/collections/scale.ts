import type { CollectionField, StoredValue } from "@/features/notes/fact";
import { convert, groupOf, isMeasure } from "@/features/formulas/units";

const textOf = (value: StoredValue) => `${(value.before ?? "").trim()}|${(value.after ?? "").trim()}`;
const groupKey = (value: StoredValue) => groupOf(value.unit) ?? `text:${textOf(value)}`;

export function largest<T>(items: T[], key: (item: T) => string): T[] {
  const groups = new Map<string, T[]>();
  for (const item of items) groups.set(key(item), [...(groups.get(key(item)) ?? []), item]);
  return [...groups.values()].sort((a, b) => b.length - a.length)[0] ?? [];
}

export function withUnits(cells: StoredValue[]): StoredValue[] {
  const known = new Map(cells.flatMap((cell) => (cell.unit ? [[textOf(cell), cell.unit] as const] : [])));
  return cells.map((cell) => (cell.unit || !known.has(textOf(cell)) ? cell : { ...cell, unit: known.get(textOf(cell)) }));
}

export function scaleOf(cells: StoredValue[]): StoredValue | undefined {
  const amounts = withUnits(cells.filter((cell) => cell.amount !== undefined));
  return largest(largest(amounts, groupKey), (cell) => cell.unit ?? textOf(cell))[0];
}

export function sizeIn(cell: StoredValue, scale: StoredValue): number | undefined {
  if (cell.amount === undefined) return undefined;
  if (isMeasure(scale.unit)) return isMeasure(cell.unit) ? convert(cell.amount, cell.unit, scale.unit) : undefined;
  return groupKey(cell) === groupKey(scale) ? cell.amount : undefined;
}

export type Scales = Map<string, StoredValue>;

export function scalesOf(fields: CollectionField[], cells: StoredValue[]): Scales {
  return new Map(
    fields.flatMap((field) => {
      const scale = scaleOf(cells.filter((cell) => cell.field === field.id));
      return scale ? [[field.id, scale] as const] : [];
    }),
  );
}
