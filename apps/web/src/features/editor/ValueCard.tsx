import { autoUpdate, computePosition, flip, offset, shift } from "@floating-ui/dom";
import type { Editor } from "@tiptap/react";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { FactFields } from "@/features/notes/fact";
import { ease } from "@/ui/kit";
import { describeFormula, formatAmount } from "@/features/formulas/apply";
import { formatDuration, joinDuration, splitDuration, type DurationParts } from "@/features/formulas/duration";
import { applyEverywhere as applyToNotes, changeValue, type ChangeScope } from "./change-value";
import { repoint, type Quantity } from "./linking";
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

export type Shown = Omit<FactFields, "text"> & { text: string };

export const contextLine = (value: Shown) => [value.subject?.label, showWhen(value.when), ...(value.conditions ?? []), ...(value.remarks ?? [])].filter(Boolean).join(" · ");
export const nameOf = (value: { name?: string } | undefined) => value?.name?.replaceAll("_", " ") ?? "value";
const notes = (count: number) => `${count} ${count === 1 ? "note" : "notes"}`;

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
    const click = (event: MouseEvent) => {
      const element = (event.target as HTMLElement).closest<HTMLElement>(".value-tag");
      if (!element?.dataset.id) return;
      window.clearTimeout(hideTimer.current);
      if (openValue) {
        setTarget(undefined);
        openValue(element.dataset.id);
        return;
      }
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
    const { quote, kind, name, about, event, when, conditions, remarks, amount, before, after, seconds, described, link } = hit.value;
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
        ? { kind, name, subject: about ? { label: about } : undefined, event, when, conditions, remarks, amount, before, after, seconds, notSame, origin }
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
          className={`fixed top-0 left-0 z-50 w-max max-w-[320px] border bg-card px-3 py-2.5 text-[12px] shadow-pop ${changed ? "border-accent" : "border-line-strong"}`}
        >
          <p className="text-[10.5px] tracking-[0.06em] text-faint uppercase">
            {[nameOf(shown), shown.kind, shown.event === undefined ? undefined : shown.event ? "event" : "ongoing"].filter(Boolean).join(" · ")}
          </p>
          {tag && editing && !tag.proposal && !tag.formula && (
            <EditValue value={tag} count={usage(tag.id)} onSave={(text, scope, quantity) => saveEdit(tag, text, scope, quantity)} onCancel={close} />
          )}
          {tag?.formula && <p className="mt-1 text-soft">= {describeFormula(tag, (id) => store.get(id)) ?? "a formula"}</p>}
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
              {openValue ? "Click for details" : tag.formula ? "Calculated" : "Click to change"} · described {tag.describedBy.where === "on_device" ? "on this device" : "in the cloud"}
            </p>
          )}
        </m.div>
      )}
    </AnimatePresence>
  );
}

const NUMBER_INPUT = "h-full min-w-0 bg-transparent outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none";

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

export function StartCollection({ value, onStart }: { value: TrackedValue; onStart: (name: string) => void }) {
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

type Edited = { text: string; quantity?: Quantity };

const DURATION_UNITS = [
  { part: "hours", label: "h" },
  { part: "minutes", label: "min" },
  { part: "seconds", label: "s" },
] as const;

type DurationDraft = Record<keyof DurationParts, string>;

const durationDraft = (seconds: number | undefined): DurationDraft => {
  if (seconds === undefined) return { hours: "", minutes: "", seconds: "" };
  const parts = splitDuration(seconds);
  return { hours: String(parts.hours), minutes: String(parts.minutes), seconds: String(parts.seconds) };
};

function durationFrom(draft: DurationDraft): Edited | undefined {
  const parts = { hours: Number(draft.hours || 0), minutes: Number(draft.minutes || 0), seconds: Number(draft.seconds || 0) };
  if (Object.values(parts).some((part) => !Number.isFinite(part) || part < 0)) return undefined;
  const seconds = joinDuration(parts);
  return seconds > 0 ? { text: formatDuration(seconds), quantity: { seconds } } : undefined;
}

export function EditValue({
  value,
  count,
  onSave,
  onCancel,
  autoFocus = true,
}: {
  value: TrackedValue;
  count: number;
  onSave: (text: string, scope: ChangeScope, quantity?: Quantity) => void;
  onCancel: () => void;
  autoFocus?: boolean;
}) {
  const duration = value.kind === "duration";
  const numeric = !duration && value.amount !== undefined;
  const [text, setText] = useState(numeric ? String(value.amount) : value.text);
  const [draft, setDraft] = useState(() => durationDraft(value.seconds));
  const [asking, setAsking] = useState(false);
  const next = (): Edited | undefined => {
    if (duration) return durationFrom(draft);
    if (!numeric) return { text: text.trim() };
    const amount = Number(text);
    return Number.isFinite(amount) && text.trim() !== "" ? { text: formatAmount(value, amount), quantity: { amount } } : undefined;
  };
  const submit = () => {
    const result = next();
    if (!result?.text || result.text === value.text || (duration && result.quantity?.seconds === value.seconds)) return onCancel();
    if (count > 1) setAsking(true);
    else onSave(result.text, "everywhere", result.quantity);
  };
  const save = (scope: ChangeScope) => {
    const result = next();
    if (result) onSave(result.text, scope, result.quantity);
  };
  const keys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    }
    if (event.key === "Escape") onCancel();
  };
  return (
    <div className="mt-2">
      {duration ? (
        <div className="flex gap-1.5" role="group" aria-label={`Change ${nameOf(value)}`}>
          {DURATION_UNITS.map(({ part, label }, index) => (
            <label key={part} className="flex h-8 min-w-0 flex-1 items-center border border-accent bg-card px-2 text-[13px]">
              <input
                autoFocus={autoFocus && index === 0}
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                aria-label={part}
                placeholder="0"
                value={draft[part]}
                onChange={(event) => {
                  setDraft((current) => ({ ...current, [part]: event.target.value }));
                  setAsking(false);
                }}
                onKeyDown={keys}
                className={`${NUMBER_INPUT} w-full text-right tabular-nums`}
              />
              <span className="ml-1 text-soft">{label}</span>
            </label>
          ))}
        </div>
      ) : (
        <div className="flex h-8 items-center border border-accent bg-card px-2 text-[13px]">
          {numeric && value.before && <span className="text-soft">{value.before}</span>}
          <input
            autoFocus={autoFocus}
            type={numeric ? "number" : "text"}
            step="any"
            aria-label={`Change ${nameOf(value)}`}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setAsking(false);
            }}
            onKeyDown={keys}
            className={`${NUMBER_INPUT} flex-1`}
          />
          {numeric && value.after && <span className="text-soft">{value.after}</span>}
        </div>
      )}
      {asking ? (
        <div className="mt-2">
          <p className="text-accent-ink">
            {value.text} is used in {notes(count)}.
          </p>
          <div className="mt-2 flex flex-wrap justify-end gap-2">
            <Action onClick={() => save("here")}>Only in this note</Action>
            <Action primary onClick={() => save("everywhere")}>
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
