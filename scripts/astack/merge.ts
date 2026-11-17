import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { syncEnvFiles } from "./envfiles.ts";
import { AstackError, interpolate, main, readConfig, requireOrigin, resolveCheckout, run, type AstackConfig, type RunResult } from "./lib.ts";
import { deleteBranchArgs, longLivedBranches } from "./sweep.ts";

export type PullRequest = {
  number: number;
  title: string;
  headRefOid: string;
  headRefName: string;
  isCrossRepository: boolean;
  baseRefName: string;
  createdAt: string;
  labels: { name: string }[];
};

export type MergeReport = {
  merged: number[];
  skipped: { pr: number; reason: string }[];
  checks: "pass" | "fail" | "skipped";
  pushed: boolean;
  deploy: "ok" | "failed" | "skipped";
  deployOutput: string;
  deleted: string[];
};

export type MergeDeps = {
  run: (command: string, args: string[], cwd: string) => RunResult;
  shell: (command: string, cwd: string) => number;
  capture: (command: string, cwd: string) => Promise<{ code: number; output: string }>;
  makeTempDir: () => string;
  log: (line: string) => void;
  wait: (ms: number) => void;
};

export const PR_FIELDS = "number,title,headRefOid,headRefName,isCrossRepository,baseRefName,createdAt,labels";
const MERGED_CHECKS = 10;
const MERGED_CHECK_MS = 3000;
const DEPLOY_OUTPUT_LINES = 20;

export function pickPullRequests(prs: PullRequest[], options: { label: string; integration: string; max: number }): PullRequest[] {
  return prs
    .filter((pr) => pr.baseRefName === options.integration && pr.labels.some((label) => label.name === options.label))
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.number - b.number)
    .slice(0, options.max);
}

export function mergeMessage(pr: Pick<PullRequest, "number" | "title">): string {
  return `Merge PR #${pr.number}: ${pr.title}`;
}

export function skipComment(reason: string, integration: string, label: string): string {
  return `Not merged this time: ${reason}. Removed \`${label}\`. Update the branch from \`${integration}\`, fix the problem, and push; the new head needs a fresh review before it gets the label again.`;
}

export async function merge(
  input: { mainCheckout: string; config: AstackConfig; dryRun: boolean; max?: number },
  deps: MergeDeps,
): Promise<MergeReport> {
  const { integration } = input.config.branches;
  const { label } = input.config.merge;
  const report: MergeReport = { merged: [], skipped: [], checks: "skipped", pushed: false, deploy: "skipped", deployOutput: "", deleted: [] };
  const git = (args: string[], cwd = input.mainCheckout) => deps.run("git", args, cwd);
  const must = (result: RunResult, what: string) => {
    if (result.code !== 0) throw new AstackError(`${what} failed:\n${result.stderr.trim()}`);
    return result.stdout;
  };

  requireOrigin(git, [...new Set([input.config.branches.release, integration])]);
  must(git(["fetch", "--no-tags", "--quiet", "origin", integration]), `git fetch origin ${integration}`);
  const listed = must(
    deps.run("gh", ["pr", "list", "--state", "open", "--base", integration, "--label", label, "--limit", "200", "--json", PR_FIELDS], input.mainCheckout),
    "gh pr list",
  );
  const picked = pickPullRequests(JSON.parse(listed) as PullRequest[], { label, integration, max: input.max ?? input.config.merge.maxPRs });
  if (picked.length === 0) {
    deps.log(`No open PRs into ${integration} have the ${label} label.`);
    return report;
  }
  deps.log(`Merging ${picked.length} PR(s) into ${integration}: ${picked.map((pr) => `#${pr.number}`).join(", ")}`);

  const temp = deps.makeTempDir();
  const worktree = path.join(temp, "merge");
  must(git(["worktree", "add", "--detach", worktree, `origin/${integration}`]), "git worktree add");
  try {
    for (const pr of picked) {
      const ref = `refs/astack/merge/${pr.number}`;
      if (git(["fetch", "--no-tags", "--quiet", "origin", `+refs/pull/${pr.number}/head:${ref}`]).code !== 0) {
        report.skipped.push({ pr: pr.number, reason: "its branch could not be fetched" });
        continue;
      }
      const fetched = git(["rev-parse", ref]).stdout.trim();
      git(["update-ref", "-d", ref]);
      if (fetched !== pr.headRefOid) {
        report.skipped.push({ pr: pr.number, reason: "new commits arrived while merging" });
        continue;
      }
      const merged = git(["merge", "--no-ff", "--no-edit", "-m", mergeMessage(pr), pr.headRefOid], worktree);
      if (merged.code !== 0) {
        git(["merge", "--abort"], worktree);
        report.skipped.push({ pr: pr.number, reason: `it conflicts with ${integration} or an earlier PR in this merge` });
        continue;
      }
      report.merged.push(pr.number);
      deps.log(`Merged #${pr.number}: ${pr.title}`);
    }
    for (const skip of report.skipped) deps.log(`Skipped #${skip.pr}: ${skip.reason}.`);

    if (report.merged.length > 0 && !input.dryRun) {
      if (input.config.checks.merge) {
        for (const result of syncEnvFiles({ mainCheckout: input.mainCheckout, worktree, envFiles: input.config.envFiles }))
          if (result.action === "missing") deps.log(`Note: ${result.path} is missing in the main checkout, so checks run without it.`);
        const steps = [input.config.install, input.config.checks.merge].filter((step): step is string => Boolean(step));
        report.checks = "pass";
        for (const step of steps) {
          deps.log(`Running: ${step}`);
          if (deps.shell(step, worktree) !== 0) {
            report.checks = "fail";
            deps.log(`Failed: ${step}. Nothing was pushed.`);
            break;
          }
        }
      } else {
        deps.log(`No checks.merge command: ${integration} CI is the gate.`);
      }
      if (report.checks !== "fail") {
        const push = git(["push", "origin", `HEAD:refs/heads/${integration}`], worktree);
        report.pushed = push.code === 0;
        deps.log(
          report.pushed
            ? `Pushed to origin/${integration}. GitHub marks the merged PRs as merged.`
            : `Push to origin/${integration} failed, probably because it moved. Run merge again.\n${push.stderr.trim()}`,
        );
        if (report.pushed) {
          await deployIntegration(report, worktree, input, deps);
          report.deleted = deleteMergedBranches(picked.filter((pr) => report.merged.includes(pr.number)), input, deps);
        }
      }
    }

    if (!input.dryRun)
      for (const skip of report.skipped) {
        deps.run("gh", ["pr", "comment", String(skip.pr), "--body", skipComment(skip.reason, integration, label)], input.mainCheckout);
        deps.run("gh", ["pr", "edit", String(skip.pr), "--remove-label", label], input.mainCheckout);
      }
  } finally {
    git(["worktree", "remove", "--force", worktree]);
    fs.rmSync(temp, { recursive: true, force: true });
    git(["worktree", "prune"]);
  }
  return report;
}

async function deployIntegration(report: MergeReport, worktree: string, input: { mainCheckout: string; config: AstackConfig }, deps: MergeDeps) {
  const template = input.config.merge.deploy;
  if (!template) return;
  const command = interpolate(template, { MAIN_CHECKOUT: input.mainCheckout, WORKTREE: worktree }, "merge.deploy");
  deps.log(`Deploying ${input.config.branches.integration}: ${command}`);
  const result = await deps.capture(command, worktree);
  report.deploy = result.code === 0 ? "ok" : "failed";
  report.deployOutput = result.output.trimEnd().split("\n").slice(-DEPLOY_OUTPUT_LINES).join("\n");
  deps.log(
    report.deploy === "ok"
      ? `Deployed ${input.config.branches.integration}.`
      : `The deploy failed. The push stands; ${input.config.branches.integration} CI deploys again after its checks.`,
  );
}

type RemoteHead = { kind: "gone" } | { kind: "unknown" } | { kind: "at"; sha: string };

function remoteHead(branch: string, cwd: string, deps: MergeDeps): RemoteHead {
  const ref = `refs/heads/${branch}`;
  const listed = deps.run("git", ["ls-remote", "origin", ref], cwd);
  if (listed.code !== 0) return { kind: "unknown" };
  const line = listed.stdout.split("\n").find((item) => item.endsWith(`\t${ref}`));
  return line ? { kind: "at", sha: line.split("\t")[0]! } : { kind: "gone" };
}

function deleteMergedBranches(mergedPrs: PullRequest[], input: { mainCheckout: string; config: AstackConfig }, deps: MergeDeps): string[] {
  const kept = longLivedBranches(input.config);
  const deleted: string[] = [];
  for (const pr of mergedPrs) {
    if (pr.isCrossRepository || kept.has(pr.headRefName)) continue;
    let merged = false;
    for (let check = 0; check < MERGED_CHECKS && !merged; check++) {
      if (check > 0) deps.wait(MERGED_CHECK_MS);
      const state = deps.run("gh", ["pr", "view", String(pr.number), "--json", "state", "--jq", ".state"], input.mainCheckout);
      merged = state.code === 0 && state.stdout.trim() === "MERGED";
    }
    if (!merged) {
      deps.log(`GitHub has not marked #${pr.number} merged yet, so ${pr.headRefName} stays for the weekly sweep.`);
      continue;
    }
    const remote = remoteHead(pr.headRefName, input.mainCheckout, deps);
    if (remote.kind === "gone") {
      deps.log(`GitHub already deleted ${pr.headRefName}.`);
      continue;
    }
    const moved = remote.kind === "at" && remote.sha !== pr.headRefOid;
    if (!moved && deps.run("git", deleteBranchArgs(input.config, pr.headRefName, pr.headRefOid), input.mainCheckout).code === 0)
      deleted.push(pr.headRefName);
    else deps.log(`Kept ${pr.headRefName}: it has commits pushed after #${pr.number} merged.`);
  }
  if (deleted.length > 0) deps.log(`Deleted the merged branches: ${deleted.join(", ")}.`);
  return deleted;
}

function parseArgs(argv: string[]): { dryRun: boolean; max?: number } {
  let dryRun = false;
  let max: number | undefined;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dry-run") dryRun = true;
    else if (argv[i] === "--max") {
      max = Number(argv[++i]);
      if (!Number.isInteger(max) || max < 1) throw new AstackError("--max needs a whole number of at least 1.");
    } else throw new AstackError("Usage: bun scripts/astack/merge.ts [--dry-run] [--max N]");
  }
  return { dryRun, max };
}

async function captureToStderr(command: string, cwd: string): Promise<{ code: number; output: string }> {
  const child = Bun.spawn(["/bin/sh", "-c", `exec 2>&1; ${command}`], { cwd, stdin: "ignore", stdout: "pipe" });
  let output = "";
  const decoder = new TextDecoder();
  for await (const chunk of child.stdout) {
    process.stderr.write(chunk);
    output += decoder.decode(chunk, { stream: true });
  }
  return { code: await child.exited, output: output + decoder.decode() };
}

export function mergeCheckout(cwd: string): { mainCheckout: string; config: AstackConfig } {
  const { worktree, mainCheckout } = resolveCheckout(cwd);
  return { mainCheckout, config: readConfig(worktree, path.basename(mainCheckout)) };
}

if (import.meta.main)
  await main(async () => {
    const args = parseArgs(process.argv.slice(2));
    const { mainCheckout, config } = mergeCheckout(process.cwd());
    const report = await merge(
      { mainCheckout, config, dryRun: args.dryRun, max: args.max },
      {
        run: (command, commandArgs, cwd) => run(command, commandArgs, { cwd }),
        shell: (command, cwd) => spawnSync("/bin/sh", ["-c", command], { cwd, stdio: ["ignore", 2, 2] }).status ?? 1,
        capture: captureToStderr,
        makeTempDir: () => fs.mkdtempSync(path.join(os.tmpdir(), "astack-merge-")),
        log: (line) => console.error(line),
        wait: (ms) => Bun.sleepSync(ms),
      },
    );
    console.log(JSON.stringify(report));
    return report.checks === "fail" || (report.merged.length > 0 && !args.dryRun && !report.pushed) ? 1 : 0;
  });
