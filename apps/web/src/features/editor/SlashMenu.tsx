import { POPOVER } from "@/ui/kit";
import type { SlashCommand } from "./slash-commands";
import { useMenuCursor, type MenuProps } from "./suggestion-menu";

export function SlashMenu(props: MenuProps<SlashCommand>) {
  const { items, command } = props;
  const { index, point } = useMenuCursor(props);

  return (
    <div className={`${POPOVER} w-[300px] p-1 text-[14px]`} role="listbox" aria-label="Commands">
      {items.length === 0 ? (
        <p className="px-3 py-2.5 text-soft">No command matches.</p>
      ) : (
        items.map((item, position) => (
          <button
            key={item.label}
            type="button"
            role="option"
            aria-selected={position === index}
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => point(position)}
            onClick={() => command(item)}
            className="block w-full rounded-lg px-2.5 py-1.5 text-left aria-selected:bg-chip"
          >
            <span className="block truncate font-medium text-ink">{item.label}</span>
            <span className="block truncate text-[12.5px] text-soft">{item.hint}</span>
          </button>
        ))
      )}
      <p className="mt-1 border-t border-line px-3 pt-2 pb-1 text-[12.5px] text-faint">Enter to choose · Esc to cancel</p>
    </div>
  );
}
