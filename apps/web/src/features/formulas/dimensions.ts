import type { Formula } from "./engine";

export type Dimensions = Readonly<Record<string, number>>;

export const TIME = "s";

function combine(left: Dimensions, right: Dimensions, sign: 1 | -1): Dimensions {
  const out: Record<string, number> = { ...left };
  for (const [key, power] of Object.entries(right)) {
    const next = (out[key] ?? 0) + sign * power;
    if (next === 0) delete out[key];
    else out[key] = next;
  }
  return out;
}

const same = (left: Dimensions, right: Dimensions) => Object.keys(combine(left, right, -1)).length === 0;

export function dimensionsOf(formula: Formula, inputs: Dimensions[]): Dimensions | undefined {
  switch (formula.t) {
    case "num":
      return {};
    case "ref":
      return inputs[formula.index];
    case "neg":
      return dimensionsOf(formula.of, inputs);
    case "op": {
      const left = dimensionsOf(formula.left, inputs);
      const right = dimensionsOf(formula.right, inputs);
      if (!left || !right) return undefined;
      if (formula.op === "+" || formula.op === "-") return same(left, right) ? left : undefined;
      return combine(left, right, formula.op === "*" ? 1 : -1);
    }
  }
}

export const dimensionsKey = (dimensions: Dimensions) =>
  Object.entries(dimensions)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, power]) => `${key}^${power}`)
    .join(" ");
