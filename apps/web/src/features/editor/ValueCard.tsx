import { autoUpdate, computePosition, flip, offset, shift } from "@floating-ui/dom";
import type { Editor } from "@tiptap/react";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { FactFields } from "@/features/notes/fact";
import { ease } from "@/ui/kit";
import { changeEverywhere, relabelInEditor, repoint } from "./linking";
import { foundValueAt, spottingKey } from "./spotting";
import { VALUE_NODE } from "./value-tag";
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

type Shown = Omit<FactFields, "text"> & { text: string };

const contextLine = (value: Shown) => [value.subject?.label, showWhen(value.when), ...(value.conditions ?? []), ...(value.remarks ?? [])].filter(Boolean).join(" · ");
const nameOf = (value: { name?: string } | undefined) => value?.name?.replaceAll("_", " ") ?? "value";
const notes = (count: number) => `${count} ${count === 1 ? "note" : "notes"}`;

type ValueCardProps = { editor: Editor; store: ValueStore; services?: EditorServices };

export function ValueCard({ editor, store, services = {} }: ValueCardProps) {
  const { usage = () => 0, onChanged, onNewFact, placementOf, startCollection, noteId } = services;
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
    const click = (event: MouseEvent) => {
      const element = (event.target as HTMLElement).closest<HTMLElement>(".value-tag");
      if (!element?.dataset.id) return;
      window.clearTimeout(hideTimer.current);
      setTarget({ kind: "tag", id: element.dataset.id, element });
      setEditing(true);
    };
    dom.addEventListener("mouseover", over);
    dom.addEventListener("mouseout", out);
    dom.addEventListener("click", click);
    return () => {
      dom.removeEventListener("mouseover", over);
      dom.removeEventListener("mouseout", out);
      dom.removeEventListener("click", click);
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

  const saveEdit = (value: TrackedValue, text: string, scope: "everywhere" | "here") => {
    close();
    if (text === value.text) return;
    if (scope === "everywhere") return applyEverywhere(value.id, text);
    const { id: _id, text: _text, naming: _naming, proposal: _proposal, updatedAt: _updatedAt, ...context } = value;
    const forked = store.add(text, { ...context, notSame: [...(value.notSame ?? []), value.id], history: [{ text: value.text, at: Date.now() }] });
    repoint(editor, value.id, forked.id, text);
    store.update(value.id, { notSame: [...(value.notSame ?? []), forked.id] });
  };

  const tag = target?.kind === "tag" ? values.find((value) => value.id === target.id) : undefined;
  const found = target?.kind === "found" ? spottingKey.getState(editor.state)?.found.get(target.id) : undefined;
  const linked = found?.link ? store.get(found.link.factId) : tag?.proposal ? store.get(tag.proposal.factId) : undefined;
  const shown: Shown | undefined = tag ?? (found && { ...found, text: found.quote, subject: found.about ? { label: found.about } : undefined });

  const insertTag = (from: number, to: number, id: string, label: string) =>
    editor.chain().focus().insertContentAt({ from, to }, { type: VALUE_NODE, attrs: { id, label, mentionSuggestionChar: "@" } }).run();

  const applyEverywhere = (factId: string, text: string) => {
    changeEverywhere(store, factId, text);
    relabelInEditor(editor, factId, text);
    onChanged?.(factId, text);
  };

  const trackFound = (how: "new" | "same" | "update" | "separate") => {
    const hit = target && foundValueAt(editor.state, target.id);
    setTarget(undefined);
    if (!hit) return;
    const { quote, kind, name, about, event, when, conditions, remarks, described, link } = hit.value;
    if (link && (how === "same" || how === "update")) {
      insertTag(hit.from, hit.to, link.factId, quote);
      if (how === "update") applyEverywhere(link.factId, quote);
      return;
    }
    const notSame = how === "separate" && link ? [link.factId] : undefined;
    const sentence = editor.state.doc.resolve(hit.from).parent.textContent;
    const origin = { noteId, sentence };
    const value = store.add(
      quote,
      described ? { kind, name, subject: about ? { label: about } : undefined, event, when, conditions, remarks, notSame, origin } : { kind, name, notSame, origin },
    );
    insertTag(hit.from, hit.to, value.id, quote);
    if (described) onNewFact?.(value);
    else describeInBackground(store, value, { sentence, noteTitle: editor.state.doc.firstChild?.textContent ?? "", noteId }, onNewFact);
  };

  const settleProposal = (value: TrackedValue, accept: boolean) => {
    const factId = value.proposal?.factId;
    setTarget(undefined);
    if (!factId) return;
    if (!accept) return store.update(value.id, { proposal: undefined, notSame: [...(value.notSame ?? []), factId] });
    repoint(editor, value.id, factId, value.text);
    applyEverywhere(factId, value.text);
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
          className={`fixed top-0 left-0 z-50 w-max max-w-[320px] border bg-card px-3 py-2.5 text-[12px] shadow-pop ${changed ? "border-accent" : "border-line-strong"}`}
        >
          <p className="text-[10.5px] tracking-[0.06em] text-faint uppercase">
            {[nameOf(shown), shown.kind, shown.event === undefined ? undefined : shown.event ? "event" : "ongoing"].filter(Boolean).join(" · ")}
          </p>
          {tag && editing && !tag.proposal && <EditValue value={tag} count={usage(tag.id)} onSave={(text, scope) => saveEdit(tag, text, scope)} onCancel={close} />}
          {tag && !editing && tag.history?.length ? <p className="mt-1 text-faint">Was {tag.history.at(-1)!.text}</p> : null}
          {describing ? (
            <p className="mt-1">
              <span className="t-shimmer-text" data-text="Describing">
                Describing
              </span>
            </p>
          ) : (
            contextLine(shown) && <p className="mt-1 text-ink">{contextLine(shown)}</p>
          )}

          {changed && linked && (
            <p className="mt-2 text-accent-ink">
              {nameOf(linked)} is {linked.text} in {notes(usage(linked.id))}. Change it to {shown.text}?
            </p>
          )}
          {!changed && linked && (
            <p className="mt-2 text-soft">
              Same as {nameOf(linked)} in {notes(usage(linked.id))}
            </p>
          )}
          {tag && !tag.proposal && usage(tag.id) > 1 && <p className="mt-2 text-soft">In {notes(usage(tag.id))}</p>}
          {tag && placementOf?.(tag) && <p className="mt-2 text-soft">{placementOf(tag)}</p>}
          {tag && !editing && !tag.proposal && !tag.naming && !tag.field && startCollection && (
            <StartCollection
              value={tag}
              onStart={(name) => {
                startCollection(tag, name);
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
            <p className="mt-2 border-t border-line pt-2 text-faint">
              Click to change · described {tag.describedBy.where === "on_device" ? "on this device" : "in the cloud"} in {(tag.describedBy.ms / 1000).toFixed(1)} s
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
  return <div className="mt-2.5 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-2">{children}</div>;
}

function Action({ primary, onClick, children }: { primary?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 text-[10.5px] tracking-[0.06em] uppercase ${primary ? "bg-ink text-page hover:opacity-90" : "border border-line-strong text-ink hover:border-ink"}`}
    >
      {children}
    </button>
  );
}

function StartCollection({ value, onStart }: { value: TrackedValue; onStart: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const label = value.subject?.label ?? nameOf(value);
  const [name, setName] = useState(label.charAt(0).toUpperCase() + label.slice(1));
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-2 text-[11px] tracking-[0.04em] text-soft underline underline-offset-4 hover:text-ink">
        Start a collection from this
      </button>
    );
  }
  return (
    <form
      className="mt-2.5 border-t border-line pt-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (name.trim()) onStart(name.trim());
      }}
    >
      <label className="block text-[10.5px] tracking-[0.06em] text-faint uppercase" htmlFor="collection-name">
        Collection name
      </label>
      <div className="mt-1 flex gap-2">
        <input
          id="collection-name"
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="h-7 min-w-0 flex-1 border border-line-strong bg-card px-2 text-[12.5px] outline-none focus:border-accent"
        />
        <button type="submit" className="bg-ink px-2 text-[10.5px] tracking-[0.06em] text-page uppercase hover:opacity-90">
          Create
        </button>
      </div>
      <p className="mt-1.5 text-faint">{value.event ? "One row per day. Other values in this note from the same day become columns." : `One row per ${label}. Other values from the same sentence become columns.`}</p>
    </form>
  );
}

function EditValue({ value, count, onSave, onCancel }: { value: TrackedValue; count: number; onSave: (text: string, scope: "everywhere" | "here") => void; onCancel: () => void }) {
  const [text, setText] = useState(value.text);
  const [asking, setAsking] = useState(false);
  const submit = () => {
    const next = text.trim();
    if (!next || next === value.text) return onCancel();
    if (count > 1) setAsking(true);
    else onSave(next, "everywhere");
  };
  return (
    <div className="mt-2">
      <input
        autoFocus
        aria-label={`Change ${nameOf(value)}`}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setAsking(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            submit();
          }
          if (event.key === "Escape") onCancel();
        }}
        className="h-8 w-full border border-accent bg-card px-2 text-[13px] outline-none"
      />
      {asking ? (
        <div className="mt-2">
          <p className="text-accent-ink">
            {value.text} is used in {notes(count)}.
          </p>
          <div className="mt-2 flex flex-wrap justify-end gap-2">
            <Action onClick={() => onSave(text.trim(), "here")}>Only in this note</Action>
            <Action primary onClick={() => onSave(text.trim(), "everywhere")}>
              Update all {count}
            </Action>
          </div>
        </div>
      ) : (
        <p className="mt-1.5 text-faint">Enter to save · Esc to cancel</p>
      )}
    </div>
  );
}
