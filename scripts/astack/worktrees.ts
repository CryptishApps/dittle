import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { formatDuration, git, statePaths, type AstackConfig } from "./lib.ts";
import { containedIn, mergedIn, worktreeIdleMs } from "./idle.ts";
import { listRecords, verifyRecord, type ProcessProbe } from "./procs.ts";
import { longLivedBranches } from "./sweep.ts";

type Log = (line: string) => void;

export type WorktreeEntry = { path: string; head: string | null; branch: string | null; locked: boolean; prunable: boolean; bare: boolean };

export function parseWorktreeList(output: string): WorktreeEntry[] {
  const entries: WorktreeEntry[] = [];
  let current: WorktreeEntry | null = null;
  for (const field of output.split("\0")) {
    if (field === "") {
      if (current) entries.push(current);
      current = null;
      continue;
    }
    const space = field.indexOf(" ");
    const key = space === -1 ? field : field.slice(0, space);
    const value = space === -1 ? "" : field.slice(space + 1);
    if (key === "worktree") current = { path: value, head: null, branch: null, locked: false, prunable: false, bare: false };
    else if (!current) continue;
    else if (key === "HEAD") current.head = value;
    else if (key === "branch") current.branch = value.startsWith("refs/heads/") ? value.slice("refs/heads/".length) : value;
    else if (key === "locked") current.locked = true;
    else if (key === "prunable") current.prunable = true;
    else if (key === "bare") current.bare = true;
  }
  if (current) entries.push(current);
  return entries;
}

export type WorktreeFacts = {
  mainCheckout: boolean;
  longLived: boolean;
  locked: boolean;
  merged: boolean;
  dirty: boolean;
  operationInProgress: boolean;
  serviceRunning: boolean;
  idleMs: number;
  idleLimitMs: number;
  dirtyIdleLimitMs: number;
};

export type WorktreeDecision = { action: "remove" | "archive" | "keep"; reason: string };

export function decideWorktree(facts: WorktreeFacts): WorktreeDecision {
  if (facts.mainCheckout) return { action: "keep", reason: "it is the main checkout" };
  if (facts.longLived) return { action: "keep", reason: "it is on a long-lived branch" };
  if (facts.locked) return { action: "keep", reason: "it is locked" };
  if (!facts.merged) return { action: "keep", reason: "it has work that is not merged" };
  if (facts.operationInProgress) return { action: "keep", reason: "a merge, rebase or similar is in progress" };
  if (facts.serviceRunning) return { action: "keep", reason: "a service is still running in it" };
  if (facts.dirty && facts.idleMs <= facts.dirtyIdleLimitMs) return { action: "keep", reason: "it has uncommitted or untracked files" };
  if (facts.dirty)
    return { action: "archive", reason: `its work is merged, it has been idle for ${formatDuration(facts.idleMs)}, and it still has uncommitted or untracked files` };
  if (facts.idleMs <= facts.idleLimitMs) return { action: "keep", reason: "it was used recently" };
  return { action: "remove", reason: `its work is merged and it has been idle for ${formatDuration(facts.idleMs)}` };
}

const OPERATION_FILES = ["MERGE_HEAD", "rebase-merge", "rebase-apply", "CHERRY_PICK_HEAD", "REVERT_HEAD", "BISECT_LOG"];

function operationInProgress(worktree: string): boolean {
  return OPERATION_FILES.some((name) => {
    const result = git(["rev-parse", "--path-format=absolute", "--git-path", name], worktree);
    return result.code !== 0 || fs.existsSync(result.stdout.trim());
  });
}

function dirty(worktree: string): boolean {
  const status = git(["--no-optional-locks", "status", "--porcelain=v1", "-z", "--untracked-files=all"], worktree);
  return status.code !== 0 || status.stdout.length > 0;
}

function samePath(left: string, right: string): boolean {
  const real = (value: string) => {
    try {
      return fs.realpathSync(value);
    } catch {
      return path.resolve(value);
    }
  };
  return real(left) === real(right);
}

export function reapWorktrees(
  input: { mainCheckout: string; config: AstackConfig; dryRun: boolean },
  options: { probe: ProcessProbe; log: Log; now: number },
): number {
  const { integration, release } = input.config.branches;
  const targets = [integration, release];
  const kept = longLivedBranches(input.config);
  const idleLimitMs = input.config.reaper.worktreeIdleHours * 3_600_000;
  const dirtyIdleLimitMs = input.config.reaper.dirtyWorktreeIdleHours * 3_600_000;

  const listed = git(["worktree", "list", "--porcelain", "-z"], input.mainCheckout);
  if (listed.code !== 0) return 0;
  const entries = parseWorktreeList(listed.stdout);
  const running = listRecords(statePaths(input.mainCheckout).processes)
    .map((entry) => entry.record)
    .filter((record) => record !== null && verifyRecord(record, options.probe) === "running")
    .map((record) => record!.worktree);

  let acted = 0;
  const worktreeBranches = new Set(entries.flatMap((entry) => (entry.branch ? [entry.branch] : [])));
  for (const entry of entries) {
    if (entry.bare || entry.prunable || !fs.existsSync(entry.path)) continue;
    const facts: WorktreeFacts = {
      mainCheckout: samePath(entry.path, input.mainCheckout),
      longLived: entry.branch !== null && kept.has(entry.branch),
      locked: entry.locked,
      merged: entry.head !== null && (entry.branch ? mergedIn(input.mainCheckout, entry.head, targets) : containedIn(input.mainCheckout, entry.head, targets)),
      dirty: false,
      operationInProgress: false,
      serviceRunning: running.some((worktree) => samePath(worktree, entry.path)),
      idleMs: 0,
      idleLimitMs,
      dirtyIdleLimitMs,
    };
    if (!facts.mainCheckout && !facts.longLived && !facts.locked && facts.merged) {
      facts.dirty = dirty(entry.path);
      facts.operationInProgress = operationInProgress(entry.path);
      facts.idleMs = worktreeIdleMs(entry.path, null, options.now);
    }
    const decision = decideWorktree(facts);
    if (decision.action === "keep") continue;
    acted++;
    const ref = decision.action === "archive" ? archiveRef(entry.path, input.mainCheckout, options.now) : null;
    if (input.dryRun) {
      if (ref) options.log(`Would save the uncommitted files of ${entry.path} to ${ref} and remove the worktree: ${decision.reason}.`);
      else options.log(`Would remove the worktree ${entry.path}: ${decision.reason}.`);
      if (entry.branch) options.log(`Would delete the local branch ${entry.branch}: it is merged.`);
      continue;
    }
    if (ref) {
      const archived = archiveUncommitted(entry.path, ref);
      if (archived !== null) {
        options.log(`Kept the worktree ${entry.path}: could not save its uncommitted files (${archived}).`);
        continue;
      }
    }
    const removed = git(["worktree", "remove", ...(ref ? ["--force"] : []), entry.path], input.mainCheckout);
    if (removed.code !== 0) {
      options.log(`Could not remove the worktree ${entry.path}: ${removed.stderr.trim().split("\n")[0]}`);
      continue;
    }
    if (ref) options.log(`Removed the worktree ${entry.path}: ${decision.reason}. Its files are saved in ${ref}; restore them with git worktree add <path> ${ref}.`);
    else options.log(`Removed the worktree ${entry.path}: ${decision.reason}.`);
    if (entry.branch) deleteBranch(entry.branch, entry.head!, input, options.log);
  }

  const branches = git(["for-each-ref", "--format=%(refname:short)%00%(objectname)", "refs/heads"], input.mainCheckout);
  if (branches.code === 0)
    for (const line of branches.stdout.split("\n")) {
      const [branch, sha] = line.split("\0");
      if (!branch || !sha || kept.has(branch) || worktreeBranches.has(branch)) continue;
      if (!mergedIn(input.mainCheckout, sha, targets)) continue;
      acted++;
      if (input.dryRun) options.log(`Would delete the local branch ${branch}: it is merged.`);
      else deleteBranch(branch, sha, input, options.log);
    }

  acted += expireArchives(input, options);

  if (!input.dryRun) git(["worktree", "prune"], input.mainCheckout);
  return acted;
}

const ARCHIVE_PREFIX = "refs/archive/worktrees/";

function expireArchives(input: { mainCheckout: string; config: AstackConfig; dryRun: boolean }, options: { log: Log; now: number }): number {
  const days = input.config.reaper.archiveDays;
  const listed = git(["for-each-ref", "--format=%(refname)", ARCHIVE_PREFIX], input.mainCheckout);
  if (listed.code !== 0) return 0;
  let acted = 0;
  for (const ref of listed.stdout.split("\n").filter(Boolean)) {
    const savedOn = Date.parse(`${ref.slice(ARCHIVE_PREFIX.length).split("/")[0]}T00:00:00Z`);
    if (Number.isNaN(savedOn) || options.now - savedOn <= (days + 1) * 86_400_000) continue;
    acted++;
    if (input.dryRun) {
      options.log(`Would delete the archive ${ref}: it is older than ${days} days.`);
      continue;
    }
    const deleted = git(["update-ref", "-d", ref], input.mainCheckout);
    options.log(deleted.code === 0 ? `Deleted the archive ${ref}: it is older than ${days} days.` : `Kept the archive ${ref}: ${deleted.stderr.trim().split("\n")[0]}`);
  }
  return acted;
}

function archiveRef(worktree: string, mainCheckout: string, now: number): string {
  const base = `${ARCHIVE_PREFIX}${new Date(now).toISOString().slice(0, 10)}/${path.basename(worktree)}`;
  let ref = base;
  for (let n = 2; git(["rev-parse", "--verify", "-q", ref], mainCheckout).code === 0; n++) ref = `${base}-${n}`;
  return ref;
}

const ARCHIVE_IDENTITY = {
  GIT_AUTHOR_NAME: "astack reaper",
  GIT_AUTHOR_EMAIL: "astack-reaper@localhost",
  GIT_COMMITTER_NAME: "astack reaper",
  GIT_COMMITTER_EMAIL: "astack-reaper@localhost",
};

function archiveUncommitted(worktree: string, ref: string): string | null {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "astack-archive-"));
  try {
    const env = { ...process.env, ...ARCHIVE_IDENTITY, GIT_INDEX_FILE: path.join(scratch, "index") };
    for (const args of [["read-tree", "HEAD"], ["add", "-A"]]) {
      const step = git(args, worktree, env);
      if (step.code !== 0) return step.stderr.trim().split("\n")[0] || `git ${args[0]} failed`;
    }
    const tree = git(["write-tree"], worktree, env);
    if (tree.code !== 0) return tree.stderr.trim().split("\n")[0] || "git write-tree failed";
    const message = `Uncommitted files from ${worktree}, saved by the astack reaper before it removed the worktree`;
    const commit = git(["commit-tree", tree.stdout.trim(), "-p", "HEAD", "-m", message], worktree, env);
    if (commit.code !== 0) return commit.stderr.trim().split("\n")[0] || "git commit-tree failed";
    const saved = git(["update-ref", ref, commit.stdout.trim(), ""], worktree);
    if (saved.code !== 0) return saved.stderr.trim().split("\n")[0] || "git update-ref failed";
    return null;
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

function deleteBranch(branch: string, sha: string, input: { mainCheckout: string; config: AstackConfig }, log: Log): void {
  if (longLivedBranches(input.config).has(branch)) return;
  const current = git(["rev-parse", "--verify", "-q", `refs/heads/${branch}`], input.mainCheckout);
  if (current.code !== 0 || current.stdout.trim() !== sha) return;
  const deleted = git(["branch", "-D", branch], input.mainCheckout);
  log(deleted.code === 0 ? `Deleted the local branch ${branch}: it is merged.` : `Kept the local branch ${branch}: ${deleted.stderr.trim().split("\n")[0]}`);
}
