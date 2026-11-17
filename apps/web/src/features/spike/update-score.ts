import type { ProposedUpdate, UpdateAnswer } from "@/features/ai/update-answer";
import type { ExpectedUpdate, UpdateCase } from "./update-samples";

export type UpdateScore = { ok: boolean; expected: number; found: number; wrong: ProposedUpdate[]; missed: ExpectedUpdate[]; blockedShown?: boolean };

const matches = (want: ExpectedUpdate, got: ProposedUpdate) =>
  got.tracked === want.value &&
  (want.amount === undefined || got.quantity.amount === want.amount) &&
  (want.seconds === undefined || got.quantity.seconds === want.seconds) &&
  (want.when === undefined || got.when?.on === want.when);

export function scoreUpdate(sample: UpdateCase, answer: Pick<UpdateAnswer, "updates">): UpdateScore {
  const applied = answer.updates.filter((update) => !update.blocked);
  const missed = sample.expect.filter((want) => !applied.some((got) => matches(want, got)));
  const wrong = applied.filter((got) => !sample.expect.some((want) => matches(want, got)));
  const blockedShown = sample.blocked === undefined ? undefined : answer.updates.some((update) => update.blocked && update.tracked === sample.blocked);
  return { ok: missed.length === 0 && wrong.length === 0, expected: sample.expect.length, found: sample.expect.length - missed.length, wrong, missed, blockedShown };
}
