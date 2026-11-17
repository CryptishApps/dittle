import * as fs from "node:fs";
import { AstackError, git, main, readConfig, resolveCheckout } from "./lib.ts";

export type IntegrationRun = { id: number; headSha: string; treeSha: string; url: string };

export type ProvenSource = {
  runs(): Promise<IntegrationRun[]>;
  jobPassed(runId: number, jobName: string): Promise<boolean>;
};

export type GithubGet = (path: string) => Promise<unknown>;

export async function findProvenRun(treeSha: string, jobName: string, source: ProvenSource): Promise<IntegrationRun | null> {
  for (const run of await source.runs()) {
    if (run.treeSha !== treeSha) continue;
    if (await source.jobPassed(run.id, jobName)) return run;
  }
  return null;
}

export async function findNewestProvenRun(
  jobName: string,
  source: ProvenSource,
  commitsBehindTip: (sha: string) => number | null,
): Promise<IntegrationRun | null> {
  const candidates = (await source.runs())
    .map((run, order) => ({ run, order, behind: commitsBehindTip(run.headSha) }))
    .filter((candidate): candidate is { run: IntegrationRun; order: number; behind: number } => candidate.behind !== null)
    .sort((a, b) => a.behind - b.behind || a.order - b.order);
  for (const { run } of candidates) if (await source.jobPassed(run.id, jobName)) return run;
  return null;
}

export function provenSource(get: GithubGet, input: { workflow: string; branch: string; successfulOnly?: boolean }): ProvenSource {
  return {
    async runs() {
      const status = input.successfulOnly ? "&status=success" : "";
      const body = (await get(
        `/actions/workflows/${encodeURIComponent(input.workflow)}/runs?branch=${encodeURIComponent(input.branch)}${status}&per_page=50`,
      )) as { workflow_runs: { id: number; head_sha: string; html_url: string; head_commit: { tree_id: string } | null }[] };
      return body.workflow_runs
        .filter((run) => run.head_commit)
        .map((run) => ({ id: run.id, headSha: run.head_sha, treeSha: run.head_commit!.tree_id, url: run.html_url }));
    },
    async jobPassed(runId, jobName) {
      const body = (await get(`/actions/runs/${runId}/jobs?per_page=100`)) as { jobs: { name: string; conclusion: string | null }[] };
      return body.jobs.some((job) => job.name === jobName && job.conclusion === "success");
    },
  };
}

export function githubSource(input: { apiUrl: string; repository: string; token: string; workflow: string; branch: string }): ProvenSource {
  const get: GithubGet = async (path) => {
    const response = await fetch(`${input.apiUrl}/repos/${input.repository}${path}`, {
      headers: { Authorization: `Bearer ${input.token}`, Accept: "application/vnd.github+json" },
    });
    if (!response.ok) throw new AstackError(`GitHub API ${path} answered ${response.status}.`);
    return response.json();
  };
  return provenSource(get, input);
}

function option(argv: string[], name: string): string {
  const index = argv.indexOf(name);
  const value = index >= 0 ? argv[index + 1] : undefined;
  if (!value) throw new AstackError(`Pass ${name} <value>.`);
  return value;
}

if (import.meta.main)
  await main(async () => {
    const argv = process.argv.slice(2);
    const workflow = option(argv, "--workflow");
    const jobName = option(argv, "--job");
    const repoDir = resolveCheckout(process.cwd()).worktree;
    const { integration: branch, release } = readConfig(repoDir).branches;
    if (branch === release) {
      console.log("This project has no integration branch, so the full check runs.");
      return 0;
    }
    const tree = git(["rev-parse", "HEAD^{tree}"], repoDir);
    if (tree.code !== 0) throw new AstackError(`Could not read this commit's tree.\n${tree.stderr.trim()}`);
    const { GITHUB_API_URL, GITHUB_REPOSITORY, GITHUB_TOKEN, GITHUB_OUTPUT } = process.env;
    if (!GITHUB_API_URL || !GITHUB_REPOSITORY || !GITHUB_TOKEN || !GITHUB_OUTPUT)
      throw new AstackError("Run this in GitHub Actions with GITHUB_TOKEN set.");

    let run: IntegrationRun | null = null;
    try {
      const source = githubSource({ apiUrl: GITHUB_API_URL, repository: GITHUB_REPOSITORY, token: GITHUB_TOKEN, workflow, branch });
      run = await findProvenRun(tree.stdout.trim(), jobName, source);
    } catch (error) {
      console.log(`::warning title=Full check runs::Could not look up ${branch} runs, so the full check runs. ${error instanceof Error ? error.message : String(error)}`);
      return 0;
    }
    if (!run) {
      console.log(`No passed ${jobName} job on ${branch} has exactly this code, so the full check runs.`);
      return 0;
    }
    fs.appendFileSync(GITHUB_OUTPUT, `sha=${run.headSha}\nrun=${run.id}\n`);
    console.log(`${branch} commit ${run.headSha} has exactly this code and passed ${jobName} in run ${run.id}, so the full check is skipped.`);
    return 0;
  });
