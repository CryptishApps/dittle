import { createHash } from "node:crypto";
import * as fs from "node:fs";
import { AstackError, ensureAstackDir, isPortBusy, portsForSlot, withLock, writeFileAtomic, type Context } from "./lib.ts";

export type SlotClaim = { slot: number; worktree: string; claimedAt: string };
export type SlotsFile = { version: 1; claims: SlotClaim[] };

export function hashSlot(worktree: string, slots: number): number {
  const value = parseInt(createHash("sha256").update(worktree).digest("hex").slice(0, 8), 16);
  const slot = value % slots;
  return slot === 0 ? 1 : slot;
}

export function readSlots(file: string): SlotsFile {
  if (!fs.existsSync(file)) return { version: 1, claims: [] };
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8")) as SlotsFile;
    return { version: 1, claims: Array.isArray(data.claims) ? data.claims : [] };
  } catch {
    throw new AstackError(`${file} is not valid JSON. Fix it or delete it; slots will be claimed again.`);
  }
}

export function findClaim(file: string, worktree: string): SlotClaim | undefined {
  return readSlots(file).claims.find((claim) => claim.worktree === worktree);
}

export type SlotChoice = { slot: number; claims: SlotClaim[]; released: SlotClaim[]; reused: boolean };

export async function chooseSlot(input: {
  worktree: string;
  isMain: boolean;
  slots: number;
  claims: SlotClaim[];
  now: Date;
  pathExists: (path: string) => boolean;
  portsBusy: (slot: number) => Promise<boolean>;
}): Promise<SlotChoice> {
  const released = input.claims.filter((claim) => !input.pathExists(claim.worktree));
  const kept = input.claims.filter((claim) => input.pathExists(claim.worktree));
  const existing = kept.find((claim) => claim.worktree === input.worktree);
  if (existing) return { slot: existing.slot, claims: kept, released, reused: true };

  const claim = (slot: number): SlotChoice => ({
    slot,
    claims: [...kept.filter((other) => other.slot !== slot), { slot, worktree: input.worktree, claimedAt: input.now.toISOString() }],
    released,
    reused: false,
  });
  if (input.isMain) return claim(0);
  if (input.slots < 2) throw new AstackError("ports.slots is 1, so only the main checkout has ports. Raise astack.ports.slots in t3.json.");

  const taken = new Set(kept.map((other) => other.slot));
  const start = hashSlot(input.worktree, input.slots);
  for (let offset = 0; offset < input.slots - 1; offset++) {
    const slot = 1 + ((start - 1 + offset) % (input.slots - 1));
    if (taken.has(slot)) continue;
    if (await input.portsBusy(slot)) continue;
    return claim(slot);
  }
  throw new AstackError(
    `All ${input.slots - 1} worktree slots are taken or their ports are busy. Remove worktrees you no longer need (git worktree remove <path>) or raise ports.slots.`,
  );
}

export async function claimSlot(context: Context, now = new Date()): Promise<SlotChoice> {
  ensureAstackDir(context.state.dir);
  return withLock(context.state.lock, async () => {
    const file = readSlots(context.state.slots);
    const choice = await chooseSlot({
      worktree: context.worktree,
      isMain: context.isMain,
      slots: context.config.ports.slots,
      claims: file.claims,
      now,
      pathExists: (path) => fs.existsSync(path),
      portsBusy: async (slot) => {
        for (const port of Object.values(portsForSlot(context.config.ports, slot))) if (await isPortBusy(port)) return true;
        return false;
      },
    });
    const claims = [...choice.claims].sort((a, b) => a.slot - b.slot);
    writeFileAtomic(context.state.slots, `${JSON.stringify({ version: 1, claims } satisfies SlotsFile, null, 2)}\n`);
    return { ...choice, claims };
  });
}
