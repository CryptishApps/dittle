import { InferenceMode } from "firebase/ai";
import { createHybrid, type InferenceWhere } from "./hybrid";

export const WRITE_PROMPT_VERSION = "v1";

const MAX_ITEMS = 12;
const NOTE_CHARS = 1800;

export type WriteFormat = "list" | "checklist" | "paragraph";
export type Written = { label: string; format: WriteFormat; items: string[]; where: InferenceWhere; ms: number };

const INSTRUCTIONS = `Someone wrote a request inside their notes, asking for content to be added at that spot. Write exactly what they asked for, using the rest of the note for context, such as the number of guests, dates or names.

Give:
- "label": a short button label for adding it, starting with "Add", such as "Add 7 meals" or "Add a packing list". At most five words.
- "format": "list" for a list of items, "checklist" for things to do or pack, "paragraph" for prose.
- "items": the list items, or the paragraphs for prose. Keep each one short and specific. At most ${MAX_ITEMS}.

Write only the content. Do not repeat the request, add headings, or explain.

Example
Note: Dinner party
Note text: Dinner party for 6 on Saturday. Two guests are vegetarian. add a shopping list here
Request: add a shopping list here
Answer: {"label":"Add a shopping list","format":"checklist","items":["Chicken thighs (4 guests)","Halloumi (2 vegetarian guests)","New potatoes","Green beans","Lemons","Thyme","Double cream","Raspberries"]}`;

const SCHEMA = {
  type: "object",
  properties: {
    label: { type: "string" },
    format: { type: "string", enum: ["list", "checklist", "paragraph"] },
    items: { type: "array", items: { type: "string" }, maxItems: MAX_ITEMS },
  },
  required: ["label", "format", "items"],
};

const writer = createHybrid("Write a request", InferenceMode.PREFER_ON_DEVICE, INSTRUCTIONS, SCHEMA);

export async function writeRequest({ request, noteTitle, noteText }: { request: string; noteTitle: string; noteText: string }): Promise<Written> {
  const context = noteText.length > NOTE_CHARS ? `${noteText.slice(0, NOTE_CHARS)}…` : noteText;
  const { text, where, ms } = await writer.ask([`Note: ${noteTitle || "Untitled"}`, `Note text: ${context}`, `Request: ${request}`].join("\n"));
  const data = JSON.parse(text) as { label?: unknown; format?: unknown; items?: unknown };
  const items = (Array.isArray(data.items) ? data.items : []).filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, MAX_ITEMS);
  const format: WriteFormat = data.format === "checklist" || data.format === "paragraph" ? data.format : "list";
  const label = typeof data.label === "string" && data.label.trim() ? data.label.trim() : `Add ${items.length} ${items.length === 1 ? "item" : "items"}`;
  return { label, format, items, where, ms };
}
