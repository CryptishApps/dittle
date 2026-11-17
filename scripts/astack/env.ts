import { main, readWorktreeEnv, resolveCheckout, shellQuote } from "./lib.ts";

export function exportLines(vars: Record<string, string>): string[] {
  return Object.entries(vars).map(([key, value]) => `export ${key}=${shellQuote(value)}`);
}

if (import.meta.main)
  await main(() => {
    for (const line of exportLines(readWorktreeEnv(resolveCheckout(process.cwd()).worktree))) console.log(line);
  });
