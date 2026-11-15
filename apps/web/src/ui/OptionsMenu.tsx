import { SourceTag } from "./InferenceMeter";

export type Option = {
  id: string;
  mark: "〃" | "=" | "+" | "";
  label: string;
  detail?: string;
  hint?: string;
};

export function OptionsMenu({
  quote,
  kind,
  options,
  onPick,
}: {
  quote: string;
  kind: string;
  options: Option[];
  onPick: (id: string) => void;
}) {
  return (
    <div role="menu" className="w-[19rem] overflow-hidden rounded-xl border border-rule bg-paper-raised font-ui shadow-pop">
      <div className="flex items-center justify-between gap-3 border-b border-rule px-3 py-2">
        <span className="truncate text-[12px] text-ink-soft">
          <span className="font-note text-[14px] text-ink">{quote}</span> · {kind}
        </span>
        <SourceTag source="device" />
      </div>
      <ul className="p-1">
        {options.map((option, index) => (
          <li key={option.id}>
            <button
              type="button"
              role="menuitem"
              onClick={() => onPick(option.id)}
              className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-ditto-wash focus-visible:bg-ditto-wash"
            >
              <span aria-hidden className="w-3 text-center font-mono text-[13px] text-ditto">
                {option.mark}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">
                  {option.label}
                  {option.detail && <span className="ml-1.5 font-mono text-[12px] text-ditto">{option.detail}</span>}
                </span>
                {option.hint && <span className="block truncate text-[11px] text-ink-faint">{option.hint}</span>}
              </span>
              {index === 0 && (
                <kbd className="rounded border border-rule px-1 font-mono text-[10px] text-ink-faint">↵</kbd>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
