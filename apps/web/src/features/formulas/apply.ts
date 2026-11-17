import type { FactFields, StoredValue } from "@/features/notes/fact";
import { formatDuration, formatPace } from "./duration";
import { evaluate, parseFormula, print, refsOf, type Formula } from "./engine";
import { isMeasure } from "./units";

export const TOLERANCE = 0.02;
const MAX_INPUTS = 8;

export const parseStored = (expr: string): Formula => parseFormula(expr, (name) => (/^\$\d+$/.test(name) ? Number(name.slice(1)) - 1 : undefined));

export function formatAmount(value: Pick<FactFields, "kind" | "before" | "after">, amount: number, precision = 2): string {
  const money = value.kind === "money";
  const fraction = !Number.isInteger(Math.round(amount * 100) / 100);
  const digits = new Intl.NumberFormat("en-GB", { minimumFractionDigits: money && fraction ? 2 : 0, maximumFractionDigits: money ? 2 : precision }).format(amount);
  return `${value.before ?? ""}${digits}${value.after ?? ""}`;
}

export type Quantity = Pick<FactFields, "amount" | "seconds">;

export const quantityOf = (value: Quantity): number | undefined => value.amount ?? value.seconds;

export function withQuantity(value: Pick<FactFields, "kind" | "before" | "after" | "amount" | "unit">, quantity: number): { text: string } & Quantity {
  if (value.amount !== undefined) return { text: formatAmount(value, quantity), amount: quantity };
  return { text: isMeasure(value.unit) ? formatPace(quantity, value.unit) : formatDuration(quantity), seconds: quantity };
}

export function describeFormula(fact: StoredValue, lookup: (id: string) => StoredValue | undefined): string | undefined {
  if (!fact.formula) return undefined;
  try {
    return print(parseStored(fact.formula.expr), (index) => lookup(fact.formula!.inputs[index]!)?.name?.replaceAll("_", " ") ?? "?");
  } catch {
    return undefined;
  }
}

export function inputsFor(fact: StoredValue, values: StoredValue[]): StoredValue[] {
  const dependsOn = (candidate: StoredValue, target: string, seen = new Set<string>()): boolean => {
    if (!candidate.formula || seen.has(candidate.id)) return false;
    seen.add(candidate.id);
    return candidate.formula.inputs.some((input) => input === target || dependsOn(values.find((value) => value.id === input) ?? candidate, target, seen));
  };
  return values
    .filter((value) => value.id !== fact.id && quantityOf(value) !== undefined && value.origin?.noteId && value.origin.noteId === fact.origin?.noteId && !dependsOn(value, fact.id))
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
    .slice(0, MAX_INPUTS);
}

export function acceptFormula(suggested: string, target: number, inputs: StoredValue[]): FactFields["formula"] | undefined {
  if (!suggested) return undefined;
  try {
    const formula = parseFormula(suggested, (name) => {
      const index = /^v\d+$/.test(name) ? Number(name.slice(1)) - 1 : -1;
      return index >= 0 && index < inputs.length ? index : undefined;
    });
    const used = [...new Set(refsOf(formula))].sort((a, b) => a - b);
    if (used.length === 0) return undefined;
    const result = evaluate(formula, inputs.map((input) => quantityOf(input) ?? Number.NaN));
    if (!Number.isFinite(result) || Math.abs(result - target) > Math.max(1e-9, Math.abs(target) * TOLERANCE)) return undefined;
    const remap = new Map(used.map((index, position) => [index, position]));
    return { expr: print(formula, (index) => `$${remap.get(index)! + 1}`, "plain"), inputs: used.map((index) => inputs[index]!.id) };
  } catch {
    return undefined;
  }
}

export type Recomputed = { id: string; text: string } & Quantity;

export function recompute(changedId: string, values: StoredValue[], overrides: Map<string, number>): Recomputed[] {
  const results: Recomputed[] = [];
  const latest = (id: string) => overrides.get(id) ?? quantityOf(values.find((value) => value.id === id) ?? {});
  const queue = [changedId];
  const done = new Set<string>();
  while (queue.length) {
    const current = queue.shift()!;
    for (const fact of values) {
      if (!fact.formula?.inputs.includes(current) || done.has(fact.id)) continue;
      const amounts = fact.formula.inputs.map(latest);
      if (amounts.some((amount) => amount === undefined)) continue;
      let amount: number;
      try {
        amount = evaluate(parseStored(fact.formula.expr), amounts as number[]);
      } catch {
        continue;
      }
      if (!Number.isFinite(amount)) continue;
      done.add(fact.id);
      overrides.set(fact.id, amount);
      results.push({ id: fact.id, ...withQuantity(fact, amount) });
      queue.push(fact.id);
    }
  }
  return results;
}
