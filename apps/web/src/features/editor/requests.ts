import { Extension, type Editor, type JSONContent } from "@tiptap/core";
import { Plugin, PluginKey, type EditorState, type Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import type { Written } from "@/features/ai/write";

export type RequestItem = { id: string; text: string; status: "writing" | "ready" | "failed"; written?: Written };
export type RequestPlacement = { from: number; to: number; text: string };

type RequestsState = { decorations: DecorationSet; items: Map<string, RequestItem> };
type RequestsMeta = { block: { from: number; to: number }; placements: (RequestPlacement & { id: string })[] } | { update: RequestItem };

export const requestsKey = new PluginKey<RequestsState>("requests");

export type RequestsOptions = {
  write: (input: { request: string; noteTitle: string; noteText: string }) => Promise<Written>;
};

function button(view: EditorView, id: string): HTMLElement {
  const item = requestsKey.getState(view.state)?.items.get(id);
  const element = document.createElement("button");
  element.type = "button";
  element.className = "request-button";
  element.dataset.request = id;
  element.dataset.status = item?.status ?? "writing";
  element.contentEditable = "false";
  if (item?.status === "ready" && item.written?.items.length) {
    element.textContent = `＋ ${item.written.label}`;
  } else if (item?.status === "failed") {
    element.textContent = "Couldn't write this";
    element.disabled = true;
  } else {
    element.innerHTML = '<span class="t-shimmer-text" data-text="Writing">Writing</span>';
    element.disabled = true;
  }
  return element;
}

const decorationsFor = (placement: RequestPlacement & { id: string }, status: string) => [
  Decoration.inline(placement.from, placement.to, { class: "value-request", "data-request-text": placement.id }, { id: placement.id, kind: "text" }),
  Decoration.widget(placement.to, (view) => button(view, placement.id), { id: placement.id, kind: "button", side: 1, key: `${placement.id}:${status}` }),
];

function touched(tr: Transaction, decorations: DecorationSet): Decoration[] {
  const hits: Decoration[] = [];
  tr.mapping.maps.forEach((map, index) => {
    map.forEach((_oldStart, _oldEnd, newStart, newEnd) => {
      const rest = tr.mapping.slice(index + 1);
      const from = rest.map(newStart, -1);
      const to = rest.map(newEnd, 1);
      const inside = decorations.find(from, to).filter((decoration) => decoration.spec.kind === "text" && decoration.from < to && decoration.to > from);
      for (const decoration of inside) hits.push(...decorations.find(undefined, undefined, (spec) => spec.id === decoration.spec.id));
    });
  });
  return hits;
}

function requestsPlugin(editor: Editor) {
  return new Plugin<RequestsState>({
    key: requestsKey,
    state: {
      init: () => ({ decorations: DecorationSet.empty, items: new Map() }),
      apply(tr, previous) {
        let decorations = previous.decorations.map(tr.mapping, tr.doc);
        if (tr.docChanged) {
          const hits = touched(tr, decorations);
          if (hits.length) decorations = decorations.remove(hits);
          const texts = new Set(decorations.find(undefined, undefined, (spec) => spec.kind === "text").map((decoration) => decoration.spec.id));
          const orphans = decorations.find(undefined, undefined, (spec) => spec.kind === "button" && !texts.has(spec.id));
          if (orphans.length) decorations = decorations.remove(orphans);
        }
        const meta = tr.getMeta(requestsKey) as RequestsMeta | undefined;
        if (!meta) return { decorations, items: previous.items };
        const items = new Map(previous.items);
        if ("update" in meta) {
          items.set(meta.update.id, meta.update);
          const old = decorations.find(undefined, undefined, (spec) => spec.id === meta.update.id);
          const text = old.find((decoration) => decoration.spec.kind === "text");
          if (!text) return { decorations, items };
          return {
            decorations: decorations.remove(old).add(tr.doc, decorationsFor({ id: meta.update.id, from: text.from, to: text.to, text: meta.update.text }, meta.update.status)),
            items,
          };
        }
        decorations = decorations.remove(decorations.find(meta.block.from, meta.block.to));
        const added = meta.placements.flatMap((placement) => {
          if (!items.has(placement.id)) items.set(placement.id, { id: placement.id, text: placement.text, status: "writing" });
          return decorationsFor(placement, items.get(placement.id)!.status);
        });
        return { decorations: decorations.add(tr.doc, added), items };
      },
    },
    props: {
      decorations: (state) => requestsKey.getState(state)?.decorations,
      handleDOMEvents: {
        mousedown: (_view, event) => {
          const target = (event.target as HTMLElement).closest<HTMLElement>(".request-button");
          if (!target?.dataset.request) return false;
          event.preventDefault();
          return true;
        },
        click: (_view, event) => {
          const target = (event.target as HTMLElement).closest<HTMLElement>(".request-button");
          if (!target?.dataset.request || target.dataset.status !== "ready") return false;
          insertRequest(editor, target.dataset.request, false);
          return true;
        },
      },
    },
  });
}

export function requestRange(state: EditorState, id: string): { from: number; to: number } | undefined {
  const [text] = requestsKey.getState(state)?.decorations.find(undefined, undefined, (spec) => spec.id === id && spec.kind === "text") ?? [];
  return text ? { from: text.from, to: text.to } : undefined;
}

function contentFor(written: Written): JSONContent[] {
  const paragraph = (text: string): JSONContent => ({ type: "paragraph", content: [{ type: "text", text }] });
  if (written.format === "paragraph") return written.items.map(paragraph);
  if (written.format === "checklist") return [{ type: "taskList", content: written.items.map((item) => ({ type: "taskItem", attrs: { checked: false }, content: [paragraph(item)] })) }];
  return [{ type: "bulletList", content: written.items.map((item) => ({ type: "listItem", content: [paragraph(item)] })) }];
}

export function insertRequest(editor: Editor, id: string, removeRequest: boolean): void {
  const item = requestsKey.getState(editor.state)?.items.get(id);
  const range = requestRange(editor.state, id);
  if (!item?.written || !range) return;
  const $from = editor.state.doc.resolve(range.from);
  const blockStart = $from.before();
  const after = $from.after();
  const blockText = $from.parent.textContent;
  const onlyRequest = blockText.trim() === item.text.trim();
  const content = contentFor(item.written);
  const chain = editor.chain().insertContentAt(after, content);
  if (removeRequest) chain.deleteRange(onlyRequest ? { from: blockStart, to: after } : range);
  chain.run();
  const insertedAt = removeRequest && onlyRequest ? blockStart : removeRequest ? after - (range.to - range.from) : after;
  window.requestAnimationFrame(() => {
    const dom = editor.view.nodeDOM(insertedAt);
    if (dom instanceof HTMLElement) dom.classList.add("just-inserted");
  });
}

type RequestsStorage = { cache: Map<string, Written>; found: (block: { from: number; to: number }, placements: RequestPlacement[]) => void };

declare module "@tiptap/core" {
  interface Storage {
    requests: RequestsStorage;
  }
}

export const Requests = Extension.create<RequestsOptions, RequestsStorage>({
  name: "requests",

  addOptions() {
    return { write: () => Promise.reject(new Error("Requests need a writer")) };
  },

  addStorage() {
    return { cache: new Map(), found: () => undefined };
  },

  addProseMirrorPlugins() {
    return [requestsPlugin(this.editor)];
  },

  onCreate() {
    const editor = this.editor;
    const { cache } = this.storage;
    const update = (item: RequestItem) => {
      if (!editor.isDestroyed) editor.view.dispatch(editor.state.tr.setMeta(requestsKey, { update: item }).setMeta("addToHistory", false));
    };
    this.storage.found = (block, placements) => {
      const withIds = placements.map((placement) => ({ ...placement, id: `request:${placement.text}` }));
      editor.view.dispatch(editor.state.tr.setMeta(requestsKey, { block, placements: withIds }).setMeta("addToHistory", false));
      for (const placement of withIds) {
        const cached = cache.get(placement.text);
        if (cached) {
          update({ id: placement.id, text: placement.text, status: "ready", written: cached });
          continue;
        }
        const item = requestsKey.getState(editor.state)?.items.get(placement.id);
        if (item?.status === "ready") continue;
        const noteTitle = editor.state.doc.firstChild?.textContent ?? "";
        this.options
          .write({ request: placement.text, noteTitle, noteText: editor.state.doc.textBetween(0, editor.state.doc.content.size, "\n", " ") })
          .then((written) => {
            cache.set(placement.text, written);
            update({ id: placement.id, text: placement.text, status: written.items.length ? "ready" : "failed", written });
          })
          .catch((error: unknown) => {
            console.warn("Dittle could not write a request", error);
            update({ id: placement.id, text: placement.text, status: "failed" });
          });
      }
    };
  },
});
