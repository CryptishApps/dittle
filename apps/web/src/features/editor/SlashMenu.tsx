import type { SlashCommand } from "./slash-commands";
import { useMenuCursor, type MenuProps } from "./suggestion-menu";

export function SlashMenu(props: MenuProps<SlashCommand>) {
  const { items, command } = props;
  const { index, point } = useMenuCursor(props);

  return (
    <div className="w-[264px] border border-line-strong bg-card text-[12.5px] shadow-pop" role="listbox" aria-label="Commands">
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
            className="block w-full px-3 py-2 text-left aria-selected:bg-panel"
          >
            <span className="block truncate text-ink">{item.label}</span>
            <span className="block truncate text-[11px] text-faint">{item.hint}</span>
          </button>
        ))
      )}
      <p className="border-t border-line px-3 py-1.5 text-[10.5px] tracking-[0.04em] text-faint uppercase">Enter to choose · Esc to cancel</p>
    </div>
  );
}
