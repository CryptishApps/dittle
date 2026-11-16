import { useEffect, useRef, useState } from "react";
import type { Proposal } from "@/features/ai/propose";
import type { StoredValue } from "@/features/notes/fact";
import { groupsOf, planFromProposal, type CollectionPlan, type FactGroup } from "./logic";

const DISMISSED_KEY = "dittle.dismissedSuggestions";
const WAIT_MS = 5000;
const MIN_GROUPS = 3;

export type Suggestion = { id: string; proposal: Proposal; plan: CollectionPlan; rowCount: number };

function readDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids].slice(-100)));
  } catch {}
}

const signatureOf = (proposal: Proposal, groups: FactGroup[]) =>
  `${proposal.name.toLowerCase()}|${proposal.groups
    .map((index) => groups[index]?.key)
    .sort()
    .join(",")}`;

export function useCollectionSuggestions(values: StoredValue[], online: boolean): { suggestions: Suggestion[]; dismiss: (id: string) => void; accept: (id: string) => Suggestion | undefined } {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [dismissed, setDismissed] = useState(readDismissed);
  const lastAsked = useRef("");

  const groups = groupsOf(values);
  const askKey = groups.map((group) => `${group.key}:${group.facts.length}`).join(";");

  useEffect(() => {
    if (!online || groups.length < MIN_GROUPS || askKey === lastAsked.current) return;
    const timer = window.setTimeout(() => {
      lastAsked.current = askKey;
      void import("@/features/ai/propose")
        .then(({ proposeCollections }) =>
          proposeCollections(groups.map((group) => ({ about: group.about, period: group.period, facts: group.facts.map((fact) => ({ name: fact.name ?? "value", text: fact.text, kind: fact.kind ?? "text" })) }))),
        )
        .then((proposals) =>
          setSuggestions(
            proposals.map((proposal) => {
              const plan = planFromProposal(proposal, groups);
              return { id: signatureOf(proposal, groups), proposal, plan, rowCount: plan.rows.length };
            }),
          ),
        )
        .catch((error: unknown) => console.warn("Dittle could not suggest collections", error));
    }, WAIT_MS);
    return () => window.clearTimeout(timer);
  }, [askKey, online]);

  const visible = suggestions.filter((suggestion) => !dismissed.has(suggestion.id) && suggestion.plan.cells.length > 0);

  const dismiss = (id: string) => {
    const next = new Set(dismissed).add(id);
    setDismissed(next);
    saveDismissed(next);
  };

  const accept = (id: string) => {
    const found = visible.find((suggestion) => suggestion.id === id);
    if (found) setSuggestions((current) => current.filter((suggestion) => suggestion.id !== id));
    return found;
  };

  return { suggestions: visible, dismiss, accept };
}
