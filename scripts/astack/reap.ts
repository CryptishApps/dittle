import * as fs from "node:fs";
import { AstackError, formatDuration, main, readConfigOrDefault, resolveCheckout, statePaths, type AstackConfig } from "./lib.ts";
import { branchMergedInto, decideReap, worktreeIdleMs } from "./idle.ts";
import { groupAlive, listRecords, removeRecord, systemProbe, verifyRecord, type ProcessProbe } from "./procs.ts";
import { stopOne } from "./stop.ts";
import { defaultTimerInput, installTimer, uninstallTimer } from "./timer.ts";
import { reapWorktrees } from "./worktrees.ts";

type Log = (line: string) => void;

export async function reap(
  input: { mainCheckout: string; config: AstackConfig; dryRun: boolean },
  options: { probe?: ProcessProbe; log: Log; now?: number; graceMs?: number },
): Promise<number> {
  const probe = options.probe ?? systemProbe();
  const now = options.now ?? Date.now();
  const limitMs = input.config.reaper.idleHours * 3_600_000;
  const prefix = input.dryRun ? "Would stop" : "Stopping";
  let acted = 0;
  let ok = true;
  for (const { file, record } of listRecords(statePaths(input.mainCheckout).processes)) {
    if (!record) {
      options.log(`${input.dryRun ? "Would remove" : "Removed"} unreadable record ${file}.`);
      if (!input.dryRun) removeRecord(file);
      acted++;
      continue;
    }
    const liveness = verifyRecord(record, probe);
    const worktreeExists = fs.existsSync(record.worktree);
    const running = liveness === "running" && worktreeExists;
    const idle = running ? worktreeIdleMs(record.worktree, record.startedAt, now) : 0;
    const merged = running && branchMergedInto(record.worktree, input.config.branches.integration, input.config.branches.release);
    const decision = decideReap({ liveness, worktreeExists, merged, idleMs: idle, idleLimitMs: limitMs });
    const where = `${record.service} in ${record.worktree}`;
    if (decision.action === "keep") continue;
    acted++;
    if (decision.action === "drop" && liveness === "gone" && groupAlive(record.pgid)) {
      options.log(`${prefix} the leftover processes of ${where}: its main process exited but its group ${record.pgid} is still running.`);
      if (!input.dryRun) ok = (await stopOne(file, record, { probe, log: options.log, graceMs: options.graceMs })) && ok;
      continue;
    }
    if (decision.action === "drop") {
      options.log(`${input.dryRun ? "Would remove" : "Removed"} the record for ${where}: ${decision.reason}.`);
      if (!input.dryRun) removeRecord(file);
      continue;
    }
    const reason = decision.reason === "idle" ? `idle for ${formatDuration(idle)}` : decision.reason;
    options.log(`${prefix} ${where}: ${reason}.`);
    if (!input.dryRun) ok = (await stopOne(file, record, { probe, log: options.log, graceMs: options.graceMs })) && ok;
  }
  acted += reapWorktrees(input, { probe, log: options.log, now });
  if (acted === 0) options.log("Nothing to reap.");
  return ok ? 0 : 1;
}

if (import.meta.main)
  await main(async () => {
    const args = process.argv.slice(2);
    const allowed = ["--install-timer", "--uninstall-timer", "--dry-run"];
    if (args.some((arg) => !allowed.includes(arg)) || args.length > 1)
      throw new AstackError("Usage: bun scripts/astack/reap.ts [--install-timer|--uninstall-timer|--dry-run]");
    const { mainCheckout } = resolveCheckout(process.cwd());
    const config = readConfigOrDefault(mainCheckout);
    const timerInput = defaultTimerInput(config.name, mainCheckout, config.reaper.intervalMinutes);
    if (args[0] === "--install-timer") {
      const outcome = installTimer(timerInput, { env: process.env });
      console.log(outcome.message);
      return outcome.status === "installed" || outcome.status === "unchanged" || outcome.status === "skipped" ? 0 : 1;
    }
    if (args[0] === "--uninstall-timer") {
      console.log(uninstallTimer(timerInput).message);
      return 0;
    }
    return reap({ mainCheckout, config, dryRun: args[0] === "--dry-run" }, { log: (line) => console.log(line) });
  });
