import * as fs from "node:fs";
import * as path from "node:path";
import { AstackError, gitOut, main, readConfig, resolveCheckout, shellQuote, workspacesWithScript, type WorkspacePackage } from "./lib.ts";

export type TestJob = { job: string; key: string; workspace: string; command: string };

const cacheKey = (value: string) => value.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");

function usesVitest(workspace: WorkspacePackage): boolean {
  return Boolean(workspace.manifest.dependencies?.vitest ?? workspace.manifest.devDependencies?.vitest);
}

export function testJobs(workspaces: WorkspacePackage[], shards: Record<string, number>): TestJob[] {
  const names = new Set(workspaces.map((workspace) => workspace.name));
  const unknown = Object.keys(shards).filter((name) => !names.has(name));
  if (unknown.length > 0)
    throw new AstackError(`ci.testShards names ${unknown.join(", ")}, which is not a workspace CI tests. Check the name and its test script.`);
  const jobs: TestJob[] = [];
  for (const workspace of [...workspaces].sort((a, b) => a.name.localeCompare(b.name))) {
    const count = shards[workspace.name] ?? 1;
    if (count === 1) {
      jobs.push({ job: workspace.name, key: cacheKey(workspace.name), workspace: workspace.name, command: `bunx turbo test ${shellQuote(`--filter=${workspace.name}`)}` });
      continue;
    }
    if (!usesVitest(workspace)) throw new AstackError(`ci.testShards splits ${workspace.name}, but only Vitest suites can be sharded and it has no vitest dependency.`);
    for (let index = 1; index <= count; index++)
      jobs.push({
        job: `${workspace.name} ${index}/${count}`,
        key: `${cacheKey(workspace.name)}-${index}-of-${count}`,
        workspace: workspace.name,
        command: `cd ${shellQuote(workspace.dir)} && bunx vitest run --shard=${index}/${count}`,
      });
  }
  return jobs;
}

export function testMatrix(jobs: TestJob[]): { include: TestJob[] } {
  return { include: jobs.length > 0 ? jobs : [{ job: "none", key: "none", workspace: "", command: "" }] };
}

if (import.meta.main)
  await main(() => {
    const root = resolveCheckout(process.cwd()).worktree;
    const { ci } = readConfig(root);
    if (!fs.existsSync(path.join(root, "package.json"))) throw new AstackError(`No package.json in ${root}.`);
    const tracked = gitOut(["ls-files"], root).split("\n").filter(Boolean);
    const jobs = testJobs(workspacesWithScript(root, tracked, "test", ci.testExclude), ci.testShards);
    for (const job of jobs) console.error(`tests (${job.job}): ${job.command}`);
    if (jobs.length === 0) console.error("No workspace defines a test script.");
    console.log(`test=${JSON.stringify(testMatrix(jobs))}`);
  });
