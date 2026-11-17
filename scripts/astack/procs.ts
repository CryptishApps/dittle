import { spawn, type ChildProcess } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { acceptsConnections, sleep, writeFileAtomic } from "./lib.ts";

export type ProcessRecord = {
  pid: number;
  pgid: number;
  procStartTime: string | null;
  worktree: string;
  service: string;
  command: string;
  startedAt: string;
  slot: number;
  logFile: string;
  port: number | null;
  url: string | null;
};

export type ProcStat = { state: string; pgid: number; startTime: string };

export type ProcessProbe = {
  signalZero(pid: number): "alive" | "gone" | "foreign";
  stat(pid: number): ProcStat | null | undefined;
  bootTimeMs?(): number;
};

export type Liveness = "running" | "gone" | "reused";

export function parseProcStat(text: string): ProcStat | null {
  const close = text.lastIndexOf(")");
  if (close < 0) return null;
  const fields = text.slice(close + 2).trim().split(/\s+/);
  const state = fields[0];
  const pgid = Number(fields[2]);
  const startTime = fields[19];
  if (!state || !Number.isInteger(pgid) || !startTime) return null;
  return { state, pgid, startTime };
}

export function systemProbe(procRoot = "/proc"): ProcessProbe {
  const hasProc = fs.existsSync(path.join(procRoot, "self", "stat"));
  return {
    bootTimeMs: () => Date.now() - os.uptime() * 1000,
    signalZero(pid) {
      try {
        process.kill(pid, 0);
        return "alive";
      } catch (error) {
        return (error as NodeJS.ErrnoException).code === "EPERM" ? "foreign" : "gone";
      }
    },
    stat(pid) {
      if (!hasProc) return undefined;
      try {
        return parseProcStat(fs.readFileSync(path.join(procRoot, String(pid), "stat"), "utf8"));
      } catch {
        return null;
      }
    },
  };
}

export function readStartTime(pid: number, probe: ProcessProbe = systemProbe()): string | null {
  return probe.stat(pid)?.startTime ?? null;
}

type RecordIdentity = Pick<ProcessRecord, "pid" | "pgid" | "procStartTime"> & { startedAt?: string };

export function startedBeforeBoot(record: RecordIdentity, probe: ProcessProbe): boolean {
  const boot = probe.bootTimeMs?.();
  if (boot === undefined || !record.startedAt) return false;
  return Date.parse(record.startedAt) < boot - 60_000;
}

export function verifyRecord(record: RecordIdentity, probe: ProcessProbe): Liveness {
  if (startedBeforeBoot(record, probe)) return "gone";
  const signal = probe.signalZero(record.pid);
  if (signal === "gone") return "gone";
  if (signal === "foreign") return "reused";
  const stat = probe.stat(record.pid);
  if (stat === undefined) return "running";
  if (stat === null || stat.state === "Z") return "gone";
  if (record.procStartTime !== null && stat.startTime !== record.procStartTime) return "reused";
  if (stat.pgid !== record.pgid) return "reused";
  return "running";
}

export function recordFile(processesDir: string, slot: number, service: string): string {
  return path.join(processesDir, `${slot}-${service}.json`);
}

export function logFileFor(logsDir: string, slot: number, service: string): string {
  return path.join(logsDir, `${slot}-${service}.log`);
}

export function writeRecord(file: string, record: ProcessRecord): void {
  writeFileAtomic(file, `${JSON.stringify(record, null, 2)}\n`);
}

export function readRecord(file: string): ProcessRecord | null {
  try {
    const record = JSON.parse(fs.readFileSync(file, "utf8")) as ProcessRecord;
    if (!Number.isInteger(record.pid) || !Number.isInteger(record.pgid) || record.pid <= 1 || record.pgid <= 1) return null;
    return record;
  } catch {
    return null;
  }
}

export function listRecords(processesDir: string): { file: string; record: ProcessRecord | null }[] {
  if (!fs.existsSync(processesDir)) return [];
  return fs
    .readdirSync(processesDir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => {
      const file = path.join(processesDir, name);
      return { file, record: readRecord(file) };
    });
}

export function removeRecord(file: string): void {
  fs.rmSync(file, { force: true });
}

export function spawnInGroup(input: {
  command: string;
  cwd: string;
  env: NodeJS.ProcessEnv;
  logFile: string;
  foreground?: boolean;
}): ChildProcess {
  fs.mkdirSync(path.dirname(input.logFile), { recursive: true });
  const fd = fs.openSync(input.logFile, "a");
  fs.writeSync(fd, `\n--- ${new Date().toISOString()} ${input.command}\n`);
  try {
    const child = spawn("/bin/sh", ["-c", input.command], {
      cwd: input.cwd,
      env: input.env,
      detached: true,
      stdio: input.foreground ? ["ignore", "pipe", "pipe"] : ["ignore", fd, fd],
    });
    if (!input.foreground) child.unref();
    return child;
  } finally {
    fs.closeSync(fd);
  }
}

export function groupAlive(pgid: number): boolean {
  try {
    process.kill(-pgid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

function signalGroup(pgid: number, signal: NodeJS.Signals): void {
  try {
    process.kill(-pgid, signal);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
  }
}

async function waitUntil(check: () => boolean, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (check()) return true;
    if (Date.now() >= deadline) return false;
    await sleep(100);
  }
}

export type StopOutcome = "stopped" | "killed" | "gone" | "reused" | "survived";

export async function stopRecorded(
  record: ProcessRecord,
  options: { probe?: ProcessProbe; graceMs?: number } = {},
): Promise<StopOutcome> {
  const probe = options.probe ?? systemProbe();
  const liveness = verifyRecord(record, probe);
  const orphanedGroup =
    liveness === "gone" && probe.stat(record.pgid) !== undefined && !startedBeforeBoot(record, probe) && groupAlive(record.pgid);
  if (liveness !== "running" && !orphanedGroup) return liveness;
  signalGroup(record.pgid, "SIGTERM");
  if (await waitUntil(() => !groupAlive(record.pgid), options.graceMs ?? 5000)) return "stopped";
  signalGroup(record.pgid, "SIGKILL");
  return (await waitUntil(() => !groupAlive(record.pgid), 3000)) ? "killed" : "survived";
}

export async function waitForPort(
  port: number,
  options: { timeoutMs: number; stillRunning: () => boolean },
): Promise<"ready" | "exited" | "timeout"> {
  const deadline = Date.now() + options.timeoutMs;
  for (;;) {
    if (await acceptsConnections(port)) return "ready";
    if (!options.stillRunning()) return "exited";
    if (Date.now() >= deadline) return "timeout";
    await sleep(250);
  }
}

export function retryDelays(totalSeconds: number): number[] {
  const delays: number[] = [];
  let elapsed = 0;
  let next = 1;
  while (elapsed + next <= totalSeconds) {
    delays.push(next * 1000);
    elapsed += next;
    next = Math.min(next * 2, 10);
  }
  return delays;
}
