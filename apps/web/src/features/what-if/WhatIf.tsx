import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type ReactNode } from "react";
import type { InferenceWhere } from "@/features/ai/hybrid";
import type { Operation } from "@/features/ai/what-if-answer";
import { formatAmount } from "@/features/formulas/apply";
import { createSyncedValueStore } from "@/features/editor/values";
import { writes } from "@/features/notes/api";
import { changeOutsideEditor } from "@/features/notes/editor-services";
import type { StoredValue } from "@/features/notes/fact";
import { showToast } from "@/features/notes/toast";
import { MIcon } from "@/ui/kit";
import { NumberRoll } from "./NumberRoll";
import { changeable, labelOf, optionsFor, previewWhatIf, type Effect, type TitledNote } from "./plan";

type Understood = { valueId: string; operation: Operation; number: number; where: InferenceWhere };

type State =
  | { status: "idle" }
  | { status: "asking"; question: string }
  | { status: "understood"; question: string; understood: Understood }
  | { status: "unclear"; question: string }
  | { status: "failed"; question: string };

function howChanged(value: StoredValue, { operation, number }: Understood): string {
  if (operation === "multiply") return `× ${number}`;
  const shown = formatAmount(value, number);
  return operation === "set" ? `set to ${shown}` : operation === "add" ? `plus ${shown}` : `minus ${shown}`;
}

export function WhatIf({ uid, values, notes }: { uid: string; values: StoredValue[]; notes: TitledNote[] }) {
  const queryClient = useQueryClient();
  const [store] = useState(() => createSyncedValueStore(queryClient, uid, writes));
  const [question, setQuestion] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });
  const latest = useRef(0);

  const ask = async (asked: string) => {
    const shown = changeable(values);
    const run = (latest.current += 1);
    setState({ status: "asking", question: asked });
    try {
      const { askWhatIf } = await import("@/features/ai/what-if");
      const { answer, where } = await askWhatIf({ question: asked, options: optionsFor(shown, notes) });
      if (run !== latest.current) return;
      const value = answer && shown[answer.option];
      setState(
        answer && value
          ? { status: "understood", question: asked, understood: { valueId: value.id, operation: answer.operation, number: answer.number, where } }
          : { status: "unclear", question: asked },
      );
    } catch (error) {
      if (run !== latest.current) return;
      console.warn("Dittle could not answer a what-if", error);
      setState({ status: "failed", question: asked });
    }
  };

  const dismiss = () => {
    latest.current += 1;
    setState({ status: "idle" });
  };

  const understood = state.status === "understood" ? state.understood : undefined;
  const value = understood && values.find((candidate) => candidate.id === understood.valueId);
  const preview = understood && value ? previewWhatIf(value, understood.operation, understood.number, values, notes) : null;

  const makeItSo = () => {
    if (!value || !preview || value.amount === undefined) return;
    const { from, to, amount } = preview.changed;
    const before = value.amount;
    changeOutsideEditor(queryClient, uid, store, value.id, to, { amount });
    const followed = preview.follows.length;
    showToast(`${labelOf(value)} is now ${to}${followed ? `, and ${followed} ${followed === 1 ? "value" : "values"} followed` : ""}`, () =>
      changeOutsideEditor(queryClient, uid, store, value.id, from, { amount: before }),
    );
    setQuestion("");
    dismiss();
  };

  return (
    <section aria-label="What if" className="mb-8">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (question.trim()) void ask(question.trim());
        }}
        className="flex items-center gap-3 border-b border-line-strong focus-within:border-accent"
      >
        <span aria-hidden className="text-[10.5px] tracking-[0.06em] text-faint uppercase">
          Ask
        </span>
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="What if 2 more people come?"
          aria-label="Ask what would change if"
          className="h-11 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-faint"
          style={{ outline: "none" }}
        />
        <span className="hidden text-[10.5px] tracking-[0.06em] text-faint uppercase sm:block">Enter</span>
      </form>

      <div aria-live="polite">
        {state.status === "asking" && (
          <p className="mt-3 text-[12.5px]">
            <span className="t-shimmer-text" data-text="Working out what changes…">
              Working out what changes…
            </span>
          </p>
        )}
        {state.status === "understood" && value && !preview && <Note onDismiss={dismiss}>That would take {labelOf(value).toLowerCase()} below zero.</Note>}
        {(state.status === "unclear" || (state.status === "understood" && !value)) && (
          <Note onDismiss={dismiss}>
            Dittle couldn't tie "{state.question}" to a number you track. Try naming one, such as the group size or a price.
          </Note>
        )}
        {state.status === "failed" && <Note onDismiss={dismiss}>Dittle couldn't work that out just now. Try again in a moment.</Note>}
        {state.status === "understood" && understood && value && preview && (
          <div className="mt-3 border-l-2 border-accent bg-panel px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[12px] text-soft">{state.question}</p>
              <button type="button" onClick={dismiss} aria-label="Dismiss" className="-m-1 p-1 text-faint hover:text-ink">
                <MIcon name="close" className="size-3.5" />
              </button>
            </div>
            <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-[15px] font-medium">{labelOf(value)}</span>
              <span className="flex items-baseline gap-2 text-[24px] leading-none font-medium tracking-[-0.03em] tabular-nums">
                <span className="text-faint">{preview.changed.from}</span>
                <span aria-hidden className="text-[15px] text-faint">
                  →
                </span>
                <span className="sr-only">to</span>
                <NumberRoll key={`${preview.changed.from}→${preview.changed.to}`} from={preview.changed.from} to={preview.changed.to} />
              </span>
            </p>
            <p className="mt-1.5 text-[11.5px] text-soft">
              {[howChanged(value, understood), preview.changed.notes.length > 0 && `in ${preview.changed.notes.join(", ")}`, understood.where === "on_device" ? "read on this device" : "read in the cloud"]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {preview.follows.length > 0 ? (
              <table className="mt-3 w-full text-left text-[12.5px]">
                <caption className="pb-1 text-left text-[10.5px] tracking-[0.06em] text-faint uppercase">Follows</caption>
                <tbody>
                  {preview.follows.map((effect) => (
                    <Follow key={effect.value.id} effect={effect} />
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="mt-3 text-[12px] text-soft">Nothing else you track is calculated from it.</p>
            )}
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={makeItSo} className="bg-ink px-2.5 py-1.5 text-[10.5px] tracking-[0.06em] text-page uppercase hover:opacity-90">
                Make it so
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="border border-line-strong px-2.5 py-1.5 text-[10.5px] tracking-[0.06em] text-soft uppercase hover:border-ink hover:text-ink"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Follow({ effect }: { effect: Effect }) {
  return (
    <tr className="border-t border-line">
      <td className="py-1.5 pr-3">{labelOf(effect.value)}</td>
      <td className="py-1.5 pr-3 whitespace-nowrap tabular-nums">
        <span className="text-faint">{effect.from}</span>
        <span aria-hidden className="px-1.5 text-faint">
          →
        </span>
        <span className="sr-only">to</span>
        <NumberRoll key={`${effect.from}→${effect.to}`} from={effect.from} to={effect.to} />
      </td>
      <td className="py-1.5 text-right text-soft">{effect.notes.join(", ")}</td>
    </tr>
  );
}

function Note({ children, onDismiss }: { children: ReactNode; onDismiss: () => void }) {
  return (
    <div className="mt-3 flex items-start justify-between gap-3 border border-dashed border-line-strong px-3.5 py-3 text-[12.5px] leading-[1.7] text-soft">
      <p>{children}</p>
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="-m-1 p-1 text-faint hover:text-ink">
        <MIcon name="close" className="size-3.5" />
      </button>
    </div>
  );
}
