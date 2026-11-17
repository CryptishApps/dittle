import * as fs from "node:fs";
import { AstackError, git, main, readConfig, resolveCheckout } from "./lib.ts";

export const REQUIRED_SECTIONS = ["Problem", "Acceptance", "Change", "Risk", "Verification"];
export const UI_SECTION = "UI evidence";
export const BACKEND_SECTION = "Backend evidence";

export function stripHtmlComments(text: string): string {
  return text.replace(/<!--[\s\S]*?(?:-->|$)/g, "");
}

export function parseSections(body: string): Map<string, string> {
  const sections = new Map<string, string>();
  let current: string | null = null;
  let fence: string | null = null;
  const lines: string[] = [];
  const flush = () => {
    if (current !== null && !sections.has(current)) sections.set(current, lines.join("\n"));
    lines.length = 0;
  };
  for (const line of stripHtmlComments(body.replace(/\r\n?/g, "\n")).split("\n")) {
    const fenceMatch = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      if (fence === null) fence = fenceMatch[1]![0]!;
      else if (fenceMatch[1]![0] === fence) fence = null;
    }
    const heading = fence === null && !fenceMatch ? /^\s{0,3}##\s+(.+?)\s*#*\s*$/.exec(line) : null;
    if (heading) {
      flush();
      current = heading[1]!.trim().toLowerCase();
      continue;
    }
    if (current !== null) lines.push(line);
  }
  flush();
  return sections;
}

export function hasContent(text: string | undefined): boolean {
  return (text ?? "").trim().length > 0;
}

export function hasImage(text: string): boolean {
  return /!\[[^\]]*\]\(\s*\S+[^)]*\)/.test(text) || /<img\s[^>]*\bsrc\s*=/i.test(text);
}

export function matchesAny(file: string, globs: string[]): boolean {
  return globs.some((pattern) => new Bun.Glob(pattern).match(file));
}

function sample(files: string[]): string {
  const shown = files.slice(0, 2).join(", ");
  return files.length > 2 ? `${shown} and ${files.length - 2} more` : shown;
}

export function checkPullRequest(input: { body: string; files: string[]; uiPaths: string[]; backendPaths: string[] }): string[] {
  const sections = parseSections(input.body);
  const failures: string[] = [];
  const section = (name: string) => sections.get(name.toLowerCase());
  const requireFilled = (name: string) => {
    const text = section(name);
    if (text === undefined) failures.push(`The "${name}" section is missing. Add it back from the PR template.`);
    else if (!hasContent(text)) failures.push(`The "${name}" section is empty. Fill it in, or say why it does not apply.`);
    return text !== undefined && hasContent(text);
  };

  for (const name of REQUIRED_SECTIONS) requireFilled(name);

  const uiFiles = input.files.filter((file) => matchesAny(file, input.uiPaths));
  if (uiFiles.length > 0 && requireFilled(UI_SECTION) && !hasImage(section(UI_SECTION)!))
    failures.push(
      `UI files changed (${sample(uiFiles)}), but "${UI_SECTION}" has no screenshot. Upload one with bun scripts/astack/evidence.ts add <file> and paste the markdown it prints.`,
    );

  const backendFiles = input.files.filter((file) => matchesAny(file, input.backendPaths));
  if (backendFiles.length > 0) {
    const text = section(BACKEND_SECTION);
    if (text === undefined) failures.push(`The "${BACKEND_SECTION}" section is missing. Add it back from the PR template.`);
    else if (!hasContent(text))
      failures.push(
        `Backend files changed (${sample(backendFiles)}), but "${BACKEND_SECTION}" is empty. Say what you ran against the backend and what it showed.`,
      );
  }
  return failures;
}

export function annotation(message: string): string {
  const escaped = message.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
  return `::error title=PR evidence::${escaped}`;
}

type Inputs = { body: string; files: string[] } | { skip: string };

export function readInputs(
  argv: string[],
  repoDir: string,
  env: NodeJS.ProcessEnv,
  branches: { integration: string; release: string },
): Inputs {
  const option = (name: string) => {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const bodyFile = option("--body-file");
  const filesFile = option("--files-file");
  if (bodyFile || filesFile) {
    if (!bodyFile || !filesFile) throw new AstackError("Pass both --body-file and --files-file.");
    return {
      body: fs.readFileSync(bodyFile, "utf8"),
      files: fs.readFileSync(filesFile, "utf8").split("\n").map((line) => line.trim()).filter(Boolean),
    };
  }
  const eventPath = env.GITHUB_EVENT_PATH;
  if (!eventPath) throw new AstackError("Run this in GitHub Actions, or pass --body-file <file> --files-file <file>.");
  const event = JSON.parse(fs.readFileSync(eventPath, "utf8")) as {
    pull_request?: { body?: string | null; base?: { sha?: string; ref?: string }; head?: { sha?: string } };
  };
  const pr = event.pull_request;
  if (!pr) return { skip: "This run is not for a pull request; nothing to check." };
  if (pr.base?.ref === branches.release && branches.integration !== branches.release)
    return { skip: `PRs into ${branches.release} are release PRs with no task template; nothing to check.` };
  const base = pr.base?.sha;
  const head = pr.head?.sha;
  if (!base || !head) throw new AstackError("The pull request event has no base or head commit.");
  const diff = git(["diff", "--name-only", `${base}...${head}`], repoDir);
  if (diff.code !== 0)
    throw new AstackError(`Could not list changed files. Check out with full history (actions/checkout with fetch-depth: 0).\n${diff.stderr.trim()}`);
  return { body: pr.body ?? "", files: diff.stdout.split("\n").map((line) => line.trim()).filter(Boolean) };
}

if (import.meta.main)
  await main(() => {
    const repoDir = resolveCheckout(process.cwd()).worktree;
    const config = readConfig(repoDir);
    const inputs = readInputs(process.argv.slice(2), repoDir, process.env, config.branches);
    if ("skip" in inputs) {
      console.log(inputs.skip);
      return 0;
    }
    const failures = checkPullRequest({
      body: inputs.body,
      files: inputs.files,
      uiPaths: config.evidence.uiPaths,
      backendPaths: config.evidence.backendPaths,
    });
    if (failures.length === 0) {
      console.log("PR evidence check passed.");
      return 0;
    }
    const inActions = process.env.GITHUB_ACTIONS === "true";
    for (const failure of failures) console.log(inActions ? annotation(failure) : failure);
    console.log(`${failures.length} problem(s). Fix them in the PR description; the check runs again when the PR is edited or pushed.`);
    return 1;
  });
