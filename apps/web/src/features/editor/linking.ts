import type { Editor } from "@tiptap/core";
import type { LinkFact } from "@/features/ai/link";
import { periodOf } from "@/features/collections/logic";
import { recompute } from "@/features/formulas/apply";
import type { FactFields } from "@/features/notes/fact";
import { VALUE_NODE } from "./value-node";
import type { TrackedValue, ValueStore } from "./values";

export const MAX_CANDIDATES = 12;

export type LinkTarget = { factId: string; changed: boolean };

export type LinkProbe = Pick<FactFields, "text" | "kind" | "name" | "conditions" | "remarks" | "when" | "event" | "notSame" | "updatedAt"> & { id?: string; about?: string };

const aboutOf = (value: LinkProbe | TrackedValue) => ("subject" in value && value.subject?.label) || ("about" in value ? value.about : undefined);

const toFact = (value: LinkProbe | TrackedValue): LinkFact => ({
  text: value.text,
  kind: value.kind,
  name: value.name,
  about: aboutOf(value) || undefined,
  conditions: value.conditions,
  remarks: value.remarks,
  when: value.when,
});

function differentOccasion(probe: LinkProbe, value: TrackedValue): boolean {
  if (probe.when && value.when && probe.when.grain === value.when.grain) return probe.when.on !== value.when.on;
  return periodOf(probe) !== periodOf(value);
}

export function candidatesFor(probe: LinkProbe, values: TrackedValue[], noteId?: string): TrackedValue[] {
  return values
    .filter((value) => value.id !== probe.id && !value.proposal && value.kind !== undefined && value.kind === probe.kind)
    .filter((value) => !probe.notSame?.includes(value.id) && !(probe.id && value.notSame?.includes(probe.id)))
    .filter((value) => !(probe.event && value.event && differentOccasion(probe, value)))
    .sort((a, b) => Number(b.origin?.noteId === noteId) - Number(a.origin?.noteId === noteId) || (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

type FindLinksInput = {
  sentence: string;
  probes: LinkProbe[];
  values: TrackedValue[];
  noteId?: string;
  noteTitle: (noteId: string | undefined) => string | undefined;
};

export async function findLinks({ sentence, probes, values, noteId, noteTitle }: FindLinksInput): Promise<(LinkTarget | null)[]> {
  const pools = probes.map((probe) => candidatesFor(probe, values, noteId));
  const union: TrackedValue[] = [];
  for (let rank = 0; union.length < MAX_CANDIDATES && pools.some((pool) => pool[rank]); rank += 1) {
    for (const pool of pools) {
      const candidate = pool[rank];
      if (candidate && !union.includes(candidate) && union.length < MAX_CANDIDATES) union.push(candidate);
    }
  }
  if (union.length === 0) return probes.map(() => null);

  const { linkValues } = await import("@/features/ai/link");
  const { decisions } = await linkValues({
    sentence,
    items: probes.map(toFact),
    candidates: union.map((candidate) => ({ ...toFact(candidate), noteTitle: noteTitle(candidate.origin?.noteId), sentence: candidate.origin?.sentence })),
  });
  return probes.map((_, index) => {
    const decision = decisions[index];
    const candidate = decision?.match === null || decision === undefined ? undefined : union[decision.match];
    return candidate && pools[index]!.includes(candidate) ? { factId: candidate.id, changed: decision!.changed } : null;
  });
}

export function repoint(editor: Editor, fromId: string, toId: string, label: string): void {
  const { tr } = editor.state;
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === VALUE_NODE && node.attrs.id === fromId) tr.setNodeMarkup(pos, undefined, { ...node.attrs, id: toId, label });
  });
  if (tr.docChanged) editor.view.dispatch(tr);
}

export function relabelInEditor(editor: Editor, valueId: string, label: string): void {
  const { tr } = editor.state;
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === VALUE_NODE && node.attrs.id === valueId && node.attrs.label !== label) tr.setNodeMarkup(pos, undefined, { ...node.attrs, label });
  });
  if (tr.docChanged) editor.view.dispatch(tr);
}

export type Quantity = Pick<FactFields, "amount" | "seconds">;
export type Change = { id: string; text: string } & Quantity;

const sameQuantity = (fact: Quantity, next: Quantity) =>
  (next.amount === undefined || next.amount === fact.amount) && (next.seconds === undefined || next.seconds === fact.seconds);

export function changeEverywhere(store: ValueStore, factId: string, text: string, quantity: Quantity = {}): Change[] {
  const fact = store.get(factId);
  if (!fact || (fact.text === text && sameQuantity(fact, quantity))) return [];
  const changes: Change[] = [{ id: factId, text, ...quantity }];
  if (quantity.amount !== undefined) changes.push(...recompute(factId, store.list(), new Map([[factId, quantity.amount]])));
  for (const change of changes) {
    const current = store.get(change.id);
    if (!current) continue;
    store.update(change.id, {
      text: change.text,
      ...(change.amount !== undefined && { amount: change.amount }),
      ...(change.seconds !== undefined && { seconds: change.seconds }),
      history: [...(current.history ?? []), { text: current.text, at: Date.now() }].slice(-10),
    });
  }
  return changes;
}
