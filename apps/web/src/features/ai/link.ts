import { InferenceMode } from "firebase/ai";
import type { Grain, TagKind } from "./describe";
import { createHybrid, type InferenceWhere } from "./hybrid";

export const LINK_PROMPT_VERSION = "v3";

export const MAX_ITEMS = 8;
export const MAX_CANDIDATES = 12;

const ITEM_KEYS = Array.from({ length: MAX_ITEMS }, (_, index) => `v${index + 1}`);
const CANDIDATE_KEYS = Array.from({ length: MAX_CANDIDATES }, (_, index) => `c${index + 1}`);

export type LinkFact = {
  text: string;
  kind?: TagKind;
  name?: string;
  about?: string;
  conditions?: string[];
  remarks?: string[];
  when?: { on: string; grain: Grain };
  noteTitle?: string;
  sentence?: string;
};

export type LinkDecision = { match: number | null; changed: boolean };
export type LinkResult = { decisions: LinkDecision[]; where: InferenceWhere; ms: number };

const INSTRUCTIONS = `You match values from a new sentence in someone's notes to values they already track.

For each item, pick the candidate that is the same fact: the same thing measured, about the same subject, under the same conditions, for the same occasion. Its number or text may differ only when the sentence says it has changed.

Subjects can be worded differently and still be the same: "the party" and "Mia's birthday" can be one event, and "dinner" and "the reunion" can be one evening. Two different named things, such as two teams, two shops or two trips, are never the same.

A different name usually means a different thing is measured, such as a deposit and a total, or a budget and the amount spent.

Pick none when:
- the item has a condition the candidate lacks, such as "for the double batch" or "on weekdays", or the candidate has one the item lacks
- the subjects are different things
- they are for different occasions or dates, including a second occasion on the same day, such as "again" or "another one"
- you are not sure

"changed" is true only when the item is the same fact and the sentence gives it a different value.

Example
Sentence: Rosa's Kitchen now says 100 on Saturdays, the wedding is still 14 June, and for the big cake use 400g flour.
Items:
v1: 100 · count · capacity · about Rosa's Kitchen · if on Saturdays
v2: 14 June · date · wedding_date · about wedding
v3: 400g · number · flour · about cake · if for the big cake
Candidates:
c1: 80 · count · capacity · about Rosa's Kitchen · if on Saturdays · in "Catering" · from "Rosa's Kitchen seats 80 on Saturdays."
c2: 80 · count · guest_count · about wedding · in "Catering"
c3: 14 June · date · wedding_date · about ceremony · in "Venue" · from "The ceremony is on 14 June at noon."
c4: 200g · number · flour · about cake · in "Baking"
Answer: {"links":[{"item":"v1","match":"c1","changed":true},{"item":"v2","match":"c3","changed":false},{"item":"v3","match":"none","changed":false}]}`;

const SCHEMA = {
  type: "object",
  properties: {
    links: {
      type: "array",
      maxItems: MAX_ITEMS,
      items: {
        type: "object",
        properties: {
          item: { type: "string", enum: ITEM_KEYS },
          match: { type: "string", enum: [...CANDIDATE_KEYS, "none"] },
          changed: { type: "boolean" },
        },
        required: ["item", "match", "changed"],
      },
    },
  },
  required: ["links"],
};

function line(fact: LinkFact): string {
  return [
    fact.text,
    fact.kind,
    fact.name,
    fact.about && `about ${fact.about}`,
    fact.conditions?.length ? `if ${fact.conditions.join(", ")}` : undefined,
    fact.remarks?.length ? `noted ${fact.remarks.join(", ")}` : undefined,
    fact.when && `on ${fact.when.on}`,
    fact.noteTitle && `in "${fact.noteTitle}"`,
    fact.sentence && `from "${fact.sentence.length > 140 ? `${fact.sentence.slice(0, 140)}…` : fact.sentence}"`,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function createLinker(mode: InferenceMode) {
  const linker = createHybrid("Link values", mode, INSTRUCTIONS, SCHEMA);
  return async ({ sentence, items, candidates }: { sentence: string; items: LinkFact[]; candidates: LinkFact[] }): Promise<LinkResult> => {
    const shownItems = items.slice(0, MAX_ITEMS);
    const shownCandidates = candidates.slice(0, MAX_CANDIDATES);
    const prompt = [
      `Sentence: ${sentence}`,
      "Items:",
      ...shownItems.map((item, index) => `v${index + 1}: ${line({ ...item, noteTitle: undefined, sentence: undefined })}`),
      "Candidates:",
      ...shownCandidates.map((candidate, index) => `c${index + 1}: ${line(candidate)}`),
    ].join("\n");
    const { text, where, ms } = await linker.ask(prompt);
    const links = ((JSON.parse(text) as { links?: unknown }).links ?? []) as { item?: unknown; match?: unknown; changed?: unknown }[];
    const decisions = shownItems.map((_, index): LinkDecision => {
      const link = links.find((entry) => entry.item === `v${index + 1}`);
      const match = typeof link?.match === "string" ? CANDIDATE_KEYS.indexOf(link.match) : -1;
      return match >= 0 && match < shownCandidates.length ? { match, changed: link?.changed === true } : { match: null, changed: false };
    });
    return { decisions, where, ms };
  };
}

export const linkValues = createLinker(InferenceMode.PREFER_IN_CLOUD);
