import type { CalculatedColumn, CollectionField, StoredValue } from "@/features/notes/fact";
import { formatAmount, parseStored } from "@/features/formulas/apply";
import { dimensionsKey, dimensionsOf, TIME, type Dimensions } from "@/features/formulas/dimensions";
import { formatClock } from "@/features/formulas/duration";
import { evaluate, parseFormula, print, refsOf } from "@/features/formulas/engine";
import { isMeasure } from "@/features/formulas/units";
import { largest, sizeIn, type Scales } from "./scale";

export type RowCells = (fieldId: string) => StoredValue | undefined;
export type ColumnValue = { number: number; text: string; dimensions: Dimensions; scales: Record<string, StoredValue> };
export type ColumnAverage = { text: string; counted: number };

const NUMERIC = new Set<CollectionField["kind"]>(["money", "count", "number", "percent", "duration"]);
export const numericFields = (fields: CollectionField[]) => fields.filter((field) => NUMERIC.has(field.kind));

type Input = { number: number; dimensions: Dimensions; scale: StoredValue };

function inputOf(fieldId: string, cell: StoredValue | undefined, scale: StoredValue | undefined): Input | undefined {
  if (!cell) return undefined;
  if (cell.amount === undefined && cell.seconds !== undefined) {
    return { number: cell.seconds, dimensions: isMeasure(cell.unit) ? { [TIME]: 1, [cell.unit]: -1 } : { [TIME]: 1 }, scale: cell };
  }
  const size = scale && sizeIn(cell, scale);
  if (!scale || size === undefined) return undefined;
  return { number: size, dimensions: { [scale.unit ?? `field:${fieldId}`]: 1 }, scale };
}

export function showColumn(number: number, dimensions: Dimensions, scales: Record<string, StoredValue>): string {
  const { [TIME]: time = 0, ...rest } = dimensions;
  const powers = Object.entries(rest);
  const up = powers.filter(([, power]) => power === 1).map(([key]) => key);
  const down = powers.filter(([, power]) => power === -1).map(([key]) => key);
  const plain = formatAmount({}, number);
  if (up.length + down.length !== powers.length || up.length > 1 || down.length > 1 || Math.abs(time) > 1) return plain;
  const per = down[0] && isMeasure(down[0]) ? `/${down[0]}` : "";
  const top = up[0] === undefined ? undefined : scales[up[0]];
  if (time === 1) return top ? plain : `${formatClock(number)}${per}`;
  if (time === -1) return top && !down.length ? `${formatAmount(top, number * 3600, 1)}/h` : plain;
  return `${top ? formatAmount(top, number) : plain}${per}`;
}

export function columnValue(column: CalculatedColumn, cellOf: RowCells, scales: Scales): ColumnValue | undefined {
  const inputs = column.inputs.map((fieldId) => inputOf(fieldId, cellOf(fieldId), scales.get(fieldId)));
  if (!inputs.every((input): input is Input => input !== undefined)) return undefined;
  try {
    const formula = parseStored(column.expr);
    const dimensions = dimensionsOf(formula, inputs.map((input) => input.dimensions));
    const number = evaluate(formula, inputs.map((input) => input.number));
    if (!dimensions || !Number.isFinite(number)) return undefined;
    const byKey = Object.fromEntries(inputs.flatMap((input) => Object.keys(input.dimensions).map((key) => [key, input.scale] as const)));
    return { number, dimensions, scales: byKey, text: showColumn(number, dimensions, byKey) };
  } catch {
    return undefined;
  }
}

export function columnAverage(values: ColumnValue[]): ColumnAverage | undefined {
  const main = largest(values, (value) => dimensionsKey(value.dimensions));
  const first = main[0];
  if (!first || main.length < 2) return undefined;
  const mean = main.reduce((total, value) => total + value.number, 0) / main.length;
  return { text: showColumn(mean, first.dimensions, first.scales), counted: main.length };
}

export function describeColumn(column: CalculatedColumn, fields: CollectionField[]): string | undefined {
  try {
    return print(parseStored(column.expr), (index) => fields.find((field) => field.id === column.inputs[index])?.name ?? "?");
  } catch {
    return undefined;
  }
}

export function acceptColumn(name: string, suggested: string, fields: CollectionField[], rows: RowCells[], scales: Scales): CalculatedColumn | undefined {
  const label = name.trim();
  if (!label) return undefined;
  try {
    const formula = parseFormula(suggested, (ref) => {
      const index = /^f\d+$/.test(ref) ? Number(ref.slice(1)) - 1 : -1;
      return index >= 0 && index < fields.length ? index : undefined;
    });
    const used = [...new Set(refsOf(formula))].sort((a, b) => a - b);
    if (used.length !== 2) return undefined;
    const remap = new Map(used.map((index, position) => [index, position]));
    const column = { id: crypto.randomUUID(), name: label, expr: print(formula, (index) => `$${remap.get(index)! + 1}`, "plain"), inputs: used.map((index) => fields[index]!.id) };
    return rows.some((cellOf) => columnValue(column, cellOf, scales)) ? column : undefined;
  } catch {
    return undefined;
  }
}
