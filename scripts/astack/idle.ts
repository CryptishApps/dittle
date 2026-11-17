import * as fs from "node:fs";
import * as path from "node:path";
import { git } from "./lib.ts";
import type { Liveness } from "./procs.ts";

export function idleMs(now: number, startedAt: number, activity: (number | null | undefined)[]): number {
  const latest = Math.max(startedAt, ...activity.filter((time): time is number => typeof time === "number"));
  return Math.max(0, now - latest);
}

export function parsePorcelainZ(output: string): string[] {
  const tokens = output.split("\0").filter((token) => token.length > 0);
  const paths: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    const status = token.slice(0, 2);
    paths.push(token.slice(3));
    if (status[0] === "R" || status[0] === "C") i++;
  }
  return paths;
}

function mtime(file: string): number | null {
  return fs.lstatSync(file, { throwIfNoEntry: false })?.mtimeMs ?? null;
}

export function worktreeActivity(worktree: string): number[] {
  const times: (number | null)[] = [];
  for (const gitPath of ["index", "logs/HEAD"]) {
    const result = git(["rev-parse", "--path-format=absolute", "--git-path", gitPath], worktree);
    if (result.code === 0) times.push(mtime(result.stdout.trim()));
  }
  const status = git(["--no-optional-locks", "status", "--porcelain=v1", "-z", "--untracked-files=all"], worktree);
  if (status.code === 0) for (const file of parsePorcelainZ(status.stdout)) times.push(mtime(path.join(worktree, file)));
  return times.filter((time): time is number => time !== null);
}

export function worktreeIdleMs(worktree: string, startedAt: string | null, now = Date.now()): number {
  const started = startedAt ? Date.parse(startedAt) : 0;
  return idleMs(now, Number.isNaN(started) ? 0 : started, worktreeActivity(worktree));
}

export function branchMergedInto(worktree: string, integration: string, release: string): boolean {
  const branch = git(["symbolic-ref", "--short", "-q", "HEAD"], worktree);
  if (branch.code !== 0) return false;
  const name = branch.stdout.trim();
  if (name === integration || name === release) return false;
  return mergedIn(worktree, "HEAD", [integration, release]);
}

export function mergedIn(cwd: string, rev: string, targets: string[]): boolean {
  const head = git(["rev-parse", "--verify", "-q", `${rev}^{commit}`], cwd);
  if (head.code !== 0) return false;
  const sha = head.stdout.trim();
  let contained = false;
  for (const branch of new Set(targets)) {
    const target = `refs/remotes/origin/${branch}`;
    if (git(["rev-parse", "--verify", "-q", target], cwd).code !== 0) continue;
    if (git(["merge-base", "--is-ancestor", sha, target], cwd).code !== 0) continue;
    if (onFirstParentLine(cwd, sha, target)) return false;
    contained = true;
  }
  return contained;
}

function onFirstParentLine(cwd: string, sha: string, target: string): boolean {
  const walk = git(["rev-list", "--first-parent", "--reverse", target, `^${sha}`], cwd);
  const oldest = walk.stdout.split("\n")[0]?.trim();
  if (!oldest) return true;
  return git(["rev-parse", `${oldest}^1`], cwd).stdout.trim() === sha;
}

export function containedIn(cwd: string, rev: string, targets: string[]): boolean {
  return [...new Set(targets)].some(
    (target) => git(["merge-base", "--is-ancestor", rev, `refs/remotes/origin/${target}`], cwd).code === 0,
  );
}

export type ReapDecision = { action: "drop" | "stop" | "keep"; reason: string };

export function decideReap(input: {
  liveness: Liveness;
  worktreeExists: boolean;
  merged: boolean;
  idleMs: number;
  idleLimitMs: number;
}): ReapDecision {
  if (input.liveness === "gone") return { action: "drop", reason: "process already exited" };
  if (input.liveness === "reused") return { action: "drop", reason: "its PID now belongs to another process" };
  if (!input.worktreeExists) return { action: "stop", reason: "its worktree was deleted" };
  if (input.merged) return { action: "stop", reason: "its branch is merged" };
  if (input.idleMs > input.idleLimitMs) return { action: "stop", reason: "idle" };
  return { action: "keep", reason: "active" };
}
