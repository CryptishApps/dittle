import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export type VerifyLockHolder = { pid: number; startedAt: string };

export type VerifyLockResult = { status: "acquired"; release: () => void } | { status: "held"; holder: VerifyLockHolder };

export const VERIFY_STAGES = ["lint", "typecheck", "test", "build"] as const;
export type VerifyStage = (typeof VERIFY_STAGES)[number];

const HOLDER_FILE = "holder.json";

export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

function readHolder(lockDirectory: string): VerifyLockHolder | undefined {
  try {
    const parsed: unknown = JSON.parse(readFileSync(join(lockDirectory, HOLDER_FILE), "utf8"));
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as VerifyLockHolder).pid === "number" &&
      typeof (parsed as VerifyLockHolder).startedAt === "string"
    )
      return parsed as VerifyLockHolder;
  } catch {
    return undefined;
  }
  return undefined;
}

export function acquireVerifyLock(
  lockDirectory: string,
  holder: VerifyLockHolder = { pid: process.pid, startedAt: new Date().toISOString() },
  isAlive: (pid: number) => boolean = isProcessAlive,
): VerifyLockResult {
  mkdirSync(dirname(lockDirectory), { recursive: true });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      mkdirSync(lockDirectory);
      writeFileSync(join(lockDirectory, HOLDER_FILE), JSON.stringify(holder));
      return { status: "acquired", release: () => rmSync(lockDirectory, { force: true, recursive: true }) };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const current = readHolder(lockDirectory);
      if (current && isAlive(current.pid)) return { status: "held", holder: current };
      rmSync(lockDirectory, { force: true, recursive: true });
    }
  }
  return { status: "held", holder: readHolder(lockDirectory) ?? { pid: 0, startedAt: "unknown" } };
}

export function selectStages(includeBuild: boolean): VerifyStage[] {
  return VERIFY_STAGES.filter((stage) => includeBuild || stage !== "build");
}

export function missingStages(manifest: unknown, stages: readonly VerifyStage[]): VerifyStage[] {
  const scripts = typeof manifest === "object" && manifest !== null ? (manifest as { scripts?: unknown }).scripts : undefined;
  const defined = typeof scripts === "object" && scripts !== null ? (scripts as Record<string, unknown>) : {};
  return stages.filter((stage) => typeof defined[stage] !== "string");
}

function terminateGroup(child: ChildProcess, signal: NodeJS.Signals): void {
  if (child.pid === undefined || child.exitCode !== null) return;
  try {
    process.kill(-child.pid, signal);
  } catch {
    child.kill(signal);
  }
}

function runStage(root: string, stage: VerifyStage, onSpawn: (child: ChildProcess) => void): Promise<number> {
  return new Promise((resolveExit) => {
    const child = spawn("bun", ["run", stage], { cwd: root, detached: true, stdio: "inherit" });
    onSpawn(child);
    child.on("error", () => resolveExit(1));
    child.on("exit", (code, signal) => resolveExit(code ?? (signal === null ? 1 : 128)));
  });
}

export async function verify(root: string, includeBuild: boolean, log: (line: string) => void = console.error): Promise<number> {
  const stages = selectStages(includeBuild);
  const missing = missingStages(JSON.parse(readFileSync(join(root, "package.json"), "utf8")), stages);
  if (missing.length > 0) {
    log(
      `package.json has no ${missing.map((stage) => `\`${stage}\``).join(", ")} script${missing.length > 1 ? "s" : ""}. The full check runs ${stages.join(", ")} in that order; add what is missing.`,
    );
    return 1;
  }

  const lock = acquireVerifyLock(join(root, ".turbo", "verify.lock"));
  if (lock.status === "held") {
    log(
      [
        `The full check is already running in this checkout (pid ${lock.holder.pid}, started ${lock.holder.startedAt}).`,
        "Wait for it to finish. Do not start a second full check; run the focused checks for the packages you changed instead.",
      ].join("\n"),
    );
    return 1;
  }

  let current: ChildProcess | undefined;
  let interrupted = false;
  process.on("exit", () => lock.release());
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const)
    process.on(signal, () => {
      interrupted = true;
      if (current) terminateGroup(current, "SIGTERM");
      lock.release();
      process.exit(1);
    });

  try {
    for (const stage of stages) {
      const status = await runStage(root, stage, (child) => {
        current = child;
      });
      if (interrupted || status !== 0) {
        log(`The full check stopped at ${stage}.`);
        return status === 0 ? 1 : status;
      }
    }
    return 0;
  } finally {
    lock.release();
  }
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  if (argv.some((arg) => arg !== "--no-build")) {
    console.error("Usage: bun scripts/verify.ts [--no-build]");
    process.exitCode = 1;
  } else process.exitCode = await verify(resolve(import.meta.dir, ".."), !argv.includes("--no-build"));
}
