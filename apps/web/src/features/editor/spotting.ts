import { Extension, type Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, type EditorState, type Transaction } from "@tiptap/pm/state";
import { Mapping } from "@tiptap/pm/transform";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { DescribeResult, FindResult, SpottedValue, ValueContext } from "@/features/ai/describe";
import type { LinkTarget } from "./linking";
import { VALUE_NODE } from "./value-tag";

export type FoundValue = SpottedValue & Partial<ValueContext> & { id: string; described: boolean; link?: LinkTarget | null };

type SpottingState = { decorations: DecorationSet; found: Map<string, FoundValue> };
type Placement = { from: number; to: number; value: FoundValue };
type SetMeta = { block: { from: number; to: number }; placements: Placement[] } | { context: Map<string, ValueContext> } | { links: Map<string, LinkTarget | null> };

export const spottingKey = new PluginKey<SpottingState>("spotting");

export type SpottingOptions = {
  find: (input: { paragraph: string; noteTitle: string }) => Promise<FindResult>;
  describe: (input: { paragraph: string; noteTitle: string; quotes: string[] }) => Promise<DescribeResult>;
  link?: (sentence: string, values: FoundValue[]) => Promise<(LinkTarget | null)[]>;
  onRequests?: (block: { from: number; to: number }, requests: { from: number; to: number; text: string }[]) => void;
  continuous: () => boolean;
};

type Segment = { text: string; pos: number; atom: boolean };

function segmentsOf(block: PMNode, blockStart: number): Segment[] {
  const segments: Segment[] = [];
  block.forEach((child, offset) => {
    const pos = blockStart + 1 + offset;
    if (child.isText) segments.push({ text: child.text ?? "", pos, atom: false });
    else if (child.type.name === VALUE_NODE) segments.push({ text: String(child.attrs.label ?? ""), pos, atom: true });
    else segments.push({ text: child.isLeaf ? " " : child.textContent, pos, atom: true });
  });
  return segments;
}

const textOf = (segments: Segment[]) => segments.map((segment) => segment.text).join("");

function docRange(segments: Segment[], start: number, end: number): { from: number; to: number } | undefined {
  let offset = 0;
  let from: number | undefined;
  for (const segment of segments) {
    const segmentEnd = offset + segment.text.length;
    const overlaps = start < segmentEnd && end > offset;
    if (overlaps && segment.atom) return undefined;
    if (from === undefined && start >= offset && start < segmentEnd) from = segment.pos + (start - offset);
    if (end > offset && end <= segmentEnd) return from === undefined ? undefined : { from, to: segment.pos + (end - offset) };
    offset = segmentEnd;
  }
  return undefined;
}

function changedRanges(tr: Transaction): { from: number; to: number }[] {
  const ranges: { from: number; to: number }[] = [];
  tr.mapping.maps.forEach((map, index) => {
    map.forEach((_oldStart, _oldEnd, newStart, newEnd) => {
      const rest = tr.mapping.slice(index + 1);
      ranges.push({ from: rest.map(newStart, -1), to: rest.map(newEnd, 1) });
    });
  });
  return ranges;
}

function spottingPlugin() {
  return new Plugin<SpottingState>({
    key: spottingKey,
    state: {
      init: () => ({ decorations: DecorationSet.empty, found: new Map() }),
      apply(tr, previous, _old, state) {
        let decorations = previous.decorations.map(tr.mapping, tr.doc);
        if (tr.docChanged) {
          const touched = changedRanges(tr).flatMap(({ from, to }) => decorations.find(from, to).filter((decoration) => decoration.from < to && decoration.to > from));
          if (touched.length) decorations = decorations.remove(touched);
        }
        const meta = tr.getMeta(spottingKey) as SetMeta | undefined;
        if (!meta) return { decorations, found: previous.found };
        if ("links" in meta) {
          const found = new Map(previous.found);
          const replaced: Decoration[] = [];
          const restyled: Decoration[] = [];
          meta.links.forEach((link, id) => {
            const value = found.get(id);
            if (!value) return;
            found.set(id, { ...value, link });
            const [decoration] = decorations.find(undefined, undefined, (spec) => spec.id === id);
            if (!decoration || !link) return;
            replaced.push(decoration);
            restyled.push(Decoration.inline(decoration.from, decoration.to, { class: "value-found", "data-found": id, "data-link": link.changed ? "changed" : "same" }, { id }));
          });
          return { decorations: decorations.remove(replaced).add(tr.doc, restyled), found };
        }
        if ("context" in meta) {
          const found = new Map(previous.found);
          meta.context.forEach((context, id) => {
            const value = found.get(id);
            if (value) found.set(id, { ...value, ...context, described: true });
          });
          return { decorations, found };
        }
        decorations = decorations.remove(decorations.find(meta.block.from, meta.block.to));
        const found = new Map(previous.found);
        const added = meta.placements
          .filter((placement) => placement.to <= state.doc.content.size)
          .map((placement) => {
            found.set(placement.value.id, placement.value);
            return Decoration.inline(placement.from, placement.to, { class: "value-found", "data-found": placement.value.id }, { id: placement.value.id });
          });
        return { decorations: decorations.add(tr.doc, added), found };
      },
    },
    props: {
      decorations: (state) => spottingKey.getState(state)?.decorations,
    },
  });
}

export function foundValueAt(state: EditorState, id: string): { value: FoundValue; from: number; to: number } | undefined {
  const plugin = spottingKey.getState(state);
  const value = plugin?.found.get(id);
  const [decoration] = plugin?.decorations.find(undefined, undefined, (spec) => spec.id === id) ?? [];
  return value && decoration ? { value, from: decoration.from, to: decoration.to } : undefined;
}

const sentenceSplitter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter("en", { granularity: "sentence" }) : undefined;

function endsSentence(textBeforeCaret: string): boolean {
  if (!sentenceSplitter || !/\s$/.test(textBeforeCaret)) return false;
  const segments = [...sentenceSplitter.segment(`${textBeforeCaret}X`)];
  return segments.length > 1 && segments.at(-1)?.segment === "X";
}

class Scheduler {
  private dirty = new Set<number>();
  private running: { mapping: Mapping } | undefined;
  private timer: number | undefined;
  private lastChange = 0;
  private gaps: number[] = [];

  constructor(
    private readonly editor: Editor,
    private readonly options: SpottingOptions,
  ) {}

  onTransaction(tr: Transaction) {
    this.running?.mapping.appendMapping(tr.mapping);
    if (!tr.docChanged) return;
    this.dirty = new Set([...this.dirty].map((pos) => tr.mapping.map(pos)));
    const { $head } = tr.selection;
    if (!$head.parent.isTextblock) return;
    const blockStart = $head.before();
    const wasBlock = tr.mapping.invert().map(blockStart);
    this.dirty.add(blockStart);

    const now = performance.now();
    if (this.lastChange) this.gaps = [...this.gaps, now - this.lastChange].slice(-12);
    this.lastChange = now;

    const before = $head.parent.textBetween(0, $head.parentOffset, undefined, " ");
    const newBlock = wasBlock !== blockStart && $head.parentOffset === 0;
    const wordDone = /\s$/.test(before);
    if (newBlock || (this.options.continuous() ? wordDone : endsSentence(before))) this.start();
    this.waitForPause();
  }

  private pause(): number {
    if (this.gaps.length < 3) return 1200;
    const sorted = [...this.gaps].sort((a, b) => a - b);
    const typical = sorted[Math.floor(sorted.length / 2)]!;
    return Math.min(2000, Math.max(600, typical * 3));
  }

  private waitForPause() {
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.start(), this.pause());
  }

  scan() {
    if (this.editor.isDestroyed) return;
    this.editor.state.doc.descendants((node, pos) => {
      if (node.isTextblock && node.textContent.trim()) this.dirty.add(pos);
      return !node.isTextblock;
    });
    this.start();
  }

  destroy() {
    window.clearTimeout(this.timer);
    this.dirty.clear();
  }

  private pick(): number | undefined {
    const { $head } = this.editor.state.selection;
    const caretBlock = $head.parent.isTextblock ? $head.before() : undefined;
    const others = [...this.dirty].filter((pos) => pos !== caretBlock);
    return others[0] ?? (caretBlock !== undefined && this.dirty.has(caretBlock) ? caretBlock : undefined);
  }

  private start() {
    if (this.running || this.editor.isDestroyed) return;
    const blockStart = this.pick();
    if (blockStart === undefined) return;
    const block = this.editor.state.doc.nodeAt(blockStart);
    if (!block?.isTextblock) {
      this.dirty.delete(blockStart);
      return;
    }
    const segments = segmentsOf(block, blockStart);
    const full = textOf(segments);
    const { $head } = this.editor.state.selection;
    const caretHere = $head.parent === block && $head.before() === blockStart;
    const typingAtEnd = caretHere && $head.parentOffset === block.content.size && !/\s$/.test(full);
    const checked = typingAtEnd && !endsSentence(`${full} `) ? full.slice(0, Math.max(0, full.search(/\s\S*$/))) : full;
    this.dirty.delete(blockStart);
    if (!checked.trim()) return;

    const running = { mapping: new Mapping() };
    this.running = running;
    const noteTitle = this.editor.state.doc.firstChild?.textContent ?? "";
    let failed = false;
    this.options
      .find({ paragraph: checked, noteTitle })
      .then((result) => {
        const placed = this.place(blockStart, running.mapping, checked, result);
        if (placed.length) this.describe(checked, noteTitle, placed);
      })
      .catch(() => {
        failed = true;
        this.dirty.add(running.mapping.map(blockStart));
      })
      .finally(() => {
        this.running = undefined;
        if (failed || !this.dirty.size) return;
        if (this.options.continuous() || performance.now() - this.lastChange >= this.pause()) this.start();
        else this.waitForPause();
      });
  }

  private describe(paragraph: string, noteTitle: string, placed: FoundValue[]) {
    this.options
      .describe({ paragraph, noteTitle, quotes: placed.map((value) => value.quote) })
      .then(({ values }) => {
        if (this.editor.isDestroyed) return;
        const context = new Map<string, ValueContext>();
        placed.forEach((value, index) => {
          const described = values[index];
          if (described) {
            const { about, event, when, conditions, remarks, amount, before, after, seconds } = described;
            context.set(value.id, { about, event, when, conditions, remarks, amount, before, after, seconds });
          }
        });
        this.editor.view.dispatch(this.editor.state.tr.setMeta(spottingKey, { context }).setMeta("addToHistory", false));
        const described = placed.flatMap((value) => {
          const extra = context.get(value.id);
          return extra ? [{ ...value, ...extra, described: true }] : [];
        });
        if (this.options.link && described.length) return this.options.link(paragraph, described).then((links) => this.applyLinks(described, links));
      })
      .catch((error: unknown) => console.warn("Dittle could not describe or link spotted values", error));
  }

  private applyLinks(values: FoundValue[], links: (LinkTarget | null)[]) {
    if (this.editor.isDestroyed) return;
    const map = new Map(values.map((value, index) => [value.id, links[index] ?? null] as const));
    this.editor.view.dispatch(this.editor.state.tr.setMeta(spottingKey, { links: map }).setMeta("addToHistory", false));
  }

  private place(blockStart: number, mapping: Mapping, checked: string, result: FindResult): FoundValue[] {
    if (this.editor.isDestroyed) return [];
    const mapped = mapping.mapResult(blockStart);
    if (mapped.deleted) return [];
    const { state } = this.editor;
    const block = state.doc.nodeAt(mapped.pos);
    if (!block?.isTextblock) return [];
    const segments = segmentsOf(block, mapped.pos);
    const text = textOf(segments);
    if (!text.startsWith(checked) && text !== checked) this.dirty.add(mapped.pos);

    const { $head } = state.selection;
    const caretInBlock = $head.parent === block && $head.before() === mapped.pos;
    const caret = caretInBlock ? $head.pos : -1;
    const used: { from: number; to: number }[] = [];
    const placements: Placement[] = [];
    for (const value of result.values) {
      let index = text.indexOf(value.quote);
      while (index !== -1) {
        const range = docRange(segments, index, index + value.quote.length);
        const free = range && !used.some((taken) => range.from < taken.to && range.to > taken.from);
        const unfinished = range && caret >= range.from && caret <= range.to && !/\s/.test(text.slice(index + value.quote.length, index + value.quote.length + 1) || "x");
        if (range && free && !unfinished) {
          used.push(range);
          placements.push({ ...range, value: { ...value, id: crypto.randomUUID(), described: false } });
          break;
        }
        index = text.indexOf(value.quote, index + 1);
      }
    }
    const meta: SetMeta = { block: { from: mapped.pos, to: mapped.pos + block.nodeSize }, placements };
    this.editor.view.dispatch(state.tr.setMeta(spottingKey, meta).setMeta("addToHistory", false));
    const requests = mapped.pos === 0 ? [] : result.requests.flatMap((request) => {
      const index = text.indexOf(request);
      const range = index === -1 ? undefined : docRange(segments, index, index + request.length);
      return range ? [{ ...range, text: request }] : [];
    });
    this.options.onRequests?.(meta.block, requests);
    return placements.map((placement) => placement.value);
  }
}

export const Spotting = Extension.create<SpottingOptions, { scheduler?: Scheduler }>({
  name: "spotting",

  addOptions() {
    const missing = () => Promise.reject(new Error("Spotting needs find and describe"));
    return { find: missing, describe: missing, continuous: () => false };
  },

  addStorage() {
    return { scheduler: undefined };
  },

  addProseMirrorPlugins() {
    return [spottingPlugin()];
  },

  onCreate() {
    const scheduler = new Scheduler(this.editor, this.options);
    this.storage.scheduler = scheduler;
    const scan = () => scheduler.scan();
    if ("requestIdleCallback" in window) window.requestIdleCallback(scan, { timeout: 3000 });
    else globalThis.setTimeout(scan, 1000);
  },

  onTransaction({ transaction }) {
    if (transaction.getMeta(spottingKey) || transaction.getMeta("preventSpotting")) return;
    this.storage.scheduler?.onTransaction(transaction);
  },

  onDestroy() {
    this.storage.scheduler?.destroy();
  },
});
