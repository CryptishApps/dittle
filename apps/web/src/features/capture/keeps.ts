import type { DraftValue, NoteDraft } from "@/features/ai/capture-answer";
import { daysUntil } from "@/features/collections/summary";
import { DAY, HOUR, MINUTE } from "@/features/formulas/duration";
import { parseStored, quantityOf, recompute, withQuantity, type Quantity } from "@/features/formulas/apply";
import { print, refsOf, type Formula } from "@/features/formulas/engine";
import type { FactFields, StoredValue } from "@/features/notes/fact";
import type { Where } from "@/features/onboarding/practice";
import { formulasFor, inlinesFor, type Formulas } from "./draft";

export type Shown = { text: string } & Quantity;
export type Tried = Map<number, Shown>;

export type KeepLine = { kind: "worked" | "filed" | "countdown"; index: number; sign: string; label: string; how: string; figure: string; also?: number[] };

export type TryIt = { index: number; to: number; fromText: string; toText: string; followers: number };

export type Spot = { index: number; inputs: number[] };

const MAX_LINES = 4;
const MAX_WORKED = 3;
const MAX_COUNTDOWNS = 2;
const MAX_FILED = 2;
const MAX_FILING_CHECKS = 8;
const MAX_SPOT_INPUTS = 8;
const CLOSE = 0.005;
const SPOT_KINDS = new Set<DraftValue["kind"]>(["money", "number", "percent", "duration"]);
const LIST = new Intl.ListFormat("en-GB", { type: "conjunction" });

export const valuesOf = (draft: NoteDraft): DraftValue[] => draft.paragraphs.flatMap((paragraph) => paragraph.values);

export function storedOf(values: DraftValue[], formulas: Formulas = formulasFor(values)): StoredValue[] {
  return values.map((value, index) => ({
    id: String(index),
    text: value.quote,
    kind: value.kind,
    name: value.name,
    event: value.event,
    ...(value.amount !== undefined && { amount: value.amount, before: value.before ?? "", after: value.after ?? "" }),
    ...(value.seconds !== undefined && { seconds: value.seconds }),
    ...(value.unit && { unit: value.unit }),
    ...(formulas.has(index) && { formula: formulas.get(index) }),
  }));
}

const wordsOf = (value: DraftValue) => value.name.replaceAll("_", " ").trim() || value.about || value.quote;
const capital = (words: string) => words.charAt(0).toUpperCase() + words.slice(1);

function signOf(formula: Formula): string {
  if (formula.t !== "op") return "=";
  return { "+": "Σ", "-": "−", "*": "×", "/": "÷" }[formula.op];
}

const daysText = (days: number) => (days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days`);

const countsDown = (value: DraftValue) => value.kind === "date" && value.when && (value.when.grain === "day" || value.when.grain === "time");

export function filingCandidates(draft: NoteDraft, limit = MAX_FILING_CHECKS): number[] {
  const rank = (value: DraftValue) => (value.kind === "text" ? 2 : value.kind === "date" ? 1 : 0);
  const values = valuesOf(draft);
  return values
    .map((_, index) => index)
    .sort((a, b) => rank(values[a]!) - rank(values[b]!) || a - b)
    .slice(0, limit);
}

function filedLines(wheres: ReadonlyMap<number, Where>, textAt: (index: number) => string): KeepLine[] {
  const groups = new Map<string, { collection: string; row?: string; fields: string[]; indices: number[] }>();
  for (const [index, where] of [...wheres].sort(([a], [b]) => a - b)) {
    if (where.at !== "collection" || where.day || !where.field || !where.sure) continue;
    const key = JSON.stringify([where.collection, where.row ?? ""]);
    const group = groups.get(key) ?? { collection: where.collection, row: where.row, fields: [], indices: [] };
    if (group.fields.includes(where.field)) continue;
    group.fields.push(where.field);
    group.indices.push(index);
    groups.set(key, group);
  }
  return [...groups.values()].slice(0, MAX_FILED).map((group): KeepLine => {
    const shown = group.indices.slice(0, 2).map(textAt);
    const more = group.indices.length - shown.length;
    const fields = group.fields.map((field) => field.toLowerCase());
    return {
      kind: "filed",
      index: group.indices[0]!,
      also: group.indices,
      sign: "→",
      label: [group.collection, group.row].filter(Boolean).join(" · "),
      how: `${capital(LIST.format(fields))} ${fields.length === 1 ? "goes" : "go"} in when you save.`,
      figure: more > 0 ? `${shown.join(" · ")} +${more}` : shown.join(" · "),
    };
  });
}

export function keepLines(draft: NoteDraft, tried: Tried = new Map(), today = new Date(), wheres: ReadonlyMap<number, Where> = new Map()): KeepLine[] {
  const values = valuesOf(draft);
  const formulas = formulasFor(values);
  const textAt = (index: number) => tried.get(index)?.text ?? values[index]!.quote;
  const worked = [...formulas]
    .sort(([a], [b]) => a - b)
    .slice(0, MAX_WORKED)
    .map(([index, formula]): KeepLine => {
      const inputs = formula.inputs.map(Number);
      const tree = parseStored(formula.expr);
      const follows = LIST.format([...new Set(refsOf(tree).map((at) => wordsOf(values[inputs[at]!]!)))]);
      return { kind: "worked", index, sign: signOf(tree), label: capital(wordsOf(values[index]!)), how: `${print(tree, (at) => textAt(inputs[at]!))}. Follows ${follows}.`, figure: textAt(index) };
    });

  const byDay = new Map<string, number>();
  values.forEach((value, index) => {
    if (!countsDown(value)) return;
    const on = value.when!.on.slice(0, 10);
    if (daysUntil(on, today) <= 0) return;
    const held = byDay.get(on);
    if (held === undefined || (values[held]!.when!.grain !== "day" && value.when!.grain === "day")) byDay.set(on, index);
  });
  const filed = filedLines(wheres, textAt).slice(0, MAX_LINES - worked.length);
  const countdowns = [...byDay]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, Math.min(MAX_COUNTDOWNS, MAX_LINES - worked.length - filed.length))
    .map(([on, index]): KeepLine => ({ kind: "countdown", index, sign: "◷", label: capital(wordsOf(values[index]!)), how: "Counts down on Home.", figure: daysText(daysUntil(on, today)) }));

  return [...worked, ...filed, ...countdowns];
}

export function liveValues(draft: NoteDraft, lines: KeepLine[], tryIt?: TryIt): Set<number> {
  const formulas = formulasFor(valuesOf(draft));
  const live = new Set<number>(lines.flatMap((line) => line.also ?? [line.index]));
  for (const line of lines) if (line.kind === "worked") for (const input of formulas.get(line.index)?.inputs ?? []) live.add(Number(input));
  if (tryIt) live.add(tryIt.index);
  return live;
}

const roundNice = (amount: number) => {
  const step = 10 ** Math.max(0, Math.floor(Math.log10(amount)) - 1);
  return Math.round(amount / step) * step;
};

export function nextQuantity(value: Pick<FactFields, "kind" | "amount" | "seconds">): number | undefined {
  if (value.amount !== undefined) {
    if (value.kind === "count") return value.amount + 1;
    if (value.kind === "percent") return value.amount + 5;
    const next = value.amount < 10 ? value.amount + 1 : roundNice(value.amount * 1.1);
    return next === value.amount ? value.amount + 1 : next;
  }
  if (value.seconds === undefined) return undefined;
  if (value.seconds % DAY === 0) return value.seconds + DAY;
  if (value.seconds % HOUR === 0) return value.seconds + HOUR;
  return value.seconds >= 10 * MINUTE ? value.seconds - MINUTE : value.seconds + 10;
}

function triedFor(values: DraftValue[], index: number, to: number): Tried {
  const id = String(index);
  const tried: Tried = new Map([[index, withQuantity(values[index]!, to)]]);
  for (const result of recompute(id, storedOf(values), new Map([[id, to]]))) {
    const at = Number(result.id);
    if (result.text !== values[at]!.quote) tried.set(at, result);
  }
  return tried;
}

export function withTried(draft: NoteDraft, tried: Tried): NoteDraft | null {
  let offset = 0;
  const paragraphs = draft.paragraphs.map((paragraph) => {
    const start = offset;
    offset += paragraph.values.length;
    if (!paragraph.values.some((_, at) => tried.has(start + at))) return paragraph;
    const before = inlinesFor(paragraph.text, paragraph.values.map((value, at) => ({ id: String(at), quote: value.quote })));
    const text = before.map((inline) => (inline.t === "value" ? (tried.get(start + Number(inline.id))?.text ?? inline.label) : inline.text)).join("");
    const values = paragraph.values.map((value, at) => {
      const shown = tried.get(start + at);
      if (!shown) return value;
      return { ...value, quote: shown.text, ...(shown.amount !== undefined && { amount: shown.amount }), ...(shown.seconds !== undefined && { seconds: shown.seconds }) };
    });
    const after = inlinesFor(text, values.map((value, at) => ({ id: String(at), quote: value.quote })));
    const order = (inlines: typeof before) => inlines.flatMap((inline) => (inline.t === "value" ? [inline.id] : [])).join(",");
    return order(after) === order(before) && after.length === before.length ? { text, values } : null;
  });
  return paragraphs.every((paragraph) => paragraph !== null) ? { ...draft, paragraphs } : null;
}

export function tryItOf(draft: NoteDraft): TryIt | undefined {
  const values = valuesOf(draft);
  const formulas = formulasFor(values);
  const inputs = new Set([...formulas.values()].flatMap((formula) => formula.inputs.map(Number)));
  const options = [...inputs].flatMap((index): TryIt[] => {
    const value = values[index]!;
    const to = nextQuantity(value);
    if (formulas.has(index) || value.kind !== "count" || to === undefined || quantityOf(value) === undefined) return [];
    const tried = triedFor(values, index, to);
    if (tried.size < 2 || !withTried(draft, tried)) return [];
    return [{ index, to, fromText: value.quote, toText: tried.get(index)!.text, followers: tried.size - 1 }];
  });
  return options.sort((a, b) => b.followers - a.followers || a.index - b.index)[0];
}

export const tryValues = (draft: NoteDraft, tryIt: TryIt): Tried => triedFor(valuesOf(draft), tryIt.index, tryIt.to);

function dependsOn(formulas: Formulas, from: number, target: number, seen = new Set<number>()): boolean {
  if (from === target) return true;
  if (seen.has(from)) return false;
  seen.add(from);
  return (formulas.get(from)?.inputs ?? []).some((input) => dependsOn(formulas, Number(input), target, seen));
}

function comboFor(values: DraftValue[], target: number, usable: number[]): number[] | undefined {
  const goal = quantityOf(values[target]!)!;
  const close = (result: number) => Number.isFinite(result) && Math.abs(result - goal) <= Math.abs(goal) * CLOSE;
  const kind = values[target]!.kind;
  const amountOf = (index: number) => quantityOf(values[index]!)!;
  const sameKind = (...indices: number[]) => indices.every((index) => values[index]!.kind === kind && values[index]!.amount !== undefined);
  for (const [position, a] of usable.entries()) {
    for (const b of usable.slice(position + 1)) {
      const [x, y] = [amountOf(a), amountOf(b)];
      const percent = values[a]!.kind === "percent" || values[b]!.kind === "percent" ? (x * y) / 100 : Number.NaN;
      const tries = [
        sameKind(a, b) ? x + y : Number.NaN,
        sameKind(a, b) ? Math.abs(x - y) : Number.NaN,
        x === 1 || y === 1 ? Number.NaN : x * y,
        y === 1 ? Number.NaN : x / y,
        x === 1 ? Number.NaN : y / x,
        percent,
      ];
      if (tries.some(close)) return [a, b];
    }
  }
  for (const [first, a] of usable.entries()) {
    for (const [second, b] of usable.slice(first + 1).entries()) {
      for (const c of usable.slice(first + second + 2)) {
        if (sameKind(a, b, c) && close(amountOf(a) + amountOf(b) + amountOf(c))) return [a, b, c];
      }
    }
  }
  return undefined;
}

export function spotsFor(draft: NoteDraft, limit = 4): Spot[] {
  const values = valuesOf(draft);
  const formulas = formulasFor(values);
  const paragraphOf = draft.paragraphs.flatMap((paragraph, at) => paragraph.values.map(() => at));
  const spots = values.flatMap((value, index): (Spot & { claimed: boolean })[] => {
    const goal = quantityOf(value);
    if (goal === undefined || goal === 0 || formulas.has(index) || !SPOT_KINDS.has(value.kind)) return [];
    const usable = values.flatMap((other, at) => (at !== index && other.kind !== "date" && quantityOf(other) !== undefined && !dependsOn(formulas, at, index) ? [at] : []));
    const claimed = value.formula !== "";
    const combo = comboFor(values, index, usable);
    if (!claimed && !combo) return [];
    const near = [...usable].sort((a, b) => Number(paragraphOf[a] !== paragraphOf[index]) - Number(paragraphOf[b] !== paragraphOf[index]) || Math.abs(a - index) - Math.abs(b - index));
    const inputs = [...new Set([...(combo ?? []), ...near])].slice(0, MAX_SPOT_INPUTS);
    return inputs.length > 0 ? [{ index, inputs, claimed }] : [];
  });
  return spots
    .sort((a, b) => Number(b.claimed) - Number(a.claimed) || b.index - a.index)
    .slice(0, limit)
    .map(({ index, inputs }) => ({ index, inputs }));
}

export function withSpotted(draft: NoteDraft, index: number, formula: NonNullable<FactFields["formula"]>): NoteDraft {
  const values = valuesOf(draft);
  const formulas = formulasFor(values);
  if (formulas.has(index) || formula.inputs.some((input) => dependsOn(formulas, Number(input), index))) return draft;
  const expr = formula.expr.replace(/\$(\d+)/g, (_, at: string) => `v${Number(formula.inputs[Number(at) - 1]) + 1}`);
  let offset = 0;
  const next: NoteDraft = {
    ...draft,
    paragraphs: draft.paragraphs.map((paragraph) => {
      const start = offset;
      offset += paragraph.values.length;
      return { ...paragraph, values: paragraph.values.map((value, at) => (start + at === index ? { ...value, formula: expr } : value)) };
    }),
  };
  return formulasFor(valuesOf(next)).has(index) ? next : draft;
}
