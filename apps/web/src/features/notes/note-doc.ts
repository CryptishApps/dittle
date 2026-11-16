import type { JSONContent } from "@tiptap/react";
import { VALUE_NODE } from "@/features/editor/value-tag";

export type Inline = { t: "text"; text: string; bold?: true; italic?: true } | { t: "value"; id: string; label: string };

export type Block =
  | { t: "p"; c: Inline[] }
  | { t: "h"; level: 1 | 2 | 3; c: Inline[] }
  | { t: "ul"; items: { c: Inline[] }[] }
  | { t: "todo"; items: { done: boolean; c: Inline[] }[] };

export type NoteDoc = { v: 1; blocks: Block[] };

export const EMPTY_NOTE: NoteDoc = { v: 1, blocks: [{ t: "h", level: 1, c: [] }, { t: "p", c: [] }] };

const hasMark = (node: JSONContent, type: string) => node.marks?.some((mark) => mark.type === type) ?? false;

function toInlines(nodes: JSONContent[] = []): Inline[] {
  return nodes.flatMap((node): Inline[] => {
    if (node.type === VALUE_NODE) return [{ t: "value", id: String(node.attrs?.id), label: String(node.attrs?.label ?? "") }];
    if (node.type === "hardBreak") return [{ t: "text", text: "\n" }];
    if (node.type !== "text" || !node.text) return [];
    return [{ t: "text", text: node.text, ...(hasMark(node, "bold") && { bold: true }), ...(hasMark(node, "italic") && { italic: true }) }];
  });
}

function itemInlines(item: JSONContent): Inline[][] {
  return (item.content ?? []).flatMap((child) =>
    child.type === "paragraph" ? [toInlines(child.content)] : (child.content ?? []).flatMap((nested) => itemInlines(nested)),
  );
}

export function toNoteDoc(json: JSONContent): NoteDoc {
  const blocks = (json.content ?? []).map((node): Block => {
    switch (node.type) {
      case "heading":
        return { t: "h", level: Math.min(3, Math.max(1, Number(node.attrs?.level) || 1)) as 1 | 2 | 3, c: toInlines(node.content) };
      case "bulletList":
        return { t: "ul", items: (node.content ?? []).flatMap(itemInlines).map((c) => ({ c })) };
      case "taskList":
        return {
          t: "todo",
          items: (node.content ?? []).flatMap((item) => itemInlines(item).map((c) => ({ done: Boolean(item.attrs?.checked), c }))),
        };
      default:
        return { t: "p", c: toInlines(node.content) };
    }
  });
  return { v: 1, blocks };
}

function fromInlines(inlines: Inline[]): JSONContent[] | undefined {
  const nodes = inlines.map((inline): JSONContent => {
    if (inline.t === "value") return { type: VALUE_NODE, attrs: { id: inline.id, label: inline.label, mentionSuggestionChar: "@" } };
    if (inline.text === "\n") return { type: "hardBreak" };
    const marks = [...(inline.bold ? [{ type: "bold" }] : []), ...(inline.italic ? [{ type: "italic" }] : [])];
    return { type: "text", text: inline.text, ...(marks.length > 0 && { marks }) };
  });
  return nodes.length > 0 ? nodes : undefined;
}

const paragraph = (c: Inline[]): JSONContent => ({ type: "paragraph", content: fromInlines(c) });

function withTitle(blocks: Block[]): Block[] {
  const [first, ...rest] = blocks;
  const title: Block = first?.t === "h" ? first : { t: "h", level: 1, c: first?.t === "p" ? first.c : [] };
  const body = first && first.t !== "h" && first.t !== "p" ? [first, ...rest] : rest;
  return [title, ...(body.length > 0 ? body : [{ t: "p" as const, c: [] }])];
}

export function fromNoteDoc(doc: NoteDoc): JSONContent {
  return {
    type: "doc",
    content: withTitle(doc.blocks).map((block): JSONContent => {
      switch (block.t) {
        case "h":
          return { type: "heading", attrs: { level: block.level }, content: fromInlines(block.c) };
        case "ul":
          return { type: "bulletList", content: block.items.map((item) => ({ type: "listItem", content: [paragraph(item.c)] })) };
        case "todo":
          return { type: "taskList", content: block.items.map((item) => ({ type: "taskItem", attrs: { checked: item.done }, content: [paragraph(item.c)] })) };
        default:
          return paragraph(block.c);
      }
    }),
  };
}

const inlineText = (inlines: Inline[]) => inlines.map((inline) => (inline.t === "value" ? inline.label : inline.text)).join("");

function blockText(block: Block): string {
  return block.t === "p" || block.t === "h" ? inlineText(block.c) : block.items.map((item) => inlineText(item.c)).join(" · ");
}

export function summarise(doc: NoteDoc): { title: string; preview: string } {
  const [first, ...rest] = doc.blocks.map(blockText).map((text) => text.trim());
  return { title: first ?? "", preview: rest.filter(Boolean).join(" ").slice(0, 160) };
}
