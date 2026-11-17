import * as fs from "node:fs";
import { formatDuration, loadContext, main, portsForSlot, readConfigOrDefault, type AstackConfig, type Context } from "./lib.ts";
import { worktreeIdleMs } from "./idle.ts";
import { listRecords, systemProbe, verifyRecord, type ProcessProbe, type ProcessRecord } from "./procs.ts";
import { readSlots } from "./slots.ts";

export function statusLines(context: Context, options: { probe?: ProcessProbe; now?: number } = {}): string[] {
  const probe = options.probe ?? systemProbe();
  const now = options.now ?? Date.now();
  const records = listRecords(context.state.processes)
    .map((entry) => entry.record)
    .filter((record): record is ProcessRecord => record !== null);
  const claims = readSlots(context.state.slots).claims;
  const lines: string[] = [`Project ${context.config.name} (${context.mainCheckout})`];
  if (claims.length === 0) lines.push("No slots claimed yet. Run: bun scripts/astack/setup.ts");

  for (const claim of claims) {
    const exists = fs.existsSync(claim.worktree);
    const label = claim.worktree === context.mainCheckout ? "main checkout" : "worktree";
    const here = claim.worktree === context.worktree ? ", this one" : "";
    lines.push(`Slot ${claim.slot} (${label}${here}): ${claim.worktree}${exists ? "" : " (deleted)"}`);
    const config: AstackConfig = exists ? safeConfig(claim.worktree, context.config) : context.config;
    const ports = portsForSlot(config.ports, claim.slot);
    const mine = records.filter((record) => record.worktree === claim.worktree);
    const names = [...new Set([...Object.keys(config.services), ...mine.map((record) => record.service)])];
    let latestStart: string | null = null;
    for (const name of names) {
      const record = mine.find((candidate) => candidate.service === name);
      const readyKey = config.services[name]?.ready?.port;
      const port = record?.port ?? (readyKey ? ports[readyKey] : undefined);
      const portText = port ? `port ${port}` : "no port";
      if (!record) {
        lines.push(`  ${name}: stopped, ${portText}`);
        continue;
      }
      const liveness = verifyRecord(record, probe);
      if (liveness === "running") {
        if (!latestStart || record.startedAt > latestStart) latestStart = record.startedAt;
        lines.push(`  ${name}: running, ${portText}, pid ${record.pid}${record.url ? `, ${record.url}` : ""}`);
      } else lines.push(`  ${name}: stale record (process ${liveness === "gone" ? "exited" : "PID reused"}), ${portText}`);
    }
    if (names.length === 0) lines.push("  no services configured");
    if (exists) lines.push(`  idle ${formatDuration(worktreeIdleMs(claim.worktree, latestStart, now))}`);
  }
  return lines;
}

function safeConfig(worktree: string, fallback: AstackConfig): AstackConfig {
  try {
    return readConfigOrDefault(worktree);
  } catch {
    return fallback;
  }
}

if (import.meta.main)
  await main(() => {
    for (const line of statusLines(loadContext())) console.log(line);
  });
