import * as fs from "node:fs";
import * as path from "node:path";
import { AstackError, gitOut, main, readConfig, resolveCheckout, shellQuote, workspacesWithScript } from "./lib.ts";

export type Workspace = { name: string; dir: string; weight: number };
export type TypecheckGroup = { group: string; workspaces: string; filters: string };

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts"]);

export function typecheckWorkspaces(root: string, trackedFiles: string[], exclude: string[]): Workspace[] {
  return workspacesWithScript(root, trackedFiles, "typecheck", exclude).map(({ name, dir }) => ({
    name,
    dir,
    weight: trackedFiles.filter((file) => file.startsWith(`${dir}/`) && SOURCE_EXTENSIONS.has(path.posix.extname(file))).length,
  }));
}

export function groupWorkspaces(workspaces: Workspace[], jobs: number): Workspace[][] {
  const heaviestFirst = [...workspaces].sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name));
  const groups: { total: number; members: Workspace[] }[] = Array.from({ length: Math.min(jobs, workspaces.length) }, () => ({ total: 0, members: [] }));
  for (const workspace of heaviestFirst) {
    const lightest = groups.reduce((best, group) =>
      group.total < best.total || (group.total === best.total && group.members.length < best.members.length) ? group : best,
    );
    lightest.members.push(workspace);
    lightest.total += workspace.weight;
  }
  return groups.map((group) => group.members);
}

export function typecheckMatrix(groups: Workspace[][]): { include: TypecheckGroup[] } {
  if (groups.length === 0) return { include: [{ group: "none", workspaces: "", filters: "" }] };
  return {
    include: groups.map((members, index) => ({
      group: String(index + 1),
      workspaces: members.map((member) => member.name).join(" "),
      filters: members.map((member) => shellQuote(`--filter=${member.name}`)).join(" "),
    })),
  };
}

if (import.meta.main)
  await main(() => {
    const root = resolveCheckout(process.cwd()).worktree;
    const { ci } = readConfig(root);
    if (!fs.existsSync(path.join(root, "package.json"))) throw new AstackError(`No package.json in ${root}.`);
    const tracked = gitOut(["ls-files"], root).split("\n").filter(Boolean);
    const groups = groupWorkspaces(typecheckWorkspaces(root, tracked, ci.typecheckExclude), ci.typecheckJobs);
    for (const [index, members] of groups.entries())
      console.error(`types ${index + 1}: ${members.map((member) => `${member.name} (${member.weight})`).join(", ")}`);
    if (groups.length === 0) console.error("No workspace defines a typecheck script.");
    console.log(`typecheck=${JSON.stringify(typecheckMatrix(groups))}`);
  });
