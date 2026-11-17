import { POPOVER } from "@/ui/kit";
import { useMenuCursor, type MenuProps } from "./suggestion-menu";
import type { TrackedValue } from "./values";

export type MenuItem = { kind: "existing"; value: TrackedValue } | { kind: "new"; text: string };

const LIMIT = 5;

export function menuItems(values: TrackedValue[], query: string): MenuItem[] {
  const text = query.trim();
  const needle = text.toLowerCase();
  const isExact = (value: TrackedValue) => value.text.toLowerCase() === needle;
  const matches = values
    .filter((value) => value.text.toLowerCase().includes(needle) || value.name?.replaceAll("_", " ").includes(needle))
    .sort((a, b) => Number(isExact(b)) - Number(isExact(a)))
    .slice(0, LIMIT)
    .map((value): MenuItem => ({ kind: "existing", value }));
  return text ? [{ kind: "new", text }, ...matches] : matches;
}

const menuContext = (value: TrackedValue) => [value.subject?.label, ...(value.conditions ?? [])].filter(Boolean).join(" · ");

export function ValueMenu(props: MenuProps<MenuItem>) {
  const { items, command } = props;
  const { index, point } = useMenuCursor(props);

  return (
    <div className={`${POPOVER} w-[300px] p-1.5 text-[14px]`} role="listbox" aria-label="Tag a value">
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
            onMouseEnter={() => point(position)}
            onClick={() => command(item)}
            className="flex w-full items-baseline justify-between gap-3 rounded-xl px-3 py-2 text-left aria-selected:bg-panel"
          >
            {item.kind === "new" ? (
              <>
                <span className="truncate">
                  <span className="tag font-medium">{item.text}</span>
                </span>
                <span className="shrink-0 text-[12.5px] font-semibold text-accent-ink">New value</span>
              </>
            ) : (
              <>
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink tabular-nums">{item.value.text}</span>
                  {menuContext(item.value) && <span className="block truncate text-[12.5px] text-soft">{menuContext(item.value)}</span>}
                </span>
                <span className="shrink-0 truncate text-[12.5px] text-faint">{item.value.name?.replaceAll("_", " ") ?? "unnamed"}</span>
              </>
            )}
          </button>
        ))
      )}
      <p className="mt-1 border-t border-line px-3 pt-2 pb-1 text-[12.5px] text-faint">Enter to tag · Esc to cancel</p>
    </div>
  );
}
