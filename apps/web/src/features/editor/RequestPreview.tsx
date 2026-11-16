import { autoUpdate, computePosition, flip, offset, shift } from "@floating-ui/dom";
import type { Editor } from "@tiptap/react";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ease } from "@/ui/kit";
import { insertRequest, requestsKey } from "./requests";

type Target = { id: string; element: HTMLElement };

export function RequestPreview({ editor }: { editor: Editor }) {
  const [target, setTarget] = useState<Target>();
  const card = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const dom = editor.view.dom;
    const over = (event: MouseEvent) => {
      const element = (event.target as HTMLElement).closest<HTMLElement>('.request-button[data-status="ready"]');
      if (!element?.dataset.request) return;
      window.clearTimeout(hideTimer.current);
      setTarget({ id: element.dataset.request, element });
    };
    const out = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest(".request-button")) hide();
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

  const item = target ? requestsKey.getState(editor.state)?.items.get(target.id) : undefined;
  const written = item?.written;

  const insert = (removeRequest: boolean) => {
    if (!target) return;
    insertRequest(editor, target.id, removeRequest);
    setTarget(undefined);
  };

  return (
    <AnimatePresence>
      {target && written && (
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
          aria-label="Preview"
          className="fixed top-0 left-0 z-50 w-[340px] max-w-[calc(100vw-1rem)] border border-dashed border-line-strong bg-card px-4 py-3 text-[12.5px] shadow-pop"
        >
          <p className="text-[10.5px] tracking-[0.06em] text-faint uppercase">
            Preview · {written.where === "on_device" ? "on this device" : "in the cloud"} · {(written.ms / 1000).toFixed(1)} s
          </p>
          <ul className="mt-2 max-h-[240px] space-y-0.5 overflow-y-auto leading-[1.7] text-ink">
            {written.items.map((line, index) => (
              <li key={index} className="flex gap-2">
                <span className="text-faint">{written.format === "checklist" ? "☐" : written.format === "list" ? "–" : ""}</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-line pt-2">
            <button type="button" onClick={() => insert(true)} className="border border-line-strong px-2 py-1 text-[10.5px] tracking-[0.06em] uppercase hover:border-ink">
              Insert and remove request
            </button>
            <button type="button" onClick={() => insert(false)} className="bg-ink px-2 py-1 text-[10.5px] tracking-[0.06em] text-page uppercase hover:opacity-90">
              Insert
            </button>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
