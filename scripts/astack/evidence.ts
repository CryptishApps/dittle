import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { AstackError, git, gitOut, loadContext, main, run } from "./lib.ts";

export type Repo = { owner: string; repo: string };

const REMOTE_FORMS = [
  /^https?:\/\/(?:[^@/]+@)?github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/,
  /^ssh:\/\/git@github\.com(?::\d+)?\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/,
  /^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?\/?$/,
];

export function parseGitHubRemote(url: string): Repo | null {
  for (const form of REMOTE_FORMS) {
    const match = form.exec(url.trim());
    if (match) return { owner: match[1]!, repo: match[2]! };
  }
  return null;
}

export function githubRepo(repoDir: string, remote = "origin"): Repo {
  const expanded = git(["remote", "get-url", remote], repoDir);
  if (expanded.code !== 0) throw new AstackError(`This repository has no "${remote}" remote. Add the GitHub remote first.`);
  const raw = git(["config", "--get", `remote.${remote}.url`], repoDir).stdout;
  const repo = parseGitHubRemote(expanded.stdout) ?? parseGitHubRemote(raw);
  if (!repo) throw new AstackError(`The ${remote} remote (${expanded.stdout.trim()}) is not a github.com URL, so evidence links cannot be built.`);
  return repo;
}

export function evidenceStamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}-${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
}

export function stampDate(filePath: string): Date | null {
  const match = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})-/.exec(path.posix.basename(filePath));
  if (!match) return null;
  const [, y, mo, d, h, mi, s] = match.map(Number) as number[];
  return new Date(Date.UTC(y!, mo! - 1, d!, h!, mi!, s!));
}

export function safeFileName(name: string): string {
  const cleaned = path.basename(name).replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+/, "");
  return cleaned || "file";
}

export function evidencePaths(branchName: string, stamp: string, fileNames: string[]): string[] {
  const used = new Set<string>();
  return fileNames.map((name) => {
    const safe = safeFileName(name);
    let candidate = `${branchName}/${stamp}-${safe}`;
    for (let n = 2; used.has(candidate); n++) {
      const ext = path.extname(safe);
      candidate = `${branchName}/${stamp}-${safe.slice(0, safe.length - ext.length)}-${n}${ext}`;
    }
    used.add(candidate);
    return candidate;
  });
}

export function evidenceUrl(repo: Repo, evidenceBranch: string, filePath: string): string {
  const encoded = filePath.split("/").map(encodeURIComponent).join("/");
  return `https://github.com/${repo.owner}/${repo.repo}/blob/${evidenceBranch.split("/").map(encodeURIComponent).join("/")}/${encoded}?raw=true`;
}

const IMAGE = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif"]);
const VIDEO = new Set([".mp4", ".mov", ".webm", ".m4v"]);

export function mediaKind(fileName: string): "image" | "video" | "file" {
  const ext = path.extname(fileName).toLowerCase();
  if (IMAGE.has(ext)) return "image";
  if (VIDEO.has(ext)) return "video";
  return "file";
}

export function fileLabel(label: string | undefined, fileName: string, fileCount: number): string {
  const name = path.basename(fileName);
  if (!label) return name;
  return fileCount > 1 ? `${label}: ${name.slice(0, name.length - path.extname(name).length)}` : label;
}

export function evidenceMarkdown(fileName: string, url: string, label?: string): string {
  const text = (label ?? path.basename(fileName)).replace(/[[\]]/g, "");
  return mediaKind(fileName) === "image" ? `![${text}](${url})` : `[${text}](${url})`;
}

function remoteTip(repoDir: string, remote: string, branch: string): string | null {
  const result = git(["ls-remote", "--exit-code", remote, `refs/heads/${branch}`], repoDir);
  if (result.code === 2) return null;
  if (result.code !== 0) throw new AstackError(`Could not reach the ${remote} remote:\n${result.stderr.trim()}`);
  const tip = result.stdout.split(/\s+/)[0]!;
  const fetch = git(["fetch", "--no-tags", "--quiet", remote, `+refs/heads/${branch}:refs/remotes/${remote}/${branch}`], repoDir);
  if (fetch.code !== 0) throw new AstackError(`Could not fetch ${branch} from ${remote}:\n${fetch.stderr.trim()}`);
  return tip;
}

function plumbingEnv(repoDir: string, indexFile: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, GIT_INDEX_FILE: indexFile };
  if (git(["var", "GIT_COMMITTER_IDENT"], repoDir).code !== 0) {
    env.GIT_AUTHOR_NAME = env.GIT_COMMITTER_NAME = "astack";
    env.GIT_AUTHOR_EMAIL = env.GIT_COMMITTER_EMAIL = "astack@localhost";
  }
  return env;
}

function withTempIndex<T>(action: (indexFile: string) => T): T {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "astack-evidence-"));
  try {
    return action(path.join(dir, "index"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export type AddInput = {
  repoDir: string;
  remote: string;
  evidenceBranch: string;
  branchName: string;
  files: string[];
  maxFileMb: number;
  now: Date;
};

export function addEvidence(input: AddInput): { commit: string; paths: string[] } {
  if (input.files.length === 0) throw new AstackError("Name at least one file: bun scripts/astack/evidence.ts add <files...>");
  const limit = input.maxFileMb * 1024 * 1024;
  for (const file of input.files) {
    const stat = fs.statSync(file, { throwIfNoEntry: false });
    if (!stat?.isFile()) throw new AstackError(`${file} is not a file.`);
    if (stat.size > limit)
      throw new AstackError(
        `${file} is ${(stat.size / 1024 / 1024).toFixed(1)} MB; the limit is ${input.maxFileMb} MB (evidence.maxFileMb). Trim or compress it.`,
      );
  }
  const blobs = input.files.map((file) => gitOut(["hash-object", "-w", "--", path.resolve(file)], input.repoDir));
  const paths = evidencePaths(input.branchName, evidenceStamp(input.now), input.files);
  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const tip = remoteTip(input.repoDir, input.remote, input.evidenceBranch);
    const commit = withTempIndex((indexFile) => {
      const env = plumbingEnv(input.repoDir, indexFile);
      gitOut(tip ? ["read-tree", tip] : ["read-tree", "--empty"], input.repoDir, env);
      blobs.forEach((blob, i) => gitOut(["update-index", "--add", "--cacheinfo", `100644,${blob},${paths[i]}`], input.repoDir, env));
      const tree = gitOut(["write-tree"], input.repoDir, env);
      const message = `Evidence for ${input.branchName}: ${paths.map((p) => path.posix.basename(p)).join(", ")}`;
      return gitOut(["commit-tree", tree, ...(tip ? ["-p", tip] : []), "-m", message], input.repoDir, env);
    });
    const push = git(["push", "--quiet", input.remote, `${commit}:refs/heads/${input.evidenceBranch}`], input.repoDir);
    if (push.code === 0) return { commit, paths };
    lastError = push.stderr.trim();
  }
  throw new AstackError(`Could not push to ${input.evidenceBranch} after 3 tries:\n${lastError}`);
}

export function filesToKeep(paths: string[], cutoff: Date): string[] {
  return paths.filter((file) => {
    const stamp = stampDate(file);
    return stamp === null || stamp >= cutoff;
  });
}

export function pruneEvidence(input: {
  repoDir: string;
  remote: string;
  evidenceBranch: string;
  olderThanDays: number;
  now: Date;
}): { kept: number; removed: number; pushed: boolean } {
  const tip = remoteTip(input.repoDir, input.remote, input.evidenceBranch);
  if (!tip) return { kept: 0, removed: 0, pushed: false };
  const listing = gitOut(["ls-tree", "-r", "-z", "--full-tree", tip], input.repoDir);
  const entries = listing
    .split("\0")
    .filter(Boolean)
    .map((line) => {
      const tab = line.indexOf("\t");
      return { info: line.slice(0, tab), path: line.slice(tab + 1) };
    });
  const cutoff = new Date(input.now.getTime() - input.olderThanDays * 86_400_000);
  const keep = new Set(filesToKeep(entries.map((entry) => entry.path), cutoff));
  const kept = entries.filter((entry) => keep.has(entry.path));
  const removed = entries.length - kept.length;
  if (removed === 0) return { kept: kept.length, removed: 0, pushed: false };
  const commit = withTempIndex((indexFile) => {
    const env = plumbingEnv(input.repoDir, indexFile);
    gitOut(["read-tree", "--empty"], input.repoDir, env);
    const records = kept.map((entry) => {
      const [mode, , sha] = entry.info.split(" ");
      return `${mode} ${sha}\t${entry.path}\0`;
    });
    const update = spawnIndexInfo(input.repoDir, env, records.join(""));
    if (update !== 0) throw new AstackError("git update-index failed while rebuilding the evidence branch.");
    const tree = gitOut(["write-tree"], input.repoDir, env);
    return gitOut(["commit-tree", tree, "-m", `Evidence pruned: kept files from the last ${input.olderThanDays} days`], input.repoDir, env);
  });
  const push = git(
    ["push", "--quiet", `--force-with-lease=refs/heads/${input.evidenceBranch}:${tip}`, input.remote, `${commit}:refs/heads/${input.evidenceBranch}`],
    input.repoDir,
  );
  if (push.code !== 0) throw new AstackError(`Could not rewrite ${input.evidenceBranch}:\n${push.stderr.trim()}`);
  return { kept: kept.length, removed, pushed: true };
}

function spawnIndexInfo(repoDir: string, env: NodeJS.ProcessEnv, input: string): number {
  return run("git", ["update-index", "-z", "--index-info"], { cwd: repoDir, env, input }).code;
}

function parseArgs(argv: string[]) {
  const [command, ...rest] = argv;
  const files: string[] = [];
  let label: string | undefined;
  let days: number | undefined;
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]!;
    if (arg === "--label") label = rest[++i];
    else if (arg === "--older-than-days") days = Number(rest[++i]);
    else if (arg.startsWith("--")) throw new AstackError(`Unknown option ${arg}.`);
    else files.push(arg);
  }
  return { command, files, label, days };
}

const USAGE = "Usage:\n  bun scripts/astack/evidence.ts add <files...> [--label text]\n  bun scripts/astack/evidence.ts prune --older-than-days N";

if (import.meta.main)
  await main(() => {
    const args = parseArgs(process.argv.slice(2));
    const context = loadContext();
    const evidenceBranch = context.config.evidence.branch;
    if (args.command === "add") {
      const branch = git(["symbolic-ref", "--short", "-q", "HEAD"], context.worktree);
      if (branch.code !== 0) throw new AstackError("You are not on a branch. Check out your branch first; evidence is filed under its name.");
      const repo = githubRepo(context.worktree);
      const absolute = args.files.map((file) => path.resolve(file));
      const result = addEvidence({
        repoDir: context.worktree,
        remote: "origin",
        evidenceBranch,
        branchName: branch.stdout.trim(),
        files: absolute,
        maxFileMb: context.config.evidence.maxFileMb,
        now: new Date(),
      });
      console.log(`Uploaded ${result.paths.length} file(s) to ${evidenceBranch}. Paste this into the PR:`);
      result.paths.forEach((filePath, i) => console.log(evidenceMarkdown(absolute[i]!, evidenceUrl(repo, evidenceBranch, filePath), fileLabel(args.label, absolute[i]!, absolute.length))));
      return 0;
    }
    if (args.command === "prune") {
      if (args.days === undefined || !Number.isFinite(args.days) || args.days < 0) throw new AstackError(USAGE);
      const result = pruneEvidence({ repoDir: context.worktree, remote: "origin", evidenceBranch, olderThanDays: args.days, now: new Date() });
      console.log(
        result.pushed
          ? `Rewrote ${evidenceBranch}: kept ${result.kept} file(s), removed ${result.removed} older than ${args.days} days.`
          : `Nothing older than ${args.days} days on ${evidenceBranch}.`,
      );
      return 0;
    }
    throw new AstackError(USAGE);
  });
