import { InferenceMode } from "firebase/ai";
import { TAG_KINDS, type TagKind } from "./value-shapes";
import { createHybrid } from "./hybrid";

export const PROPOSE_PROMPT_VERSION = "v1";

export const MAX_GROUPS = 30;
const GROUP_KEYS = Array.from({ length: MAX_GROUPS }, (_, index) => `e${index + 1}`);

export type ProposeGroup = { about: string; period?: string; facts: { name: string; text: string; kind: TagKind }[] };
export type Proposal = { name: string; rowLabel: string; per: "day" | "name"; fields: { name: string; kind: TagKind; sources: string[] }[]; groups: number[] };

const INSTRUCTIONS = `You look at values someone has tracked in their notes, grouped by the thing they are about. Suggest collections: tables where each group becomes one row and similar values line up in the same column.

Only suggest a collection when at least three groups are clearly the same kind of thing, such as several runs, several bills or several suppliers. Use "day" when each row is something that happened on a date, and "name" when each row is a named thing.

For each field, list in "sources" the value names from the groups that belong in that column. Give the collection a short plural name and the row a short singular label.

If nothing repeats, return no collections.

Example
Groups:
e1 · swim · 2026-03-02 · swim_lengths=40 (count), swim_time=35 minutes (duration)
e2 · swim · 2026-03-04 · lengths=32 (count)
e3 · swim · 2026-03-07 · swim_lengths=44 (count), duration=38 minutes (duration)
e4 · dentist · 2026-03-05 · appointment_time=9am (date)
Answer: {"collections":[{"name":"Swims","rowLabel":"swim","per":"day","fields":[{"name":"lengths","kind":"count","sources":["swim_lengths","lengths"]},{"name":"time","kind":"duration","sources":["swim_time","duration"]}],"groups":["e1","e2","e3"]}]}`;

const SCHEMA = {
  type: "object",
  properties: {
    collections: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          rowLabel: { type: "string" },
          per: { type: "string", enum: ["day", "name"] },
          fields: {
            type: "array",
            maxItems: 8,
            items: {
              type: "object",
              properties: { name: { type: "string" }, kind: { type: "string", enum: [...TAG_KINDS] }, sources: { type: "array", items: { type: "string" } } },
              required: ["name", "kind", "sources"],
            },
          },
          groups: { type: "array", items: { type: "string", enum: GROUP_KEYS } },
        },
        required: ["name", "rowLabel", "per", "fields", "groups"],
      },
    },
  },
  required: ["collections"],
};

const proposer = createHybrid("Suggest collections", InferenceMode.ONLY_IN_CLOUD, INSTRUCTIONS, SCHEMA);

export async function proposeCollections(groups: ProposeGroup[]): Promise<Proposal[]> {
  const shown = groups.slice(0, MAX_GROUPS);
  const prompt = [
    "Groups:",
    ...shown.map(
      (group, index) =>
        `e${index + 1} · ${group.about}${group.period ? ` · ${group.period}` : ""} · ${group.facts.map((fact) => `${fact.name}=${fact.text} (${fact.kind})`).join(", ")}`,
    ),
  ].join("\n");
  const { text } = await proposer.ask(prompt);
  const raw = ((JSON.parse(text) as { collections?: unknown }).collections ?? []) as Record<string, unknown>[];
  return raw.flatMap((item): Proposal[] => {
    const indexes = [...new Set((Array.isArray(item.groups) ? item.groups : []).map((key) => GROUP_KEYS.indexOf(String(key))).filter((index) => index >= 0 && index < shown.length))];
    const fields = (Array.isArray(item.fields) ? item.fields : []).flatMap((field: Record<string, unknown>) => {
      const kind = TAG_KINDS.find((candidate) => candidate === field.kind);
      const sources = Array.isArray(field.sources) ? field.sources.filter((source): source is string => typeof source === "string") : [];
      return typeof field.name === "string" && field.name.trim() && kind && sources.length ? [{ name: field.name.trim(), kind, sources }] : [];
    });
    if (indexes.length < 3 || fields.length === 0 || typeof item.name !== "string" || !item.name.trim()) return [];
    return [{ name: item.name.trim(), rowLabel: String(item.rowLabel ?? item.name).trim(), per: item.per === "name" ? "name" : "day", fields, groups: indexes }];
  });
}
