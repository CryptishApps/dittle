import * as fs from "node:fs";
import { describeEnvFile, syncEnvFiles } from "./envfiles.ts";
import {
  AstackError,
  buildVariables,
  describePorts,
  ensureAstackDir,
  formatEnvFile,
  loadContext,
  main,
  shell,
  worktreeEnvPath,
  writeFileAtomic,
  type Context,
} from "./lib.ts";
import { claimSlot } from "./slots.ts";
import { defaultTimerInput, installTimer } from "./timer.ts";

export async function setup(context: Context, options: { env: NodeJS.ProcessEnv; log: (line: string) => void }): Promise<number> {
  const { config, worktree, mainCheckout, isMain } = context;
  const log = options.log;

  if (config.install) {
    log(`Installing dependencies: ${config.install}`);
    const code = shell(config.install, { cwd: worktree, env: options.env });
    if (code !== 0) throw new AstackError(`Install failed (exit ${code}). Fix the error above, then run bun scripts/astack/setup.ts again.`);
  }

  if (!isMain) for (const result of syncEnvFiles({ mainCheckout, worktree, envFiles: config.envFiles })) log(describeEnvFile(result, mainCheckout));

  const choice = await claimSlot(context);
  for (const released of choice.released) log(`Released slot ${released.slot}: ${released.worktree} no longer exists.`);

  const vars = buildVariables(config, { slot: choice.slot, worktree, mainCheckout });
  ensureAstackDir(`${worktree}/.astack`);
  writeFileAtomic(worktreeEnvPath(worktree), formatEnvFile(vars));

  const where = isMain ? "main checkout" : "worktree";
  log(`${describePorts(config.ports, choice.slot)}${choice.reused ? "" : " (new)"} for this ${where}.`);

  const timer = installTimer(defaultTimerInput(config.name, mainCheckout, config.reaper.intervalMinutes, options.env), { env: options.env });
  log(timer.message);
  if (!fs.existsSync(`${mainCheckout}/scripts/astack/reap.ts`) && timer.status === "installed")
    log("The main checkout has no scripts/astack/reap.ts yet; the timer starts working once it does.");
  return 0;
}

if (import.meta.main) await main(() => setup(loadContext(), { env: process.env, log: (line) => console.log(line) }));
