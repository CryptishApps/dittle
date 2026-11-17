import { autoUpdate, computePosition, flip, offset, shift } from "@floating-ui/dom";
import type { Editor } from "@tiptap/react";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { RowsPer } from "@/features/collections/logic";
import type { FactFields } from "@/features/notes/fact";
import { btnClass, ease, POPOVER } from "@/ui/kit";
import { describeFormula } from "@/features/formulas/apply";
import { applyEverywhere as applyToNotes, changeValue, type ChangeScope } from "./change-value";
import { Action, EditValue, nameOf, usedIn } from "./EditValue";
import { repoint, type Quantity } from "./linking";
import { foundValueAt, spottingKey } from "./spotting";
import { VALUE_NODE } from "./value-node";
import type { EditorServices } from "./services";
import { describeInBackground, useValues, type TrackedValue, type ValueStore } from "./values";

type Target = { kind: "tag" | "found"; id: string; element: HTMLElement };

const DAY = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const MONTH = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
const TIME = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

function showWhen(when: FactFields["when"]): string | undefined {
  if (!when) return undefined;
  if (when.grain === "year") return when.on;
  if (when.grain === "month") return MONTH.format(new Date(`${when.on}-01T00:00:00Z`));
  if (when.grain === "time") return TIME.format(new Date(`${when.on}:00Z`));
  return DAY.format(new Date(`${when.on}T00:00:00Z`));
}

export type Shown = Omit<FactFields, "text"> & { text: string };

export const contextLine = (value: Shown) => [value.subject?.label, showWhen(value.when), ...(value.conditions ?? []), ...(value.remarks ?? [])].filter(Boolean).join(" · ");

type ValueCardProps = { editor: Editor; store: ValueStore; services?: EditorServices };

export function ValueCard({ editor, store, services = {} }: ValueCardProps) {
  const { usage = () => 0, onNewFact, placementOf, startCollection, noteId, openValue } = services;
  const [target, setTarget] = useState<Target>();
  const card = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  const values = useValues(store);
  const [, setVersion] = useState(0);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (target?.kind !== "found") return;
    const bump = () => setVersion((version) => version + 1);
    editor.on("transaction", bump);
    return () => void editor.off("transaction", bump);
  }, [editor, target]);

  useEffect(() => {
    const dom = editor.view.dom;
    const over = (event: MouseEvent) => {
      const element = (event.target as HTMLElement).closest<HTMLElement>(".value-tag, .value-found");
      if (!element) return;
      window.clearTimeout(hideTimer.current);
      const kind = element.classList.contains("value-found") ? "found" : "tag";
      const id = kind === "found" ? element.dataset.found : element.dataset.id;
      if (id) setTarget({ kind, id, element });
    };
    const out = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest(".value-tag, .value-found")) hide();
    };
    const open = (element: HTMLElement | null | undefined, from: "pointer" | "keyboard") => {
      const id = element?.dataset.id;
      if (!element || !id) return false;
      window.clearTimeout(hideTimer.current);
      if (openValue) {
        setTarget(undefined);
        openValue(id, from);
      } else {
        setTarget({ kind: "tag", id, element });
        setEditing(true);
      }
      return true;
    };
    const click = (event: MouseEvent) => void open((event.target as HTMLElement).closest<HTMLElement>(".value-tag"), "pointer");
    const key = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey)) return;
      const { $from, empty } = editor.state.selection;
      const id: unknown = empty ? [$from.nodeBefore, $from.nodeAfter].find((node) => node?.type.name === VALUE_NODE)?.attrs.id : undefined;
      if (typeof id !== "string" || !open(dom.querySelector<HTMLElement>(`.value-tag[data-id="${CSS.escape(id)}"]`), "keyboard")) return;
      event.preventDefault();
      event.stopPropagation();
    };
    const keys = dom.parentElement ?? dom;
    dom.addEventListener("mouseover", over);
    dom.addEventListener("mouseout", out);
    dom.addEventListener("click", click);
    keys.addEventListener("keydown", key, { capture: true });
    return () => {
      dom.removeEventListener("mouseover", over);
      dom.removeEventListener("mouseout", out);
      dom.removeEventListener("click", click);
      keys.removeEventListener("keydown", key, { capture: true });
    };
  }, [editor]);

  useEffect(() => {
    const floating = card.current;
    if (!target || !floating) return;
    return autoUpdate(target.element, floating, () => {
      void computePosition(target.element, floating, { placement: "bottom-start", middleware: [offset(6), flip(), shift({ padding: 8 })] }).then(({ x, y }) => {
        Object.assign(floating.style, { left: `${x}px`, top: `${y}px` });
      });
    });
  }, [target]);

  function hide() {
    window.clearTimeout(hideTimer.current);
    if (editing) return;
    hideTimer.current = window.setTimeout(() => setTarget(undefined), 220);
  }

  const close = () => {
    setEditing(false);
    setTarget(undefined);
  };

  const saveEdit = (value: TrackedValue, text: string, scope: ChangeScope, quantity?: Quantity) => {
    close();
    changeValue(editor, store, services, value, text, scope, quantity);
  };

  const tag = target?.kind === "tag" ? values.find((value) => value.id === target.id) : undefined;
  const found = target?.kind === "found" ? spottingKey.getState(editor.state)?.found.get(target.id) : undefined;
  const linked = found?.link ? store.get(found.link.factId) : tag?.proposal ? store.get(tag.proposal.factId) : undefined;
  const shown: Shown | undefined = tag ?? (found && { ...found, text: found.quote, subject: found.about ? { label: found.about } : undefined });

  const insertTag = (from: number, to: number, id: string, label: string) =>
    editor.chain().focus().insertContentAt({ from, to }, { type: VALUE_NODE, attrs: { id, label, mentionSuggestionChar: "@" } }).run();

  const applyEverywhere = (factId: string, text: string, quantity?: Quantity) => applyToNotes(editor, store, services, factId, text, quantity);

  const trackFound = (how: "new" | "same" | "update" | "separate") => {
    const hit = target && foundValueAt(editor.state, target.id);
    setTarget(undefined);
    if (!hit) return;
    const { quote, kind, name, about, event, when, conditions, remarks, amount, before, after, seconds, unit, described, link } = hit.value;
    if (link && (how === "same" || how === "update")) {
      insertTag(hit.from, hit.to, link.factId, quote);
      if (how === "update") applyEverywhere(link.factId, quote, { amount, seconds });
      return;
    }
    const notSame = how === "separate" && link ? [link.factId] : undefined;
    const sentence = editor.state.doc.resolve(hit.from).parent.textContent;
    const origin = { noteId, sentence };
    const value = store.add(
      quote,
      described
        ? { kind, name, subject: about ? { label: about } : undefined, event, when, conditions, remarks, amount, before, after, seconds, unit, notSame, origin }
        : { kind, name, notSame, origin },
    );
    insertTag(hit.from, hit.to, value.id, quote);
    if (described) onNewFact?.(value);
    else describeInBackground(store, value, { sentence, noteTitle: editor.state.doc.firstChild?.textContent ?? "", noteId }, onNewFact);
  };

  const settleProposal = (value: TrackedValue, accept: boolean) => {
    const factId = value.proposal?.factId;
    setTarget(undefined);
    if (!factId) return;
    if (!accept) {
      const notSame = [...(value.notSame ?? []), factId];
      store.update(value.id, { proposal: undefined, notSame });
      return onNewFact?.({ ...value, proposal: undefined, notSame });
    }
    repoint(editor, value.id, factId, value.text);
    applyEverywhere(factId, value.text, { amount: value.amount, seconds: value.seconds });
    store.remove(value.id);
  };

  useEffect(() => {
    if (!editing) return;
    const outside = (event: MouseEvent) => {
      const node = event.target as Node;
      if (card.current?.contains(node) || target?.element.contains(node)) return;
      close();
    };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [editing, target]);

  const describing = tag?.naming || (found && !found.described);
  const changed = (found?.link?.changed || Boolean(tag?.proposal)) && linked;

  return (
    <AnimatePresence>
      {target && shown && (
        <m.div
          ref={card}
          key={target.id}
          initial={{ opacity: 0, y: -4, filter: "blur(3px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
          transition={{ duration: 0.2, ease }}
          onMouseEnter={() => window.clearTimeout(hideTimer.current)}
          onMouseLeave={hide}
          role="dialog"
          aria-label={`About ${shown.text}`}
          className={`${POPOVER} fixed top-0 left-0 z-50 w-max max-w-[340px] px-4 py-3.5 text-[14px] ${changed ? "ring-2 ring-accent-line" : ""}`}
        >
          <p className="text-label text-soft first-letter:uppercase">
            {[nameOf(shown), shown.kind, shown.event === undefined ? undefined : shown.event ? "event" : "ongoing"].filter(Boolean).join(" · ")}
          </p>
          {tag && editing && !tag.proposal && !tag.formula && (
            <EditValue value={tag} count={usage(tag.id)} onSave={(text, scope, quantity) => saveEdit(tag, text, scope, quantity)} onCancel={close} />
          )}
          {tag?.formula && <p className="mt-1.5 font-medium text-accent-ink">= {describeFormula(tag, (id) => store.get(id)) ?? "a formula"}</p>}
          {tag && !editing && tag.history?.length ? <p className="mt-1.5 text-faint">Was {tag.history.at(-1)!.text}</p> : null}
          {describing ? (
            <p className="mt-1.5">
              <span className="t-shimmer-text" data-text="Describing">
                Describing
              </span>
            </p>
          ) : (
            contextLine(shown) && <p className="mt-1.5 font-medium text-ink">{contextLine(shown)}</p>
          )}

          {changed && linked && (
            <p className="mt-2.5 rounded-xl bg-accent-tint px-3 py-2 text-accent-ink">
              {nameOf(linked)} is {linked.text} in {usedIn(usage(linked.id))}. Change it to {shown.text}?
            </p>
          )}
          {!changed && linked && (
            <p className="mt-2 text-soft">
              Same as {nameOf(linked)} in {usedIn(usage(linked.id))}
            </p>
          )}
          {tag && !tag.proposal && usage(tag.id) > 1 && <p className="mt-2 text-soft">In {usedIn(usage(tag.id))}</p>}
          {tag && placementOf?.(tag) && <p className="mt-2 text-soft">{placementOf(tag)}</p>}
          {tag && !editing && !tag.proposal && !tag.naming && !tag.field && startCollection && (
            <StartCollection
              value={tag}
              onStart={(name, per) => {
                startCollection(tag, name, per);
                setTarget(undefined);
              }}
            />
          )}

          <Actions>
            {found && changed && (
              <>
                <Action onClick={() => trackFound("separate")}>Only here</Action>
                <Action primary onClick={() => trackFound("update")}>
                  Update everywhere
                </Action>
              </>
            )}
            {found && !changed && linked && (
              <>
                <Action onClick={() => trackFound("separate")}>Not the same</Action>
                <Action primary onClick={() => trackFound("same")}>
                  Track as {nameOf(linked)}
                </Action>
              </>
            )}
            {found && !linked && (
              <Action primary onClick={() => trackFound("new")}>
                Track value
              </Action>
            )}
            {tag?.proposal && (
              <>
                <Action onClick={() => settleProposal(tag, false)}>Keep separate</Action>
                <Action primary onClick={() => settleProposal(tag, true)}>
                  Update everywhere
                </Action>
              </>
            )}
          </Actions>
          {tag && !tag.proposal && tag.describedBy && (
            <p className="mt-3 border-t border-line pt-2.5 text-[12.5px] text-faint">
              {openValue ? "Click or ⌘/Ctrl Enter for details" : tag.formula ? "Calculated" : "Click to change"} · described {tag.describedBy.where === "on_device" ? "on this device" : "in the cloud"}
            </p>
          )}
        </m.div>
      )}
    </AnimatePresence>
  );
}

function Actions({ children }: { children: ReactNode }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children;
  if (!items || (Array.isArray(items) && items.length === 0)) return null;
  return <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-3">{children}</div>;
}

export function StartCollection({ value, onStart }: { value: TrackedValue; onStart: (name: string, per: RowsPer) => void }) {
  const [open, setOpen] = useState(false);
  const label = value.subject?.label ?? nameOf(value);
  const [name, setName] = useState(label.charAt(0).toUpperCase() + label.slice(1));
  const [per, setPer] = useState<RowsPer>(value.event ? "day" : "name");
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="link mt-2.5 text-[14px] font-medium">
        Start a collection from this
      </button>
    );
  }
  return (
    <form
      className="mt-3 border-t border-line pt-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (name.trim()) onStart(name.trim(), per);
      }}
    >
      <label className="block text-label text-soft" htmlFor="collection-name">
        Collection name
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          id="collection-name"
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="h-9 min-w-0 flex-1 rounded-xl border border-line-strong bg-card px-3 text-[14px] outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-tint"
        />
        <button type="submit" className={btnClass({ variant: "primary" })}>
          Create
        </button>
      </div>
      {value.event && (
        <div role="radiogroup" aria-label="Rows" className="mt-2.5 flex rounded-xl bg-chip p-1">
          {(["day", "name"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={per === option}
              onClick={() => setPer(option)}
              className={`h-7 flex-1 rounded-lg px-2 text-[12.5px] font-semibold transition-colors ${per === option ? "bg-card text-ink shadow-tile" : "text-soft hover:text-ink"}`}
            >
              {option === "day" ? "Row per day" : "Row per thing"}
            </button>
          ))}
        </div>
      )}
      <p className="mt-2 text-[13px] leading-[1.5] text-soft">
        {per === "day" ? "One row per day. Other values in this note from the same day become columns." : `One row per ${label}. Other values from the same sentence become columns.`}
      </p>
    </form>
  );
}
