import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as net from "node:net";
import * as path from "node:path";

export class AstackError extends Error {}

export type EnvFileSpec = { path: string; mode: "link" | "copy"; omit: string[] };
export type ReadySpec = { port: string; timeoutSeconds: number };
export type AfterReadyStep = { command: string; ifExists?: string; retryForSeconds?: number };
export type ServiceSpec = {
  cwd: string;
  command: string;
  env: Record<string, string>;
  requires: string[];
  ready?: ReadySpec;
  afterReady: AfterReadyStep[];
  url?: string;
};
export type AstackConfig = {
  version: 1;
  name: string;
  scope?: string;
  packageManager: string;
  branches: { integration: string; release: string };
  packs: string[];
  install?: string;
  envFiles: EnvFileSpec[];
  ports: { slots: number; base: Record<string, number> };
  env: Record<string, string>;
  services: Record<string, ServiceSpec>;
  checks: { focused?: string; ci?: string; merge?: string };
  ci: { typecheckJobs: number; typecheckExclude: string[]; testShards: Record<string, number>; testExclude: string[] };
  evidence: { branch: string; maxFileMb: number; uiPaths: string[]; backendPaths: string[] };
  reaper: { idleHours: number; intervalMinutes: number; worktreeIdleHours: number; dirtyWorktreeIdleHours: number; archiveDays: number };
  merge: { label: string; maxPRs: number; deploy?: string };
};

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const CONFIG_FILE = "t3.json";
const BUILTIN_NAMES = ["MAIN_CHECKOUT", "WORKTREE", "SLOT"] as const;
const REFERENCE = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const PORT_KEY = /^[a-z][A-Za-z0-9]*$/;

class Reader {
  problems: string[] = [];

  string(obj: Json, key: string, where: string, fallback?: string): string | undefined {
    const value = obj[key];
    if (value === undefined) return fallback;
    if (typeof value !== "string" || value.trim() === "") {
      this.problems.push(`${where}.${key} must be a non-empty string.`);
      return fallback;
    }
    return value;
  }

  number(obj: Json, key: string, where: string, fallback: number, min: number): number {
    const value = obj[key];
    if (value === undefined) return fallback;
    if (typeof value !== "number" || !Number.isFinite(value) || value < min) {
      this.problems.push(`${where}.${key} must be a number of at least ${min}.`);
      return fallback;
    }
    return value;
  }

  integer(obj: Json, key: string, where: string, fallback: number, min: number): number {
    const value = this.number(obj, key, where, fallback, min);
    if (!Number.isInteger(value)) {
      this.problems.push(`${where}.${key} must be a whole number.`);
      return fallback;
    }
    return value;
  }

  object(obj: Json, key: string, where: string): Json {
    const value = obj[key];
    if (value === undefined) return {};
    if (!isObject(value)) {
      this.problems.push(`${where}.${key} must be an object.`);
      return {};
    }
    return value;
  }

  strings(obj: Json, key: string, where: string): string[] {
    const value = obj[key];
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
      this.problems.push(`${where}.${key} must be a list of strings.`);
      return [];
    }
    return value as string[];
  }

  countMap(obj: Json, key: string, where: string): Record<string, number> {
    const map = this.object(obj, key, where);
    const result: Record<string, number> = {};
    for (const [name, value] of Object.entries(map)) {
      if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
        this.problems.push(`${where}.${key}.${name} must be a whole number of at least 1.`);
        continue;
      }
      result[name] = value;
    }
    return result;
  }

  stringMap(obj: Json, key: string, where: string): Record<string, string> {
    const map = this.object(obj, key, where);
    const result: Record<string, string> = {};
    for (const [name, value] of Object.entries(map)) {
      if (typeof value !== "string") {
        this.problems.push(`${where}.${key}.${name} must be a string.`);
        continue;
      }
      result[name] = value;
    }
    return result;
  }
}

export function normalizeConfig(raw: unknown, fallbackName: string): AstackConfig {
  if (!isObject(raw)) throw new AstackError(`${CONFIG_FILE} needs an "astack" object.`);
  const read = new Reader();
  if (raw.version !== 1) read.problems.push("version must be 1.");

  const branches = read.object(raw, "branches", "astack");
  const ports = read.object(raw, "ports", "astack");
  const baseRaw = read.object(ports, "base", "ports");
  const base: Record<string, number> = {};
  for (const [key, value] of Object.entries(baseRaw)) {
    if (!PORT_KEY.test(key)) read.problems.push(`ports.base.${key} must be a camelCase name such as web or convexSite.`);
    if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 65535) {
      read.problems.push(`ports.base.${key} must be a port number.`);
      continue;
    }
    base[key] = value;
  }

  const envFiles: EnvFileSpec[] = [];
  const envFilesRaw = raw.envFiles ?? [];
  if (!Array.isArray(envFilesRaw)) read.problems.push("envFiles must be a list.");
  else
    envFilesRaw.forEach((item, index) => {
      const where = `envFiles[${index}]`;
      if (!isObject(item)) return void read.problems.push(`${where} must be an object.`);
      const filePath = read.string(item, "path", where);
      const mode = item.mode ?? "link";
      if (mode !== "link" && mode !== "copy") read.problems.push(`${where}.mode must be "link" or "copy".`);
      if (filePath && path.isAbsolute(filePath)) read.problems.push(`${where}.path must be relative to the project root.`);
      const omit = read.strings(item, "omit", where);
      if (omit.length > 0 && mode !== "copy") read.problems.push(`${where}.omit only works with mode "copy".`);
      if (filePath) envFiles.push({ path: filePath, mode: mode === "copy" ? "copy" : "link", omit });
    });

  const services: Record<string, ServiceSpec> = {};
  for (const [name, value] of Object.entries(read.object(raw, "services", "astack"))) {
    const where = `services.${name}`;
    if (!isObject(value)) {
      read.problems.push(`${where} must be an object.`);
      continue;
    }
    const command = read.string(value, "command", where);
    if (!command) {
      read.problems.push(`${where}.command is required.`);
      continue;
    }
    const readyRaw = value.ready;
    let ready: ReadySpec | undefined;
    if (readyRaw !== undefined) {
      if (!isObject(readyRaw)) read.problems.push(`${where}.ready must be an object.`);
      else {
        const port = read.string(readyRaw, "port", `${where}.ready`);
        if (port) ready = { port, timeoutSeconds: read.number(readyRaw, "timeoutSeconds", `${where}.ready`, 60, 1) };
      }
    }
    const afterReady: AfterReadyStep[] = [];
    const stepsRaw = value.afterReady ?? [];
    if (!Array.isArray(stepsRaw)) read.problems.push(`${where}.afterReady must be a list.`);
    else
      stepsRaw.forEach((step, index) => {
        const stepWhere = `${where}.afterReady[${index}]`;
        if (!isObject(step)) return void read.problems.push(`${stepWhere} must be an object.`);
        const stepCommand = read.string(step, "command", stepWhere);
        if (!stepCommand) return void read.problems.push(`${stepWhere}.command is required.`);
        afterReady.push({
          command: stepCommand,
          ifExists: read.string(step, "ifExists", stepWhere),
          retryForSeconds: step.retryForSeconds === undefined ? undefined : read.number(step, "retryForSeconds", stepWhere, 0, 0),
        });
      });
    services[name] = {
      cwd: read.string(value, "cwd", where, ".") ?? ".",
      command,
      env: read.stringMap(value, "env", where),
      requires: read.strings(value, "requires", where),
      ready,
      afterReady,
      url: read.string(value, "url", where),
    };
  }

  const checks = read.object(raw, "checks", "astack");
  const ci = read.object(raw, "ci", "astack");
  const evidence = read.object(raw, "evidence", "astack");
  const reaper = read.object(raw, "reaper", "astack");
  const merge = read.object(raw, "merge", "astack");

  const config: AstackConfig = {
    version: 1,
    name: read.string(raw, "name", "astack", fallbackName) ?? fallbackName,
    scope: read.string(raw, "scope", "astack"),
    packageManager: read.string(raw, "packageManager", "astack", "bun") ?? "bun",
    branches: {
      integration: read.string(branches, "integration", "branches", "staging") ?? "staging",
      release: read.string(branches, "release", "branches", "main") ?? "main",
    },
    packs: read.strings(raw, "packs", "astack"),
    install: read.string(raw, "install", "astack"),
    envFiles,
    ports: { slots: read.integer(ports, "slots", "ports", 100, 1), base },
    env: read.stringMap(raw, "env", "astack"),
    services,
    checks: {
      focused: read.string(checks, "focused", "checks"),
      ci: read.string(checks, "ci", "checks"),
      merge: read.string(checks, "merge", "checks"),
    },
    ci: {
      typecheckJobs: read.integer(ci, "typecheckJobs", "ci", 4, 1),
      typecheckExclude: read.strings(ci, "typecheckExclude", "ci"),
      testShards: read.countMap(ci, "testShards", "ci"),
      testExclude: read.strings(ci, "testExclude", "ci"),
    },
    evidence: {
      branch: read.string(evidence, "branch", "evidence", "astack-evidence") ?? "astack-evidence",
      maxFileMb: read.number(evidence, "maxFileMb", "evidence", 25, 0),
      uiPaths: read.strings(evidence, "uiPaths", "evidence"),
      backendPaths: read.strings(evidence, "backendPaths", "evidence"),
    },
    reaper: {
      idleHours: read.number(reaper, "idleHours", "reaper", 3, 0),
      intervalMinutes: read.integer(reaper, "intervalMinutes", "reaper", 15, 1),
      worktreeIdleHours: read.number(reaper, "worktreeIdleHours", "reaper", 24, 0),
      dirtyWorktreeIdleHours: read.number(reaper, "dirtyWorktreeIdleHours", "reaper", 168, 0),
      archiveDays: read.number(reaper, "archiveDays", "reaper", 45, 0),
    },
    merge: {
      label: read.string(merge, "label", "merge", "good-to-go") ?? "good-to-go",
      maxPRs: read.integer(merge, "maxPRs", "merge", 10, 1),
      deploy: merge.deploy === "" ? undefined : read.string(merge, "deploy", "merge"),
    },
  };

  const problems = [...read.problems, ...renamedKeys(raw, checks), ...validatePortBases(config.ports), ...validateServices(config), ...validateReferences(config)];
  if (problems.length > 0) throw new AstackError(`The astack section of ${CONFIG_FILE} has problems:\n${problems.map((p) => `- ${p}`).join("\n")}`);
  return config;
}

export function validatePortBases(ports: AstackConfig["ports"]): string[] {
  const problems: string[] = [];
  const entries = Object.entries(ports.base).sort((a, b) => a[1] - b[1]);
  for (let i = 1; i < entries.length; i++) {
    const [lowKey, low] = entries[i - 1]!;
    const [highKey, high] = entries[i]!;
    if (high - low < ports.slots)
      problems.push(
        `ports.base.${lowKey} (${low}) and ports.base.${highKey} (${high}) are ${high - low} apart; they must be at least ${ports.slots} (ports.slots) apart.`,
      );
  }
  for (const [key, base] of entries)
    if (base + ports.slots - 1 > 65535) problems.push(`ports.base.${key} (${base}) plus ${ports.slots} slots goes past port 65535.`);
  return problems;
}

function validateServices(config: AstackConfig): string[] {
  const problems: string[] = [];
  for (const [name, service] of Object.entries(config.services)) {
    for (const required of service.requires)
      if (!config.services[required]) problems.push(`services.${name}.requires names "${required}", which is not a service.`);
    if (service.ready && config.ports.base[service.ready.port] === undefined)
      problems.push(`services.${name}.ready.port is "${service.ready.port}", which is not a key in ports.base.`);
  }
  for (const name of Object.keys(config.services)) {
    try {
      serviceOrder(config.services, name);
    } catch (error) {
      if (error instanceof AstackError) problems.push(error.message);
    }
  }
  return [...new Set(problems)];
}

export function referencedNames(template: string): string[] {
  return [...template.matchAll(REFERENCE)].map((match) => match[1]!);
}

function validateReferences(config: AstackConfig): string[] {
  const problems: string[] = [];
  const builtins = new Set<string>([...BUILTIN_NAMES, ...Object.keys(config.ports.base).map(portEnvName)]);
  for (const key of Object.keys(config.env)) {
    if (!ENV_NAME.test(key)) problems.push(`env.${key} is not a valid variable name.`);
    if (builtins.has(key) || key.startsWith("PORT_")) problems.push(`env.${key} clashes with a built-in name; pick another name.`);
  }
  const known = new Set([...builtins, ...Object.keys(config.env)]);
  const check = (value: string | undefined, where: string) => {
    if (value === undefined) return;
    for (const name of referencedNames(value))
      if (!known.has(name)) problems.push(`${where} uses \${${name}}, which is not defined. ${KNOWN_NAMES_HINT}`);
  };
  for (const [key, value] of Object.entries(config.env)) check(value, `env.${key}`);
  for (const [name, service] of Object.entries(config.services)) {
    const where = `services.${name}`;
    check(service.command, `${where}.command`);
    check(service.cwd, `${where}.cwd`);
    check(service.url, `${where}.url`);
    for (const [key, value] of Object.entries(service.env)) check(value, `${where}.env.${key}`);
    service.afterReady.forEach((step, index) => {
      check(step.command, `${where}.afterReady[${index}].command`);
      check(step.ifExists, `${where}.afterReady[${index}].ifExists`);
    });
  }
  for (const name of referencedNames(config.merge.deploy ?? ""))
    if (!MERGE_NAMES.includes(name))
      problems.push(`merge.deploy uses \${${name}}, which is not defined. Use \${MAIN_CHECKOUT} or \${WORKTREE}.`);
  return problems;
}

const MERGE_NAMES: readonly string[] = ["MAIN_CHECKOUT", "WORKTREE"];

const RENAMED_KEYS = [
  { where: "astack", old: "land", now: "merge" },
  { where: "checks", old: "land", now: "merge" },
  { where: "checks", old: "gate", now: "ci" },
] as const;

function renamedKeys(raw: Json, checks: Json): string[] {
  const sections: Record<string, Json> = { astack: raw, checks };
  return RENAMED_KEYS.filter(({ where, old }) => sections[where]![old] !== undefined).map(
    ({ where, old, now }) => `${where === "astack" ? "" : `${where}.`}${old} is now ${where === "astack" ? "" : `${where}.`}${now}. Run astack init to rename it.`,
  );
}

const KNOWN_NAMES_HINT = "Use a PORT_* name from ports.base, MAIN_CHECKOUT, WORKTREE, SLOT, or a key in env.";

export function portEnvName(key: string): string {
  const snake = key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toUpperCase();
  return `PORT_${snake}`;
}

export function portsForSlot(ports: AstackConfig["ports"], slot: number): Record<string, number> {
  return Object.fromEntries(Object.entries(ports.base).map(([key, base]) => [key, base + slot]));
}

export function portEnv(ports: AstackConfig["ports"], slot: number): Record<string, string> {
  return Object.fromEntries(Object.entries(portsForSlot(ports, slot)).map(([key, port]) => [portEnvName(key), String(port)]));
}

export function describePorts(ports: AstackConfig["ports"], slot: number): string {
  const entries = Object.entries(portsForSlot(ports, slot));
  if (entries.length === 0) return `Slot ${slot}: no ports configured`;
  return `Slot ${slot}: ${entries.map(([key, port]) => `${key} on ${port}`).join(", ")}`;
}

export function interpolate(template: string, vars: Record<string, string>, where: string): string {
  return template.replace(REFERENCE, (_, name: string) => {
    if (!Object.hasOwn(vars, name)) throw new AstackError(`${where} uses \${${name}}, which is not defined. ${KNOWN_NAMES_HINT}`);
    return vars[name]!;
  });
}

export function buildVariables(
  config: Pick<AstackConfig, "ports" | "env">,
  where: { slot: number; worktree: string; mainCheckout: string },
): Record<string, string> {
  const vars: Record<string, string> = {
    ...portEnv(config.ports, where.slot),
    MAIN_CHECKOUT: where.mainCheckout,
    WORKTREE: where.worktree,
    SLOT: String(where.slot),
  };
  const resolving = new Set<string>();
  const resolve = (key: string, from: string): string => {
    if (Object.hasOwn(vars, key)) return vars[key]!;
    if (!Object.hasOwn(config.env, key)) throw new AstackError(`${from} uses \${${key}}, which is not defined. ${KNOWN_NAMES_HINT}`);
    if (resolving.has(key)) throw new AstackError(`env.${key} refers back to itself through other env keys.`);
    resolving.add(key);
    const value = config.env[key]!.replace(REFERENCE, (_, name: string) => resolve(name, `env.${key}`));
    resolving.delete(key);
    vars[key] = value;
    return value;
  };
  for (const key of Object.keys(config.env)) resolve(key, `env.${key}`);
  return vars;
}

export function serviceOrder(services: Record<string, Pick<ServiceSpec, "requires">>, target: string): string[] {
  const order: string[] = [];
  const visiting: string[] = [];
  const visit = (name: string) => {
    if (order.includes(name)) return;
    if (visiting.includes(name))
      throw new AstackError(`Services require each other in a loop: ${[...visiting.slice(visiting.indexOf(name)), name].join(" -> ")}.`);
    const service = services[name];
    if (!service) throw new AstackError(`There is no service called "${name}". Services: ${Object.keys(services).join(", ") || "none"}.`);
    visiting.push(name);
    for (const required of service.requires) visit(required);
    visiting.pop();
    order.push(name);
  };
  visit(target);
  return order;
}

export function stopOrder(services: Record<string, Pick<ServiceSpec, "requires">>, names: string[]): string[] {
  const known = names.filter((name) => services[name]);
  const all: string[] = [];
  for (const name of Object.keys(services))
    for (const step of serviceOrder(services, name)) if (!all.includes(step)) all.push(step);
  const ordered = all.filter((name) => known.includes(name)).reverse();
  return [...ordered, ...names.filter((name) => !services[name])];
}

export type RunResult = { code: number; stdout: string; stderr: string };

export function run(command: string, args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv; input?: string } = {}): RunResult {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env,
    input: options.input,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.error) return { code: 127, stdout: "", stderr: result.error.message };
  return { code: result.status ?? 1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

export function git(args: string[], cwd: string, env?: NodeJS.ProcessEnv): RunResult {
  return run("git", args, { cwd, env });
}

export function requireOrigin(runGit: (args: string[]) => RunResult, branches: string[]): void {
  if (runGit(["remote", "get-url", "origin"]).code === 0) return;
  throw new AstackError(
    [
      "This project has no origin remote yet, so there is nothing to fetch from or push to.",
      "Create the GitHub repository, then connect it and push the long-lived branches:",
      "  git remote add origin <repository url>",
      `  git push -u origin ${branches.join(" ")}`,
      "Then run this again.",
    ].join("\n"),
  );
}

export function gitOut(args: string[], cwd: string, env?: NodeJS.ProcessEnv): string {
  const result = git(args, cwd, env);
  if (result.code !== 0) throw new AstackError(`git ${args.join(" ")} failed in ${cwd}:\n${result.stderr.trim()}`);
  return result.stdout.trim();
}

export function shell(command: string, options: { cwd: string; env?: NodeJS.ProcessEnv; quiet?: boolean }): number {
  const result = spawnSync("/bin/sh", ["-c", command], {
    cwd: options.cwd,
    env: options.env ?? process.env,
    stdio: options.quiet ? ["ignore", "ignore", "ignore"] : ["ignore", "inherit", "inherit"],
  });
  return result.status ?? 1;
}

export type WorkspaceManifest = {
  name?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
export type WorkspacePackage = { name: string; dir: string; manifest: WorkspaceManifest };

function workspacePatterns(manifest: unknown): string[] {
  const workspaces = (manifest as { workspaces?: unknown }).workspaces;
  const list = Array.isArray(workspaces) ? workspaces : (workspaces as { packages?: unknown } | undefined)?.packages;
  if (!Array.isArray(list)) return [];
  return list.filter((item): item is string => typeof item === "string");
}

export function workspacesWithScript(root: string, trackedFiles: string[], script: string, exclude: string[]): WorkspacePackage[] {
  const patterns = workspacePatterns(JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")));
  const include = patterns.filter((pattern) => !pattern.startsWith("!")).map((pattern) => new Bun.Glob(pattern.replace(/\/$/, "")));
  const skip = patterns.filter((pattern) => pattern.startsWith("!")).map((pattern) => new Bun.Glob(pattern.slice(1).replace(/\/$/, "")));
  const dirs = trackedFiles
    .filter((file) => path.posix.basename(file) === "package.json")
    .map((file) => path.posix.dirname(file))
    .filter((dir) => dir !== "." && include.some((glob) => glob.match(dir)) && !skip.some((glob) => glob.match(dir)));
  const workspaces: WorkspacePackage[] = [];
  for (const dir of dirs) {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, dir, "package.json"), "utf8")) as WorkspaceManifest;
    if (!manifest.name || !manifest.scripts?.[script] || exclude.includes(manifest.name)) continue;
    workspaces.push({ name: manifest.name, dir, manifest });
  }
  return workspaces;
}

export type Checkout = { worktree: string; mainCheckout: string; isMain: boolean };

export function resolveCheckout(cwd: string): Checkout {
  const top = git(["rev-parse", "--show-toplevel"], cwd);
  if (top.code !== 0) throw new AstackError(`${cwd} is not inside a git repository. Run this from the project folder.`);
  const common = gitOut(["rev-parse", "--path-format=absolute", "--git-common-dir"], cwd);
  const worktree = fs.realpathSync(top.stdout.trim());
  const mainCheckout = fs.realpathSync(path.dirname(common));
  return { worktree, mainCheckout, isMain: worktree === mainCheckout };
}

export function readConfig(dir: string, fallbackName = path.basename(dir)): AstackConfig {
  const file = path.join(dir, CONFIG_FILE);
  let text: string;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    throw new AstackError(`No ${CONFIG_FILE} in ${dir}. Run astack init in the project first.`);
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw new AstackError(`${CONFIG_FILE} is not valid JSON: ${(error as Error).message}`);
  }
  if (!isObject(raw) || !isObject(raw.astack)) {
    throw new AstackError(`${CONFIG_FILE} in ${dir} has no "astack" section. Run astack init in the project first.`);
  }
  return normalizeConfig(raw.astack, fallbackName);
}

export function readConfigOrDefault(dir: string): AstackConfig {
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(path.join(dir, CONFIG_FILE), "utf8"));
  } catch {
    raw = undefined;
  }
  if (isObject(raw) && raw.astack !== undefined) return readConfig(dir);
  return normalizeConfig({ version: 1 }, path.basename(dir));
}

export type StatePaths = { dir: string; slots: string; lock: string; processes: string; logs: string };

export function statePaths(mainCheckout: string): StatePaths {
  const dir = path.join(mainCheckout, ".astack");
  return {
    dir,
    slots: path.join(dir, "slots.json"),
    lock: path.join(dir, "slots.lock"),
    processes: path.join(dir, "processes"),
    logs: path.join(dir, "logs"),
  };
}

export function ensureAstackDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
  const ignore = path.join(dir, ".gitignore");
  if (!fs.existsSync(ignore)) fs.writeFileSync(ignore, "*\n");
}

export function worktreeEnvPath(worktree: string): string {
  return path.join(worktree, ".astack", "env");
}

export type Context = Checkout & { config: AstackConfig; state: StatePaths };

export function loadContext(cwd = process.cwd()): Context {
  const checkout = resolveCheckout(cwd);
  const config = readConfig(checkout.worktree, path.basename(checkout.mainCheckout));
  return { ...checkout, config, state: statePaths(checkout.mainCheckout) };
}

const NEEDS_QUOTES = /[^A-Za-z0-9_./:@,+=-]/;

export function formatEnvFile(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([key, value]) => `${key}=${NEEDS_QUOTES.test(value) ? JSON.stringify(value) : value}`)
    .join("\n")
    .concat("\n");
}

export function parseEnvFile(text: string): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(line);
    if (!match) continue;
    const raw = match[2]!.trim();
    if (raw.startsWith('"')) {
      try {
        vars[match[1]!] = JSON.parse(raw) as string;
        continue;
      } catch {}
    }
    if (raw.startsWith("'") && raw.endsWith("'") && raw.length >= 2) vars[match[1]!] = raw.slice(1, -1);
    else vars[match[1]!] = raw;
  }
  return vars;
}

export function shellQuote(value: string): string {
  return /^[A-Za-z0-9_./:@,+=-]+$/.test(value) ? value : `'${value.replace(/'/g, `'\\''`)}'`;
}

export function readWorktreeEnv(worktree: string): Record<string, string> {
  const file = worktreeEnvPath(worktree);
  if (!fs.existsSync(file)) throw new AstackError(`This worktree has no ${path.relative(worktree, file)} yet. Run: bun scripts/astack/setup.ts`);
  return parseEnvFile(fs.readFileSync(file, "utf8"));
}

export function writeFileAtomic(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, content);
  fs.renameSync(temp, file);
}

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function withLock<T>(lockDir: string, action: () => Promise<T>, waitMs = 30_000): Promise<T> {
  fs.mkdirSync(path.dirname(lockDir), { recursive: true });
  const deadline = Date.now() + waitMs;
  for (;;) {
    try {
      fs.mkdirSync(lockDir);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const stat = fs.statSync(lockDir, { throwIfNoEntry: false });
      if (stat && Date.now() - stat.mtimeMs > 120_000) {
        fs.rmSync(lockDir, { recursive: true, force: true });
        continue;
      }
      if (Date.now() > deadline)
        throw new AstackError(`Another astack command is holding ${lockDir}. If none is running, delete that folder and try again.`);
      await sleep(100);
    }
  }
  try {
    return await action();
  } finally {
    fs.rmSync(lockDir, { recursive: true, force: true });
  }
}

export function canConnect(port: number, host: string, timeoutMs = 500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    const done = (result: boolean) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeoutMs, () => done(false));
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
  });
}

export async function acceptsConnections(port: number): Promise<boolean> {
  return (await canConnect(port, "127.0.0.1")) || (await canConnect(port, "::1"));
}

function canListen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.listen({ port, exclusive: true }, () => server.close(() => resolve(true)));
  });
}

export async function isPortBusy(port: number): Promise<boolean> {
  if (await acceptsConnections(port)) return true;
  return !(await canListen(port));
}

export function formatDuration(ms: number): string {
  const minutes = Math.floor(Math.max(0, ms) / 60_000);
  if (minutes < 1) return "under 1m";
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

export function tailFile(file: string, lines = 20): string {
  try {
    const text = fs.readFileSync(file, "utf8");
    return text.split("\n").slice(-lines - 1).join("\n").trimEnd();
  } catch {
    return "";
  }
}

export async function main(action: () => Promise<number | void> | number | void): Promise<never> {
  try {
    const code = await action();
    process.exit(code ?? 0);
  } catch (error) {
    if (error instanceof AstackError) console.error(error.message);
    else console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
    process.exit(1);
  }
}
