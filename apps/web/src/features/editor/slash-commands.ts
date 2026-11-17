import { Extension, getTextBetween, getTextSerializersFromSchema, type Editor, type Range } from "@tiptap/core";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Suggestion } from "@tiptap/suggestion";
import { SlashMenu } from "./SlashMenu";
import { renderMenu } from "./suggestion-menu";

export type SlashCommand = {
  label: string;
  hint: string;
  available: (editor: Editor) => boolean;
  run: (editor: Editor, range: Range) => void;
};

type AskState = Range | null;
type AskMeta = { start: number } | { stop: true };

const slashKey = new PluginKey("slashCommands");
const askKey = new PluginKey<AskState>("askDittle");

const always = () => true;

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    label: "Tag a value",
    hint: "Track a date, price or amount",
    available: always,
    run: (editor, range) => editor.chain().focus().insertContentAt(range, "@").run(),
  },
  {
    label: "Ask Dittle to write…",
    hint: "A list, a plan or a few lines",
    available: always,
    run: (editor, range) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .command(({ tr }) => {
          tr.setMeta(askKey, { start: range.from } satisfies AskMeta);
          return true;
        })
        .run(),
  },
  {
    label: "Heading",
    hint: "A section title",
    available: (editor) => editor.can().setHeading({ level: 2 }),
    run: (editor, range) => editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run(),
  },
  {
    label: "Bullet list",
    hint: "A simple list",
    available: (editor) => editor.can().toggleBulletList(),
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    label: "Checklist",
    hint: "Things to do or pack",
    available: (editor) => editor.can().toggleTaskList(),
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
];

export function slashCommandsFor(editor: Editor, query: string): SlashCommand[] {
  const needle = query.toLowerCase();
  return SLASH_COMMANDS.filter((command) => command.label.toLowerCase().includes(needle) && command.available(editor));
}

function askHint(empty: boolean): HTMLElement {
  const hint = document.createElement("span");
  hint.className = empty ? "ask-hint ask-hint-empty" : "ask-hint";
  hint.contentEditable = "false";
  hint.textContent = empty ? "What should Dittle write? Enter to ask · Esc to cancel" : "Enter to ask";
  return hint;
}

function submitAsk(editor: Editor, ask: Range) {
  const raw = getTextBetween(editor.state.doc, ask, { textSerializers: getTextSerializersFromSchema(editor.schema) });
  const text = raw.trim();
  editor.view.dispatch(editor.state.tr.setMeta(askKey, { stop: true } satisfies AskMeta));
  if (!text) return;
  const from = ask.from + (raw.length - raw.trimStart().length);
  const to = ask.to - (raw.length - raw.trimEnd().length);
  editor.storage.requests.ask({ from, to, text });
}

function askPlugin(editor: Editor) {
  return new Plugin<AskState>({
    key: askKey,
    state: {
      init: () => null,
      apply(tr, previous) {
        const meta = tr.getMeta(askKey) as AskMeta | undefined;
        if (meta) return "start" in meta ? { from: meta.start, to: meta.start } : null;
        if (!previous) return null;
        const ask = { from: tr.mapping.map(previous.from, -1), to: tr.mapping.map(previous.to, 1) };
        const { empty, head, $head } = tr.selection;
        const sameBlock = $head.parent.isTextblock && $head.start() === tr.doc.resolve(ask.from).start();
        return empty && sameBlock && head >= ask.from && head <= ask.to ? ask : null;
      },
    },
    props: {
      decorations(state) {
        const ask = askKey.getState(state);
        if (!ask) return null;
        const empty = ask.from === ask.to;
        const draft = empty ? [] : [Decoration.inline(ask.from, ask.to, { class: "ask-draft" })];
        return DecorationSet.create(state.doc, [...draft, Decoration.widget(ask.to, () => askHint(empty), { side: 1, key: empty ? "ask-empty" : "ask-typed", ignoreSelection: true })]);
      },
      handleKeyDown(view, event) {
        const ask = askKey.getState(view.state);
        if (!ask || event.isComposing) return false;
        if (event.key === "Enter") submitAsk(editor, ask);
        else if (event.key === "Escape") view.dispatch(view.state.tr.setMeta(askKey, { stop: true } satisfies AskMeta));
        else return false;
        return true;
      },
    },
  });
}

const isAsking = (state: EditorState) => Boolean(askKey.getState(state));

export const SlashCommands = Extension.create({
  name: "slashCommands",
  priority: 160,

  addProseMirrorPlugins() {
    return [
      askPlugin(this.editor),
      Suggestion<SlashCommand, SlashCommand>({
        editor: this.editor,
        pluginKey: slashKey,
        char: "/",
        allowedPrefixes: [" "],
        decorationClass: "slash-draft",
        placement: "bottom-start",
        offset: { mainAxis: 6, crossAxis: 0 },
        allow: ({ state, range }) => state.doc.resolve(range.from).index(0) > 0 && !isAsking(state),
        items: ({ editor, query }) => slashCommandsFor(editor, query),
        command: ({ editor, range, props: command }) => command.run(editor, range),
        render: renderMenu(SlashMenu),
      }),
    ];
  },
});
