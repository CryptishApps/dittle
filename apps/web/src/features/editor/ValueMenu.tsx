import type { SuggestionProps } from "@tiptap/suggestion";
import { useImperativeHandle, useState, type Ref } from "react";
import type { TrackedValue } from "./values";

export type MenuItem = { kind: "existing"; value: TrackedValue } | { kind: "new"; text: string };

export type MenuHandle = { onKeyDown: (event: KeyboardEvent) => boolean };

type ValueMenuProps = SuggestionProps<MenuItem, MenuItem> & { ref?: Ref<MenuHandle> };

const LIMIT = 5;

export function menuItems(values: TrackedValue[], query: string): MenuItem[] {
  const text = query.trim();
  const needle = text.toLowerCase();
  const matches = values
    .filter((value) => value.text.toLowerCase().includes(needle) || value.name?.replaceAll("_", " ").includes(needle))
    .slice(0, LIMIT)
    .map((value): MenuItem => ({ kind: "existing", value }));
  const exact = values.some((value) => value.text.toLowerCase() === needle);
  return text && !exact ? [...matches, { kind: "new", text }] : matches;
}

const menuContext = (value: TrackedValue) => [value.subject?.label, ...(value.conditions ?? [])].filter(Boolean).join(" · ");

export function ValueMenu({ items, command, query, ref }: ValueMenuProps) {
  const [cursor, setCursor] = useState({ query, index: 0 });
  const index = cursor.query === query ? Math.min(cursor.index, items.length - 1) : 0;
  const move = (step: number) => setCursor({ query, index: (index + step + items.length) % items.length });

  useImperativeHandle(ref, () => ({
    onKeyDown: (event) => {
      if (items.length === 0) return false;
      if (event.key === "ArrowDown") move(1);
      else if (event.key === "ArrowUp") move(-1);
      else if (event.key === "Enter" || event.key === "Tab") command(items[index]!);
      else return false;
      return true;
    },
  }));

  return (
    <div className="w-[264px] border border-line-strong bg-card text-[12.5px] shadow-pop" role="listbox" aria-label="Tag a value">
      {items.length === 0 ? (
        <p className="px-3 py-2.5 text-soft">Type a value, like 80 or 14 June.</p>
      ) : (
        items.map((item, position) => (
          <button
            key={item.kind === "new" ? "new" : item.value.id}
            type="button"
            role="option"
            aria-selected={position === index}
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => setCursor({ query, index: position })}
            onClick={() => command(item)}
            className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left aria-selected:bg-panel"
          >
            {item.kind === "new" ? (
              <>
                <span className="truncate text-ink">{item.text}</span>
                <span className="shrink-0 text-[10.5px] tracking-[0.04em] text-accent-ink uppercase">New value</span>
              </>
            ) : (
              <>
                <span className="min-w-0">
                  <span className="block truncate text-ink">{item.value.text}</span>
                  {menuContext(item.value) && <span className="block truncate text-[11px] text-faint">{menuContext(item.value)}</span>}
                </span>
                <span className="shrink-0 truncate text-[11px] text-faint">{item.value.name?.replaceAll("_", " ") ?? "unnamed"}</span>
              </>
            )}
          </button>
        ))
      )}
      <p className="border-t border-line px-3 py-1.5 text-[10.5px] tracking-[0.04em] text-faint uppercase">Enter to tag · Esc to cancel</p>
    </div>
  );
}
