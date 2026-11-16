import type { Editor } from "@tiptap/core";
import type { LinkFact } from "@/features/ai/link";
import type { FactFields } from "@/features/notes/fact";
import { VALUE_NODE } from "./value-tag";
import type { TrackedValue, ValueStore } from "./values";

export const MAX_CANDIDATES = 12;

export type LinkTarget = { factId: string; changed: boolean };

export type LinkProbe = Pick<FactFields, "text" | "kind" | "name" | "conditions" | "when" | "event" | "notSame"> & { id?: string; about?: string };

const aboutOf = (value: LinkProbe | TrackedValue) => ("subject" in value && value.subject?.label) || ("about" in value ? value.about : undefined);

const toFact = (value: LinkProbe | TrackedValue): LinkFact => ({
  text: value.text,
  kind: value.kind,
  name: value.name,
  about: aboutOf(value) || undefined,
  conditions: value.conditions,
  when: value.when,
});

export function candidatesFor(probe: LinkProbe, values: TrackedValue[], noteId?: string): TrackedValue[] {
  return values
    .filter((value) => value.id !== probe.id && !value.proposal && value.kind !== undefined && value.kind === probe.kind)
    .filter((value) => !probe.notSame?.includes(value.id) && !(probe.id && value.notSame?.includes(probe.id)))
    .filter((value) => !(probe.event && value.event && probe.when && value.when && probe.when.grain === value.when.grain && probe.when.on !== value.when.on))
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

export function changeEverywhere(store: ValueStore, factId: string, text: string): void {
  const fact = store.get(factId);
  if (!fact || fact.text === text) return;
  store.update(factId, { text, history: [...(fact.history ?? []), { text: fact.text, at: Date.now() }].slice(-10) });
}
