import { autoUpdate, computePosition, flip, offset, shift } from "@floating-ui/dom";
import type { Editor } from "@tiptap/react";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Btn, ease, POPOVER } from "@/ui/kit";
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

  const ignore = () => {
    if (!target) return;
    editor.storage.requests.ignore(target.id);
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
          className={`${POPOVER} fixed top-0 left-0 z-50 w-[360px] max-w-[calc(100vw-1rem)] px-5 py-4 text-[14px]`}
        >
          <p className="text-[12.5px] text-faint">
            Written {written.where === "on_device" ? "on this device" : "in the cloud"} from your note
          </p>
          <ul className="mt-2.5 max-h-[260px] space-y-1 overflow-y-auto leading-[1.6] text-ink">
            {written.items.map((line, index) => (
              <li key={index} className="flex gap-2">
                <span className="text-faint">{written.format === "checklist" ? "☐" : written.format === "list" ? "•" : ""}</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <Btn variant="quiet" onClick={ignore} className="mr-auto -ml-2">
              Ignore
            </Btn>
            <Btn onClick={() => insert(true)}>Replace my text</Btn>
            <Btn primary onClick={() => insert(false)}>
              Add below
            </Btn>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
