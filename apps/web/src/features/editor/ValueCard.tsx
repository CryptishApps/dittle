import { autoUpdate, computePosition, flip, offset, shift } from "@floating-ui/dom";
import type { Editor } from "@tiptap/react";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { FactFields } from "@/features/notes/fact";
import { ease } from "@/ui/kit";
import { changeEverywhere, relabelInEditor, repoint } from "./linking";
import { foundValueAt, spottingKey } from "./spotting";
import { VALUE_NODE } from "./value-tag";
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

type ValueCardProps = { editor: Editor; store: ValueStore; usage?: (factId: string) => number; onChanged?: (factId: string, text: string) => void };

export function ValueCard({ editor, store, usage = () => 0, onChanged }: ValueCardProps) {
  const [target, setTarget] = useState<Target>();
  const card = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  const values = useValues(store);
  const [, setVersion] = useState(0);

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
    dom.addEventListener("mouseover", over);
    dom.addEventListener("mouseout", out);
    return () => {
      dom.removeEventListener("mouseover", over);
      dom.removeEventListener("mouseout", out);
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
    hideTimer.current = window.setTimeout(() => setTarget(undefined), 220);
  }

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
    const value = store.add(quote, described ? { kind, name, subject: about ? { label: about } : undefined, event, when, conditions, remarks, notSame } : { kind, name, notSame });
    insertTag(hit.from, hit.to, value.id, quote);
    if (!described) describeInBackground(store, value, { sentence: editor.state.doc.resolve(hit.from).parent.textContent, noteTitle: editor.state.doc.firstChild?.textContent ?? "" });
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
              Described {tag.describedBy.where === "on_device" ? "on this device" : "in the cloud"} in {(tag.describedBy.ms / 1000).toFixed(1)} s
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
