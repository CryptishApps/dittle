import * as fs from "node:fs";
import * as path from "node:path";
import type { EnvFileSpec } from "./lib.ts";

export type EnvFileAction = "linked" | "relinked" | "already-linked" | "copied" | "kept" | "missing" | "not-a-file";
export type EnvFileResult = { path: string; action: EnvFileAction; omitted: string[] };

const ASSIGNMENT = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.*)$/;

function opensUnclosedQuote(value: string): string | null {
  const quote = value[0];
  if (quote !== '"' && quote !== "'" && quote !== "`") return null;
  for (let i = 1; i < value.length; i++) {
    if (value[i] === "\\" && quote === '"') {
      i++;
      continue;
    }
    if (value[i] === quote) return null;
  }
  return quote;
}

function closesQuote(line: string, quote: string): boolean {
  for (let i = 0; i < line.length; i++) {
    if (line[i] === "\\" && quote === '"') {
      i++;
      continue;
    }
    if (line[i] === quote) return true;
  }
  return false;
}

export function omitKeys(text: string, keys: string[]): { text: string; omitted: string[] } {
  if (keys.length === 0) return { text, omitted: [] };
  const drop = new Set(keys);
  const omitted = new Set<string>();
  const output: string[] = [];
  let openQuote: string | null = null;
  let dropping = false;
  for (const line of text.split("\n")) {
    if (openQuote) {
      if (!dropping) output.push(line);
      if (closesQuote(line, openQuote)) openQuote = null;
      continue;
    }
    const match = ASSIGNMENT.exec(line);
    if (!match) {
      output.push(line);
      continue;
    }
    dropping = drop.has(match[1]!);
    if (dropping) omitted.add(match[1]!);
    else output.push(line);
    openQuote = opensUnclosedQuote(match[2]!);
  }
  return { text: output.join("\n"), omitted: keys.filter((key) => omitted.has(key)) };
}

export function syncEnvFiles(input: { mainCheckout: string; worktree: string; envFiles: EnvFileSpec[] }): EnvFileResult[] {
  if (path.resolve(input.mainCheckout) === path.resolve(input.worktree)) return [];
  return input.envFiles.map((spec) => {
    const source = path.join(input.mainCheckout, spec.path);
    const target = path.join(input.worktree, spec.path);
    const sourceStat = fs.statSync(source, { throwIfNoEntry: false });
    if (!sourceStat) return { path: spec.path, action: "missing", omitted: [] };
    if (!sourceStat.isFile()) return { path: spec.path, action: "not-a-file", omitted: [] };
    const existing = fs.lstatSync(target, { throwIfNoEntry: false });
    if (existing && !existing.isSymbolicLink()) return { path: spec.path, action: "kept", omitted: [] };
    if (existing && spec.mode === "link" && fs.readlinkSync(target) === source)
      return { path: spec.path, action: "already-linked", omitted: [] };
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (existing) fs.rmSync(target);
    if (spec.mode === "link") {
      fs.symlinkSync(source, target);
      return { path: spec.path, action: existing ? "relinked" : "linked", omitted: [] };
    }
    const { text, omitted } = omitKeys(fs.readFileSync(source, "utf8"), spec.omit);
    fs.writeFileSync(target, text, { mode: sourceStat.mode & 0o777 });
    return { path: spec.path, action: "copied", omitted };
  });
}

export function describeEnvFile(result: EnvFileResult, mainCheckout: string): string {
  switch (result.action) {
    case "linked":
    case "relinked":
      return `Linked ${result.path} to the main checkout's copy.`;
    case "already-linked":
      return `${result.path} is already linked.`;
    case "copied":
      return result.omitted.length > 0
        ? `Copied ${result.path} without ${result.omitted.join(", ")}.`
        : `Copied ${result.path}.`;
    case "kept":
      return `Kept the existing ${result.path} in this worktree.`;
    case "missing":
      return `Skipped ${result.path}: ${path.join(mainCheckout, result.path)} does not exist yet.`;
    case "not-a-file":
      return `Skipped ${result.path}: ${path.join(mainCheckout, result.path)} is not a regular file.`;
  }
}
