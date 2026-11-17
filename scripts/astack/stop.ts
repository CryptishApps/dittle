import { AstackError, loadContext, main, stopOrder, type Context } from "./lib.ts";
import { groupAlive, listRecords, removeRecord, stopRecorded, systemProbe, type ProcessProbe, type ProcessRecord } from "./procs.ts";

type Log = (line: string) => void;

export async function stopOne(file: string, record: ProcessRecord, options: { probe?: ProcessProbe; log: Log; graceMs?: number }): Promise<boolean> {
  const outcome = await stopRecorded(record, { probe: options.probe, graceMs: options.graceMs });
  const name = record.service;
  switch (outcome) {
    case "stopped":
      options.log(`Stopped ${name} (pid ${record.pid}).`);
      break;
    case "killed":
      options.log(`Stopped ${name} (pid ${record.pid}) with SIGKILL after it ignored SIGTERM for 5 s.`);
      break;
    case "gone":
      options.log(`${name} was not running; removed its record.`);
      if (groupAlive(record.pgid))
        options.log(
          `Some processes from ${name}'s group ${record.pgid} are still alive. Check them with: ps -o pid,command -g ${record.pgid}`,
        );
      break;
    case "reused":
      options.log(`${name}'s PID ${record.pid} now belongs to a different process. Left it alone and removed the old record.`);
      break;
    case "survived":
      options.log(`${name} (group ${record.pgid}) is still running after SIGKILL. Check it with: ps -o pid,command -g ${record.pgid}`);
      return false;
  }
  removeRecord(file);
  return true;
}

export async function stopServices(
  context: Context,
  target: string | "--all",
  options: { probe?: ProcessProbe; log: Log; graceMs?: number },
): Promise<number> {
  const probe = options.probe ?? systemProbe();
  const mine = listRecords(context.state.processes).filter(
    (entry): entry is { file: string; record: ProcessRecord } => entry.record?.worktree === context.worktree,
  );
  const selected = target === "--all" ? mine : mine.filter((entry) => entry.record.service === target);
  if (target !== "--all" && !context.config.services[target] && selected.length === 0)
    throw new AstackError(`There is no service called "${target}". Services: ${Object.keys(context.config.services).join(", ") || "none"}.`);
  if (selected.length === 0) {
    options.log(target === "--all" ? "Nothing is running for this worktree." : `${target} is not running for this worktree.`);
    return 0;
  }
  const order = stopOrder(
    context.config.services,
    selected.map((entry) => entry.record.service),
  );
  let ok = true;
  for (const name of order) {
    const entry = selected.find((candidate) => candidate.record.service === name);
    if (entry) ok = (await stopOne(entry.file, entry.record, { probe, log: options.log, graceMs: options.graceMs })) && ok;
  }
  return ok ? 0 : 1;
}

if (import.meta.main)
  await main(() => {
    const args = process.argv.slice(2);
    if (args.length > 1 || (args[0]?.startsWith("-") && args[0] !== "--all"))
      throw new AstackError("Usage: bun scripts/astack/stop.ts [service|--all]");
    return stopServices(loadContext(), args[0] ?? "--all", { log: (line) => console.log(line) });
  });
