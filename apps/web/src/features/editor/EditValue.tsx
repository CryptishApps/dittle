import { useState, type KeyboardEvent, type ReactNode } from "react";
import { formatAmount } from "@/features/formulas/apply";
import { formatDuration, joinDuration, splitDuration, type DurationParts } from "@/features/formulas/duration";
import type { ChangeScope } from "./change-value";
import type { Quantity } from "./linking";
import type { TrackedValue } from "./values";

export const nameOf = (value: { name?: string } | undefined) => value?.name?.replaceAll("_", " ") ?? "value";
export const usedIn = (count: number) => `${count} ${count === 1 ? "note" : "notes"}`;

const NUMBER_INPUT = "h-full min-w-0 bg-transparent outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none";

export function Action({ primary, onClick, children }: { primary?: boolean; onClick: () => void; children: ReactNode }) {
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
            {value.text} is used in {usedIn(count)}.
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
