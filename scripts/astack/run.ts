import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  AstackError,
  interpolate,
  isPortBusy,
  loadContext,
  main,
  readWorktreeEnv,
  serviceOrder,
  sleep,
  tailFile,
  type Context,
} from "./lib.ts";
import {
  logFileFor,
  readRecord,
  readStartTime,
  recordFile,
  removeRecord,
  retryDelays,
  spawnInGroup,
  stopRecorded,
  systemProbe,
  verifyRecord,
  waitForPort,
  writeRecord,
  type ProcessProbe,
  type ProcessRecord,
} from "./procs.ts";
import { findClaim } from "./slots.ts";

export type ResolvedStep = { command: string; ifExists?: string; retryForSeconds?: number };
export type ResolvedService = {
  name: string;
  slot: number;
  cwd: string;
  command: string;
  env: NodeJS.ProcessEnv;
  port: number | null;
  timeoutMs: number;
  url: string | null;
  afterReady: ResolvedStep[];
  recordFile: string;
  logFile: string;
};

export function resolveService(
  context: Context,
  name: string,
  slot: number,
  vars: Record<string, string>,
  baseEnv: NodeJS.ProcessEnv,
): ResolvedService {
  const spec = context.config.services[name];
  if (!spec) throw new AstackError(`There is no service called "${name}".`);
  const where = `services.${name}`;
  const fill = (value: string, field: string) => interpolate(value, vars, `${where}.${field}`);
  const cwd = path.resolve(context.worktree, fill(spec.cwd, "cwd"));
  const serviceEnv = Object.fromEntries(Object.entries(spec.env).map(([key, value]) => [key, fill(value, `env.${key}`)]));
  return {
    name,
    slot,
    cwd,
    command: fill(spec.command, "command"),
    env: { ...baseEnv, ...vars, ...serviceEnv },
    port: spec.ready ? context.config.ports.base[spec.ready.port]! + slot : null,
    timeoutMs: (spec.ready?.timeoutSeconds ?? 60) * 1000,
    url: spec.url ? fill(spec.url, "url") : null,
    afterReady: spec.afterReady.map((step, index) => ({
      command: fill(step.command, `afterReady[${index}].command`),
      ifExists: step.ifExists ? path.resolve(cwd, fill(step.ifExists, `afterReady[${index}].ifExists`)) : undefined,
      retryForSeconds: step.retryForSeconds,
    })),
    recordFile: recordFile(context.state.processes, slot, name),
    logFile: logFileFor(context.state.logs, slot, name),
  };
}

type Log = (line: string) => void;

async function runningRecord(context: Context, service: ResolvedService, probe: ProcessProbe, log: Log): Promise<ProcessRecord | null> {
  if (!fs.existsSync(service.recordFile)) return null;
  const record = readRecord(service.recordFile);
  if (!record) {
    removeRecord(service.recordFile);
    return null;
  }
  if (verifyRecord(record, probe) !== "running") {
    const outcome = await stopRecorded(record, { probe });
    removeRecord(service.recordFile);
    if (outcome === "stopped" || outcome === "killed") log(`Stopped processes left over from ${service.name}'s last run.`);
    return null;
  }
  if (record.worktree === context.worktree) return record;
  if (fs.existsSync(record.worktree))
    throw new AstackError(`Slot ${service.slot} is recorded for ${record.worktree}, not this worktree. Run bun scripts/astack/setup.ts here again.`);
  const outcome = await stopRecorded(record, { probe });
  removeRecord(service.recordFile);
  log(`Stopped ${service.name} left over from deleted worktree ${record.worktree} (${outcome}).`);
  return null;
}

function failureDetail(service: ResolvedService): string {
  const tail = tailFile(service.logFile);
  return tail ? `\nLast lines of ${service.logFile}:\n${tail}` : `\nLog: ${service.logFile}`;
}

function runStep(service: ResolvedService, step: ResolvedStep): number {
  const fd = fs.openSync(service.logFile, "a");
  try {
    fs.writeSync(fd, `\n--- after ready: ${step.command}\n`);
    const result = spawnSync("/bin/sh", ["-c", step.command], { cwd: service.cwd, env: service.env, stdio: ["ignore", fd, fd] });
    return result.status ?? 1;
  } finally {
    fs.closeSync(fd);
  }
}

export async function runAfterReady(service: ResolvedService, log: Log): Promise<void> {
  for (const step of service.afterReady) {
    if (step.ifExists && !fs.existsSync(step.ifExists)) {
      log(`${service.name}: skipped "${step.command}" because ${step.ifExists} does not exist.`);
      continue;
    }
    let code = runStep(service, step);
    if (code !== 0 && step.retryForSeconds)
      log(`${service.name}: "${step.command}" failed; retrying for up to ${step.retryForSeconds} s. Output: ${service.logFile}`);
    for (const delay of step.retryForSeconds ? retryDelays(step.retryForSeconds) : []) {
      if (code === 0) break;
      await sleep(delay);
      code = runStep(service, step);
    }
    if (code !== 0)
      throw new AstackError(
        `${service.name} is running, but "${step.command}" failed (exit ${code}).${failureDetail(service)}\nFix it, then run: bun scripts/astack/stop.ts ${service.name} && bun scripts/astack/run.ts ${service.name}`,
      );
    log(`${service.name}: ran "${step.command}".`);
  }
}

async function ensurePortFree(service: ResolvedService): Promise<void> {
  if (service.port !== null && (await isPortBusy(service.port)))
    throw new AstackError(
      `Port ${service.port} for ${service.name} is already in use by a process astack did not start here. Stop that process, then run this again.`,
    );
}

function startRecord(context: Context, service: ResolvedService, pid: number, probe: ProcessProbe): ProcessRecord {
  const record: ProcessRecord = {
    pid,
    pgid: pid,
    procStartTime: readStartTime(pid, probe),
    worktree: context.worktree,
    service: service.name,
    command: service.command,
    startedAt: new Date().toISOString(),
    slot: service.slot,
    logFile: service.logFile,
    port: service.port,
    url: service.url,
  };
  writeRecord(service.recordFile, record);
  return record;
}

async function awaitReady(service: ResolvedService, record: ProcessRecord, exited: () => boolean, probe: ProcessProbe, log: Log) {
  if (service.port === null) {
    log(`${service.name} started (pid ${record.pid}); it has no ready port to wait for.`);
    return;
  }
  log(`Started ${service.name} (pid ${record.pid}), waiting for port ${service.port}.`);
  const result = await waitForPort(service.port, {
    timeoutMs: service.timeoutMs,
    stillRunning: () => !exited() && verifyRecord(record, probe) === "running",
  });
  if (result === "exited") {
    await stopRecorded(record, { probe });
    removeRecord(service.recordFile);
    throw new AstackError(`${service.name} exited before port ${service.port} opened.${failureDetail(service)}`);
  }
  if (result === "timeout") {
    await stopRecorded(record, { probe });
    removeRecord(service.recordFile);
    throw new AstackError(
      `${service.name} did not open port ${service.port} within ${service.timeoutMs / 1000} s, so it was stopped.${failureDetail(service)}`,
    );
  }
  log(`${service.name} is listening on port ${service.port}.`);
}

export function readyMessage(service: Pick<ResolvedService, "name" | "port" | "url">): string {
  return service.url ? `${service.name} is ready at ${service.url}` : `${service.name} is ready on port ${service.port}.`;
}

async function startBackground(context: Context, service: ResolvedService, probe: ProcessProbe, log: Log): Promise<void> {
  await ensurePortFree(service);
  const child = spawnInGroup({ command: service.command, cwd: service.cwd, env: service.env, logFile: service.logFile });
  let exited = false;
  child.once("exit", () => (exited = true));
  child.once("error", () => (exited = true));
  if (!child.pid) throw new AstackError(`Could not start ${service.name}.${failureDetail(service)}`);
  const record = startRecord(context, service, child.pid, probe);
  await awaitReady(service, record, () => exited, probe, log);
  await runAfterReady(service, log);
  log(readyMessage(service));
}

async function startForeground(context: Context, service: ResolvedService, probe: ProcessProbe, log: Log): Promise<number> {
  await ensurePortFree(service);
  const child = spawnInGroup({ command: service.command, cwd: service.cwd, env: service.env, logFile: service.logFile, foreground: true });
  if (!child.pid) throw new AstackError(`Could not start ${service.name}.${failureDetail(service)}`);
  const pid = child.pid;
  const logStream = fs.createWriteStream(service.logFile, { flags: "a" });
  child.stdout?.on("data", (chunk: Buffer) => {
    process.stdout.write(chunk);
    logStream.write(chunk);
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    process.stderr.write(chunk);
    logStream.write(chunk);
  });
  let exited = false;
  const exit = new Promise<number>((resolve) =>
    child.once("exit", (code, signal) => {
      exited = true;
      resolve(code ?? (signal ? 128 + (signal === "SIGINT" ? 2 : signal === "SIGKILL" ? 9 : 15) : 1));
    }),
  );
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const)
    process.on(signal, () => {
      try {
        process.kill(-pid, signal);
      } catch {}
    });
  const record = startRecord(context, service, pid, probe);
  try {
    await awaitReady(service, record, () => exited, probe, log);
    await runAfterReady(service, log);
    log(readyMessage(service));
  } catch (error) {
    if (error instanceof AstackError) log(error.message);
    else throw error;
  }
  const code = await exit;
  logStream.end();
  if (readRecord(service.recordFile)?.pid === pid) removeRecord(service.recordFile);
  return code;
}

export async function runService(
  context: Context,
  target: string,
  options: { foreground?: boolean; log: Log; env?: NodeJS.ProcessEnv; probe?: ProcessProbe },
): Promise<number> {
  const probe = options.probe ?? systemProbe();
  const log = options.log;
  const claim = findClaim(context.state.slots, context.worktree);
  if (!claim) throw new AstackError("This worktree has no slot yet. Run: bun scripts/astack/setup.ts");
  const vars = readWorktreeEnv(context.worktree);
  if (vars.SLOT !== String(claim.slot)) throw new AstackError("This worktree's .astack/env is out of date. Run: bun scripts/astack/setup.ts");
  for (const name of serviceOrder(context.config.services, target)) {
    let service: ResolvedService;
    try {
      service = resolveService(context, name, claim.slot, vars, options.env ?? process.env);
    } catch (error) {
      if (error instanceof AstackError) throw new AstackError(`${error.message}\nIf you changed t3.json, run bun scripts/astack/setup.ts again.`);
      throw error;
    }
    if (!fs.existsSync(service.cwd)) throw new AstackError(`services.${name}.cwd is ${service.cwd}, which does not exist.`);
    const existing = await runningRecord(context, service, probe, log);
    if (existing) {
      log(`${name} is already running for this worktree (pid ${existing.pid})${existing.url ? ` at ${existing.url}` : ""}.`);
      continue;
    }
    if (name === target && options.foreground) return startForeground(context, service, probe, log);
    await startBackground(context, service, probe, log);
  }
  return 0;
}

function parseArgs(argv: string[]): { service: string; foreground: boolean } {
  const foreground = argv.includes("--foreground");
  const rest = argv.filter((arg) => arg !== "--foreground");
  const unknown = rest.filter((arg) => arg.startsWith("-"));
  if (unknown.length > 0 || rest.length !== 1) throw new AstackError("Usage: bun scripts/astack/run.ts <service> [--foreground]");
  return { service: rest[0]!, foreground };
}

if (import.meta.main)
  await main(() => {
    const context = loadContext();
    if (process.argv.length <= 2)
      throw new AstackError(
        `Usage: bun scripts/astack/run.ts <service> [--foreground]\nServices: ${Object.keys(context.config.services).join(", ") || "none in t3.json"}`,
      );
    const args = parseArgs(process.argv.slice(2));
    return runService(context, args.service, { foreground: args.foreground, log: (line) => console.log(line) });
  });
