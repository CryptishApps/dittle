import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { AstackError, git, main, readConfig, resolveCheckout } from "./lib.ts";

export function affectedFilters(repoDir: string, integration: string): string[] {
  const base = `origin/${integration}`;
  if (git(["rev-parse", "--is-shallow-repository"], repoDir).stdout.trim() === "true")
    throw new AstackError(`This checkout is shallow, so its merge bases with ${base} cannot be found. Fetch the full history first: git fetch --unshallow origin`);
  if (git(["rev-parse", "--verify", "--quiet", `${base}^{commit}`], repoDir).code !== 0)
    throw new AstackError(`${base} is not in this checkout. Run git fetch origin ${integration} and try again.`);
  const bases = git(["merge-base", "--all", base, "HEAD"], repoDir);
  const shas = bases.stdout.split("\n").map((line) => line.trim()).filter(Boolean);
  if (bases.code !== 0 || shas.length === 0)
    throw new AstackError(`This branch shares no history with ${base}, so there is nothing to compare it with.\n${bases.stderr.trim()}`.trim());
  return shas.map((sha) => `--filter=...[${sha}]`);
}

if (import.meta.main)
  await main(() => {
    const tasks = process.argv.slice(2);
    if (tasks.length === 0) throw new AstackError("Name the turbo tasks to run, for example: bun scripts/astack/focused.ts typecheck test lint");
    const repoDir = resolveCheckout(process.cwd()).worktree;
    if (!fs.existsSync(path.join(repoDir, "turbo.json")))
      throw new AstackError("focused.ts runs Turborepo, and this project has no turbo.json. Set astack.checks.focused in t3.json to the project's own focused check.");
    const { integration } = readConfig(repoDir).branches;
    const filters = affectedFilters(repoDir, integration);
    console.log(`Checking packages changed since ${filters.length === 1 ? "the merge base" : `each of the ${filters.length} merge bases`} with origin/${integration}.`);
    return spawnSync("bunx", ["turbo", ...tasks, ...filters], { cwd: repoDir, stdio: "inherit" }).status ?? 1;
  });
