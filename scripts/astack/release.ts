import { AstackError, main, readConfig, requireOrigin, resolveCheckout, run, type AstackConfig, type RunResult } from "./lib.ts";
import { findNewestProvenRun, provenSource, type IntegrationRun } from "./proven.ts";

export const INTEGRATION_WORKFLOW = "integration.yml";
export const PROVING_JOB = "verify";

export type ReleaseDeps = { run: (command: string, args: string[], cwd: string) => RunResult; log: (line: string) => void };
export type ReleaseReport = {
  branch: string | null;
  url: string | null;
  sha: string | null;
  provenBy: { id: number; url: string } | null;
  changes: string[];
  waiting: string[];
};

const NOTHING: ReleaseReport = { branch: null, url: null, sha: null, provenBy: null, changes: [], waiting: [] };

export function releaseBranchName(date: Date, taken: Set<string>): string {
  const base = `release/${date.toISOString().slice(0, 10)}`;
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

export function releaseBody(input: {
  integration: string;
  release: string;
  branch: string;
  sha: string;
  provenBy: { id: number; url: string } | null;
  changes: string[];
}): string {
  const proof = input.provenBy
    ? `Integration run [${input.provenBy.id}](${input.provenBy.url}) passed \`${PROVING_JOB}\` on this commit, so the Release workflow skips the full check.`
    : `No Integration run had passed on this commit when the PR opened, so the Release workflow runs the full check.`;
  return [
    `Releases \`${input.integration}\` at ${input.sha} into \`${input.release}\`.`,
    "",
    proof,
    "",
    ...(input.changes.length > 0 ? input.changes.map((change) => `- ${change}`) : ["- No merge commits; see the commit list."]),
    "",
    `Merge with a merge commit, never squash, so \`${input.integration}\` and \`${input.release}\` keep one history.`,
    `\`${input.branch}\` is a copy of \`${input.integration}\` made for this PR. GitHub deletes the copy after the merge; \`${input.integration}\` stays.`,
  ].join("\n");
}

export async function openRelease(
  input: { repoDir: string; config: AstackConfig; dryRun: boolean; tip: boolean; now: Date },
  deps: ReleaseDeps,
): Promise<ReleaseReport> {
  const { integration, release } = input.config.branches;
  if (integration === release) {
    deps.log(`This project has no integration branch, so there are no release PRs. Merging into ${release} deploys production.`);
    return NOTHING;
  }
  const git = (args: string[]) => deps.run("git", args, input.repoDir);
  const must = (result: RunResult, what: string) => {
    if (result.code !== 0) throw new AstackError(`${what} failed:\n${result.stderr.trim()}`);
    return result.stdout.trim();
  };
  const merges = (range: string) =>
    must(git(["log", "--first-parent", "--merges", "--format=%s", range]), "git log")
      .split("\n")
      .filter(Boolean);

  requireOrigin(git, [release, integration]);
  must(git(["fetch", "--no-tags", "--quiet", "origin", integration, release]), `git fetch origin ${integration} ${release}`);
  const tip = must(git(["rev-parse", `origin/${integration}`]), "git rev-parse");
  const released = (sha: string) => git(["merge-base", "--is-ancestor", sha, `origin/${release}`]).code === 0;
  if (released(tip)) {
    deps.log(`${release} already has everything on ${integration}. Nothing to release.`);
    return NOTHING;
  }

  let sha = tip;
  let provenBy: IntegrationRun | null = null;
  if (input.tip) deps.log(`--tip: releasing the tip of ${integration}, ${tip.slice(0, 12)}, whether or not an Integration run passed on it.`);
  else {
    provenBy = await newestProvenRun(input, tip, deps);
    if (provenBy) sha = provenBy.headSha;
    else
      deps.log(
        `No Integration run on ${integration} has passed ${PROVING_JOB} yet, so this releases the tip, ${tip.slice(0, 12)}. The Release workflow runs the full check on it.`,
      );
  }
  const waiting = sha === tip ? [] : merges(`${sha}..${tip}`);
  if (provenBy) {
    deps.log(`Newest proven commit on ${integration}: ${sha.slice(0, 12)}, proven by Integration run ${provenBy.id} (${provenBy.url}).`);
    if (waiting.length > 0) deps.log(`Not in this release, still waiting for a passing run: ${waiting.length} change(s):\n${waiting.map((c) => `  - ${c}`).join("\n")}`);
    if (released(sha)) {
      deps.log(`${release} already has ${sha.slice(0, 12)}. Nothing proven to release yet; run again once a newer Integration run passes, or pass --tip.`);
      return { ...NOTHING, sha, provenBy: { id: provenBy.id, url: provenBy.url }, waiting };
    }
  }
  const proof = provenBy ? { id: provenBy.id, url: provenBy.url } : null;

  const open = JSON.parse(
    must(deps.run("gh", ["pr", "list", "--state", "open", "--base", release, "--json", "number,url,headRefName"], input.repoDir), "gh pr list"),
  ) as { number: number; url: string; headRefName: string }[];
  const existing = open.find((pr) => pr.headRefName === integration || pr.headRefName.startsWith("release/"));
  if (existing) {
    deps.log(`Release PR #${existing.number} is already open: ${existing.url}`);
    return { ...NOTHING, branch: existing.headRefName, url: existing.url };
  }

  const changes = merges(`origin/${release}..${sha}`);
  const taken = new Set(
    must(git(["ls-remote", "--heads", "origin", "release/*"]), "git ls-remote")
      .split("\n")
      .filter(Boolean)
      .map((line) => line.split("\t")[1]!.replace("refs/heads/", "")),
  );
  const branch = releaseBranchName(input.now, taken);
  deps.log(
    `Release ${sha.slice(0, 12)} from ${integration} as ${branch}, with ${changes.length} merged change(s):\n${changes.map((c) => `  - ${c}`).join("\n")}`,
  );
  if (input.dryRun) return { branch, url: null, sha, provenBy: proof, changes, waiting };

  must(git(["push", "--quiet", "origin", `${sha}:refs/heads/${branch}`]), `git push origin ${branch}`);
  const title = `Release ${input.now.toISOString().slice(0, 10)}: ${changes.length} change(s) from ${integration}`;
  const body = releaseBody({ integration, release, branch, sha, provenBy: proof, changes });
  const url = must(deps.run("gh", ["pr", "create", "--base", release, "--head", branch, "--title", title, "--body", body], input.repoDir), "gh pr create");
  deps.log(`Opened ${url}`);
  return { branch, url, sha, provenBy: proof, changes, waiting };
}

async function newestProvenRun(input: { repoDir: string; config: AstackConfig }, tip: string, deps: ReleaseDeps): Promise<IntegrationRun | null> {
  const branch = input.config.branches.integration;
  const source = provenSource(
    async (path) => {
      const result = deps.run("gh", ["api", `repos/{owner}/{repo}${path}`], input.repoDir);
      if (result.code !== 0)
        throw new AstackError(`Could not read ${branch}'s Integration runs with gh api:\n${result.stderr.trim()}\nFix gh, or pass --tip to release the tip without that check.`);
      return JSON.parse(result.stdout);
    },
    { workflow: INTEGRATION_WORKFLOW, branch, successfulOnly: true },
  );
  return findNewestProvenRun(PROVING_JOB, source, (sha) => {
    if (deps.run("git", ["merge-base", "--is-ancestor", sha, tip], input.repoDir).code !== 0) return null;
    const behind = deps.run("git", ["rev-list", "--count", `${sha}..${tip}`], input.repoDir);
    return behind.code === 0 ? Number(behind.stdout.trim()) : null;
  });
}

const USAGE = "Usage: bun scripts/astack/release.ts [--dry-run] [--tip]";

if (import.meta.main)
  await main(async () => {
    const argv = process.argv.slice(2);
    if (argv.some((arg) => arg !== "--dry-run" && arg !== "--tip")) throw new AstackError(USAGE);
    const repoDir = resolveCheckout(process.cwd()).worktree;
    const report = await openRelease(
      { repoDir, config: readConfig(repoDir), dryRun: argv.includes("--dry-run"), tip: argv.includes("--tip"), now: new Date() },
      { run: (command, args, cwd) => run(command, args, { cwd }), log: (line) => console.error(line) },
    );
    console.log(JSON.stringify(report));
    return 0;
  });
