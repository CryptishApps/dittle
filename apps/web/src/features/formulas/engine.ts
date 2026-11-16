export type Formula = { t: "num"; value: number } | { t: "ref"; index: number } | { t: "neg"; of: Formula } | { t: "op"; op: "+" | "-" | "*" | "/"; left: Formula; right: Formula };

type Token = { kind: "num"; value: number } | { kind: "ref"; name: string } | { kind: "op"; op: "+" | "-" | "*" | "/" } | { kind: "open" } | { kind: "close" };

const OPERATORS: Record<string, "+" | "-" | "*" | "/"> = { "+": "+", "-": "-", "−": "-", "*": "*", "×": "*", x: "*", "/": "/", "÷": "/" };

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < source.length) {
    const char = source[index]!;
    if (char === " ") {
      index += 1;
    } else if (char === "(") {
      tokens.push({ kind: "open" });
      index += 1;
    } else if (char === ")") {
      tokens.push({ kind: "close" });
      index += 1;
    } else if (char in OPERATORS && !(char === "x" && /[a-z0-9_]/i.test(source[index + 1] ?? ""))) {
      tokens.push({ kind: "op", op: OPERATORS[char]! });
      index += 1;
    } else if (/[0-9.]/.test(char)) {
      const match = /^[0-9]*\.?[0-9]+/.exec(source.slice(index));
      if (!match) throw new Error(`Bad number at ${index}`);
      tokens.push({ kind: "num", value: Number(match[0]) });
      index += match[0].length;
    } else if (/[$a-z]/i.test(char)) {
      const match = /^[$a-z][a-z0-9_]*/i.exec(source.slice(index))!;
      tokens.push({ kind: "ref", name: match[0] });
      index += match[0].length;
    } else {
      throw new Error(`Unexpected "${char}"`);
    }
  }
  return tokens;
}

export function parseFormula(source: string, resolve: (name: string) => number | undefined): Formula {
  const tokens = tokenize(source);
  let position = 0;
  const peek = () => tokens[position];
  const take = () => tokens[position++];

  const primary = (): Formula => {
    const token = take();
    if (!token) throw new Error("Formula ends too early");
    if (token.kind === "num") return { t: "num", value: token.value };
    if (token.kind === "ref") {
      const index = resolve(token.name);
      if (index === undefined) throw new Error(`Unknown name ${token.name}`);
      return { t: "ref", index };
    }
    if (token.kind === "op" && token.op === "-") return { t: "neg", of: primary() };
    if (token.kind === "open") {
      const inner = sum();
      if (take()?.kind !== "close") throw new Error("Missing )");
      return inner;
    }
    throw new Error("Unexpected token");
  };

  const product = (): Formula => {
    let left = primary();
    for (let next = peek(); next?.kind === "op" && (next.op === "*" || next.op === "/"); next = peek()) {
      take();
      left = { t: "op", op: next.op, left, right: primary() };
    }
    return left;
  };

  const sum = (): Formula => {
    let left = product();
    for (let next = peek(); next?.kind === "op" && (next.op === "+" || next.op === "-"); next = peek()) {
      take();
      left = { t: "op", op: next.op, left, right: product() };
    }
    return left;
  };

  const formula = sum();
  if (position !== tokens.length) throw new Error("Unexpected text after formula");
  return formula;
}

export function evaluate(formula: Formula, inputs: number[]): number {
  switch (formula.t) {
    case "num":
      return formula.value;
    case "ref":
      return inputs[formula.index] ?? Number.NaN;
    case "neg":
      return -evaluate(formula.of, inputs);
    case "op": {
      const left = evaluate(formula.left, inputs);
      const right = evaluate(formula.right, inputs);
      if (formula.op === "+") return left + right;
      if (formula.op === "-") return left - right;
      if (formula.op === "*") return left * right;
      return right === 0 ? Number.NaN : left / right;
    }
  }
}

export function refsOf(formula: Formula): number[] {
  if (formula.t === "ref") return [formula.index];
  if (formula.t === "neg") return refsOf(formula.of);
  if (formula.t === "op") return [...refsOf(formula.left), ...refsOf(formula.right)];
  return [];
}

const PRECEDENCE = { "+": 1, "-": 1, "*": 2, "/": 2 } as const;

export function print(formula: Formula, name: (index: number) => string, style: "display" | "plain" = "display", parent = 0): string {
  switch (formula.t) {
    case "num":
      return String(formula.value);
    case "ref":
      return name(formula.index);
    case "neg":
      return `${style === "display" ? "−" : "-"}${print(formula.of, name, style, 3)}`;
    case "op": {
      const level = PRECEDENCE[formula.op];
      const symbol = style === "display" ? { "+": "+", "-": "−", "*": "×", "/": "÷" }[formula.op] : formula.op;
      const text = `${print(formula.left, name, style, level)} ${symbol} ${print(formula.right, name, style, level + 1)}`;
      return level < parent ? `(${text})` : text;
    }
  }
}
