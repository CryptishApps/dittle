import { AstackError, main, readConfig, resolveCheckout, run, type AstackConfig, type RunResult } from "./lib.ts";

export type GithubDeps = { gh: (args: string[], input?: string) => RunResult; log: (line: string) => void };
export type Ruleset = { name: string; target: "branch"; enforcement: "active"; conditions: object; rules: { type: string }[] };

export const RULESET_NAME = "astack: long-lived branches";
export const GOOD_TO_GO_COLOR = "0E8A16";
export const OLD_LABEL = "ready-to-land";
export const EVIDENCE_RULESET_NAME = "astack: evidence branch";

export function rulesets(config: AstackConfig): Ruleset[] {
  const refs = (names: string[]) => ({ ref_name: { include: [...new Set(names)].map((name) => `refs/heads/${name}`), exclude: [] } });
  const ruleset = (name: string, branches: string[], rules: string[]): Ruleset => ({
    name,
    target: "branch",
    enforcement: "active",
    conditions: refs(branches),
    rules: rules.map((type) => ({ type })),
  });
  return [
    ruleset(RULESET_NAME, [config.branches.integration, config.branches.release], ["deletion", "non_fast_forward"]),
    ruleset(EVIDENCE_RULESET_NAME, [config.evidence.branch], ["deletion"]),
  ];
}

export function goodToGoDescription(config: AstackConfig): string {
  return `Reviewed; the next merge takes it into ${config.branches.integration}`;
}

function allowedActions(current: RunResult): string {
  if (current.code !== 0) return "all";
  try {
    return (JSON.parse(current.stdout) as { allowed_actions?: string }).allowed_actions ?? "all";
  } catch {
    return "all";
  }
}

function reason(result: RunResult): string {
  try {
    const body = JSON.parse(result.stdout) as { message?: string };
    if (body.message) return body.message;
  } catch {}
  return result.stderr.trim() || `exit ${result.code}`;
}

export function applyGithubSettings(input: { repository: string; config: AstackConfig }, deps: GithubDeps): { failed: string[] } {
  const failed: string[] = [];
  const api = `repos/${input.repository}`;

  const settings = deps.gh(["api", "-X", "PATCH", api, "-F", "delete_branch_on_merge=true", "-F", "allow_merge_commit=true"]);
  if (settings.code === 0) deps.log("GitHub now deletes a PR's branch when the PR merges, and allows merge commits for release PRs.");
  else failed.push(`Repository settings: ${reason(settings)}`);

  const { label } = input.config.merge;
  if (label !== OLD_LABEL && deps.gh(["label", "edit", OLD_LABEL, "--repo", input.repository, "--name", label]).code === 0)
    deps.log(`Renamed the "${OLD_LABEL}" label to "${label}". PRs that had it keep it.`);
  const created = deps.gh(["label", "create", label, "--repo", input.repository, "--color", GOOD_TO_GO_COLOR, "--description", goodToGoDescription(input.config), "--force"]);
  if (created.code === 0) deps.log(`The "${label}" label exists, so a reviewer can mark a PR good to go.`);
  else failed.push(`Label "${label}": ${reason(created)}`);

  const allowed = allowedActions(deps.gh(["api", `${api}/actions/permissions`]));
  const actions = deps.gh(["api", "-X", "PUT", `${api}/actions/permissions`, "-F", "enabled=true", "-f", `allowed_actions=${allowed}`]);
  if (actions.code !== 0) failed.push(`Actions permissions: ${reason(actions)}`);
  else {
    deps.log(`GitHub Actions is on and allows ${allowed} actions.`);
    const runs = deps.gh(["api", `${api}/actions/runs?per_page=1`, "--jq", ".total_count"]);
    if (runs.code !== 0 || runs.stdout.trim() === "0")
      deps.log("Push a new commit now: a new repository shows its first workflow run only for a push made after Actions is saved.");
  }

  const listed = deps.gh(["api", `${api}/rulesets`]);
  if (listed.code !== 0) failed.push(`Rulesets: ${reason(listed)}`);
  else {
    const existing = JSON.parse(listed.stdout) as { id: number; name: string }[];
    for (const ruleset of rulesets(input.config)) {
      const match = existing.find((item) => item.name === ruleset.name);
      const result = match
        ? deps.gh(["api", "-X", "PUT", `${api}/rulesets/${match.id}`, "--input", "-"], JSON.stringify(ruleset))
        : deps.gh(["api", "-X", "POST", `${api}/rulesets`, "--input", "-"], JSON.stringify(ruleset));
      if (result.code === 0) deps.log(`Ruleset "${ruleset.name}" is active.`);
      else failed.push(`Ruleset "${ruleset.name}": ${reason(result)}`);
    }
  }

  for (const line of failed) deps.log(`Not applied. ${line}`);
  if (failed.length > 0)
    deps.log(
      "Repository settings, Actions permissions, and rulesets need an admin token. Rulesets on a private repository also need a paid GitHub plan. The astack scripts refuse to delete these branches either way.",
    );
  return { failed };
}

if (import.meta.main)
  await main(async () => {
    if (process.argv.length > 2) throw new AstackError("Usage: bun scripts/astack/github.ts");
    const repoDir = resolveCheckout(process.cwd()).worktree;
    const gh = (args: string[], input?: string) => run("gh", args, { cwd: repoDir, input });
    const repository = gh(["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]);
    if (repository.code !== 0) throw new AstackError(`gh repo view failed:\n${repository.stderr.trim()}`);
    const report = applyGithubSettings({ repository: repository.stdout.trim(), config: readConfig(repoDir) }, { gh, log: (line) => console.log(line) });
    return report.failed.length === 0 ? 0 : 1;
  });
