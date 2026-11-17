import * as fs from "node:fs";
import { AstackError, git, main, readConfig, resolveCheckout, run, type AstackConfig, type RunResult } from "./lib.ts";

export const STALE_DAYS = 30;
const SWEEP_REFS = "refs/astack/sweep";

export function longLivedBranches(config: AstackConfig): Set<string> {
  return new Set([config.branches.integration, config.branches.release, config.evidence.branch]);
}

export function deleteBranchArgs(config: AstackConfig, branch: string, sha: string): string[] {
  if (longLivedBranches(config).has(branch)) throw new AstackError(`${branch} is a long-lived branch. Astack never deletes it.`);
  return ["push", "--quiet", `--force-with-lease=refs/heads/${branch}:${sha}`, "origin", `:refs/heads/${branch}`];
}

export type RemoteBranch = { name: string; sha: string; committedAt: string; contained: boolean };
export type MergedHead = { number: number; branch: string; sha: string };
export type SweepPlan = {
  delete: { branch: string; sha: string; reason: string }[];
  stale: { branch: string; days: number }[];
};

export function planSweep(input: {
  branches: RemoteBranch[];
  kept: Set<string>;
  openHeads: Set<string>;
  mergedHeads: MergedHead[];
  now: Date;
  staleDays?: number;
}): SweepPlan {
  const plan: SweepPlan = { delete: [], stale: [] };
  const staleDays = input.staleDays ?? STALE_DAYS;
  for (const branch of [...input.branches].sort((a, b) => a.name.localeCompare(b.name))) {
    if (input.kept.has(branch.name) || input.openHeads.has(branch.name)) continue;
    const merged = input.mergedHeads.find((head) => head.branch === branch.name && head.sha === branch.sha);
    if (merged) plan.delete.push({ branch: branch.name, sha: branch.sha, reason: `PR #${merged.number} merged it` });
    else if (branch.contained) plan.delete.push({ branch: branch.name, sha: branch.sha, reason: "all its commits are already merged" });
    else {
      const days = Math.floor((input.now.getTime() - Date.parse(branch.committedAt)) / 86_400_000);
      if (days >= staleDays) plan.stale.push({ branch: branch.name, days });
    }
  }
  return plan;
}

function must(result: RunResult, what: string): string {
  if (result.code !== 0) throw new AstackError(`${what} failed:\n${result.stderr.trim()}`);
  return result.stdout;
}

function readRemote(repoDir: string, config: AstackConfig): RemoteBranch[] {
  if (must(git(["rev-parse", "--is-shallow-repository"], repoDir), "git rev-parse").trim() === "true")
    throw new AstackError("This checkout is shallow, so merged branches cannot be told apart. Fetch the full history first.");
  must(git(["fetch", "--no-tags", "--quiet", "--prune", "origin", `+refs/heads/*:${SWEEP_REFS}/*`], repoDir), "git fetch origin");
  const listed = must(git(["for-each-ref", "--format=%(refname)%09%(objectname)%09%(committerdate:iso-strict)", SWEEP_REFS], repoDir), "git for-each-ref");
  const targets = [config.branches.integration, config.branches.release].map((name) => `${SWEEP_REFS}/${name}`);
  return listed
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [ref, sha, committedAt] = line.split("\t") as [string, string, string];
      const contained = targets.some((target) => git(["merge-base", "--is-ancestor", sha, target], repoDir).code === 0);
      return { name: ref.slice(SWEEP_REFS.length + 1), sha, committedAt, contained };
    });
}

function clearRefs(repoDir: string): void {
  const refs = git(["for-each-ref", "--format=%(refname)", SWEEP_REFS], repoDir).stdout.split("\n").filter(Boolean);
  if (refs.length > 0) run("git", ["update-ref", "--stdin"], { cwd: repoDir, input: refs.map((ref) => `delete ${ref}\n`).join("") });
}

type ListedPullRequest = { number: number; headRefName: string; headRefOid: string; isCrossRepository: boolean };
export type SweepDeps = { gh: (args: string[], cwd: string) => RunResult; log: (line: string) => void };

export function sweep(input: { repoDir: string; config: AstackConfig; dryRun: boolean; now: Date }, deps: SweepDeps): SweepPlan {
  const pullRequests = (state: "open" | "merged"): ListedPullRequest[] => {
    const args = ["pr", "list", "--state", state, "--limit", "1000", "--json", "number,headRefName,headRefOid,isCrossRepository"];
    return JSON.parse(must(deps.gh(args, input.repoDir), `gh pr list --state ${state}`));
  };
  try {
    const own = (prs: ListedPullRequest[]) => prs.filter((pr) => !pr.isCrossRepository);
    const plan = planSweep({
      branches: readRemote(input.repoDir, input.config),
      kept: longLivedBranches(input.config),
      openHeads: new Set(own(pullRequests("open")).map((pr) => pr.headRefName)),
      mergedHeads: own(pullRequests("merged")).map((pr) => ({ number: pr.number, branch: pr.headRefName, sha: pr.headRefOid })),
      now: input.now,
    });
    for (const item of plan.delete) {
      if (input.dryRun) {
        deps.log(`Would delete ${item.branch}: ${item.reason}.`);
        continue;
      }
      const result = git(deleteBranchArgs(input.config, item.branch, item.sha), input.repoDir);
      deps.log(result.code === 0 ? `Deleted ${item.branch}: ${item.reason}.` : `Kept ${item.branch}: it moved since the sweep looked.`);
    }
    if (plan.delete.length === 0) deps.log("No merged branches to delete.");
    for (const item of plan.stale) deps.log(`Stale: ${item.branch} has unmerged commits and no open PR, last commit ${item.days} days ago.`);
    return plan;
  } finally {
    clearRefs(input.repoDir);
  }
}

function summary(plan: SweepPlan, dryRun: boolean): string {
  const lines = ["## Branch sweep", ""];
  lines.push(plan.delete.length === 0 ? "No merged branches to delete." : `${dryRun ? "Would delete" : "Deleted"}:`);
  for (const item of plan.delete) lines.push(`- \`${item.branch}\`: ${item.reason}`);
  if (plan.stale.length > 0) {
    lines.push("", `Stale, with unmerged commits and no open PR. Delete or finish these by hand:`);
    for (const item of plan.stale) lines.push(`- \`${item.branch}\`: last commit ${item.days} days ago`);
  }
  return `${lines.join("\n")}\n`;
}

if (import.meta.main)
  await main(async () => {
    const argv = process.argv.slice(2);
    if (argv.some((arg) => arg !== "--dry-run")) throw new AstackError("Usage: bun scripts/astack/sweep.ts [--dry-run]");
    const dryRun = argv.includes("--dry-run");
    const repoDir = resolveCheckout(process.cwd()).worktree;
    const plan = sweep(
      { repoDir, config: readConfig(repoDir), dryRun, now: new Date() },
      { gh: (args, cwd) => run("gh", args, { cwd }), log: (line) => console.log(line) },
    );
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary(plan, dryRun));
    return 0;
  });
