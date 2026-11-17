import type { Editor } from "@tiptap/core";
import type { EditorServices } from "./services";
import { foundValueAt, spottingKey } from "./spotting";
import { VALUE_NODE } from "./value-node";
import { describeInBackground, type TrackedValue, type ValueStore } from "./values";

const DESCRIBE_WAIT_MS = 20_000;

type Block = { from: number; to: number };

function blockAround(editor: Editor, at: number): Block | undefined {
  const $at = editor.state.doc.resolve(at);
  if (!$at.parent.isTextblock) return undefined;
  return { from: $at.before(), to: $at.after() };
}

function trackSpotted(editor: Editor, store: ValueStore, block: Block, noteId: string | undefined): TrackedValue[] {
  const plugin = spottingKey.getState(editor.state);
  if (!plugin) return [];
  const ids = plugin.decorations.find(block.from, block.to).map((decoration) => decoration.spec.id as string);
  const hits = [...new Set(ids)]
    .map((id) => foundValueAt(editor.state, id))
    .filter((hit) => hit !== undefined)
    .sort((a, b) => b.from - a.from);
  const added: TrackedValue[] = [];
  const sentence = editor.state.doc.resolve(block.from + 1).parent.textContent;
  for (const hit of hits) {
    const { quote, kind, name, about, event, when, conditions, remarks, amount, before, after, seconds, unit, described, link } = hit.value;
    if (link) {
      editor.chain().insertContentAt({ from: hit.from, to: hit.to }, { type: VALUE_NODE, attrs: { id: link.factId, label: quote, mentionSuggestionChar: "@" } }).run();
      continue;
    }
    const origin = { noteId, sentence };
    const value = store.add(
      quote,
      described ? { kind, name, subject: about ? { label: about } : undefined, event, when, conditions, remarks, amount, before, after, seconds, unit, origin } : { kind, name, origin },
    );
    editor.chain().insertContentAt({ from: hit.from, to: hit.to }, { type: VALUE_NODE, attrs: { id: value.id, label: quote, mentionSuggestionChar: "@" } }).run();
    added.push(value);
  }
  return added;
}

function tagIdsIn(editor: Editor, block: Block): string[] {
  const ids: string[] = [];
  editor.state.doc.nodesBetween(block.from, Math.min(block.to, editor.state.doc.content.size), (node) => {
    if (node.type.name === VALUE_NODE && typeof node.attrs.id === "string" && !ids.includes(node.attrs.id)) ids.push(node.attrs.id);
  });
  return ids;
}

type Context = { sentence: string; noteTitle: string; noteId?: string };

const isDescribed = (value: TrackedValue) => Boolean(value.subject) || value.event !== undefined || Boolean(value.when);

function described(store: ValueStore, value: TrackedValue, context: Context): Promise<TrackedValue> {
  return new Promise((resolve) => {
    const latest = () => ({ ...value, ...store.get(value.id) });
    const timer = window.setTimeout(() => resolve(latest()), DESCRIBE_WAIT_MS);
    const done = (result: TrackedValue) => {
      window.clearTimeout(timer);
      resolve(result);
    };
    const current = latest();
    if (isDescribed(current) && !current.naming) return done(current);
    if (current.naming) {
      const stop = store.subscribe(() => {
        if (store.get(value.id)?.naming !== false) return;
        stop();
        done(latest());
      });
      return;
    }
    describeInBackground(store, current, context, done);
  });
}

export async function fileParagraph(editor: Editor, store: ValueStore, services: EditorServices, at: number, list: string): Promise<boolean> {
  const block = blockAround(editor, at);
  if (!block || !services.fileValues) return false;
  const sentence = editor.state.doc.resolve(block.from + 1).parent.textContent;
  const context = { sentence, noteTitle: editor.state.doc.firstChild?.textContent ?? "", noteId: services.noteId };
  const added = new Map(trackSpotted(editor, store, block, services.noteId).map((value) => [value.id, value]));
  const values = tagIdsIn(editor, blockAround(editor, block.from + 1) ?? block)
    .map((id) => store.get(id) ?? added.get(id))
    .filter((value) => value !== undefined);
  const ready = await Promise.all(values.map((value) => described(store, value, context)));
  return services.fileValues(ready, list, sentence);
}
