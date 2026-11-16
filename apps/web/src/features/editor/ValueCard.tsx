import { autoUpdate, computePosition, flip, offset, shift } from "@floating-ui/dom";
import type { Editor } from "@tiptap/react";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { FactFields } from "@/features/notes/fact";
import { ease } from "@/ui/kit";
import { foundValueAt, spottingKey } from "./spotting";
import { VALUE_NODE } from "./value-tag";
import { useValues, type ValueStore } from "./values";

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

type Shown = Omit<FactFields, "text"> & { text: string; about?: string };

function contextLine(value: Shown): string {
  const about = value.subject?.label ?? value.about;
  return [about, showWhen(value.when), ...(value.conditions ?? []), ...(value.remarks ?? [])].filter(Boolean).join(" · ");
}

export function ValueCard({ editor, store }: { editor: Editor; store: ValueStore }) {
  const [target, setTarget] = useState<Target>();
  const card = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  const values = useValues(store);

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
  const shown: Shown | undefined = tag ?? (found && { ...found, text: found.quote, subject: found.about ? { label: found.about } : undefined });

  const track = () => {
    if (!target) return;
    const hit = foundValueAt(editor.state, target.id);
    if (!hit) return setTarget(undefined);
    const { quote, kind, name, about, event, when, conditions, remarks } = hit.value;
    const value = store.add(quote, { kind, name, subject: about ? { label: about } : undefined, event, when, conditions, remarks });
    editor
      .chain()
      .focus()
      .insertContentAt({ from: hit.from, to: hit.to }, { type: VALUE_NODE, attrs: { id: value.id, label: quote, mentionSuggestionChar: "@" } })
      .run();
    setTarget(undefined);
  };

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
          className="fixed top-0 left-0 z-50 w-max max-w-[300px] border border-line-strong bg-card px-3 py-2.5 text-[12px] shadow-pop"
        >
          <p className="text-[10.5px] tracking-[0.06em] text-faint uppercase">
            {[shown.name?.replaceAll("_", " "), shown.kind, shown.event === undefined ? undefined : shown.event ? "event" : "ongoing"].filter(Boolean).join(" · ")}
          </p>
          {tag?.naming ? (
            <p className="mt-1">
              <span className="t-shimmer-text" data-text="Describing">
                Describing
              </span>
            </p>
          ) : (
            contextLine(shown) && <p className="mt-1 text-ink">{contextLine(shown)}</p>
          )}
          {target.kind === "found" ? (
            <div className="mt-2.5 flex items-center justify-between gap-4 border-t border-line pt-2">
              <span className="text-faint">Spotted by AI</span>
              <button type="button" onClick={track} className="bg-ink px-2 py-1 text-[10.5px] tracking-[0.06em] text-page uppercase hover:opacity-90">
                Track value
              </button>
            </div>
          ) : (
            tag?.describedBy && (
              <p className="mt-2 border-t border-line pt-2 text-faint">
                Described {tag.describedBy.where === "on_device" ? "on this device" : "in the cloud"} in {(tag.describedBy.ms / 1000).toFixed(1)} s
              </p>
            )
          )}
        </m.div>
      )}
    </AnimatePresence>
  );
}
