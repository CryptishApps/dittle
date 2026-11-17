import { ReactRenderer } from "@tiptap/react";
import type { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";
import { useImperativeHandle, useState, type ComponentType, type Ref } from "react";

export type MenuHandle = { onKeyDown: (event: KeyboardEvent) => boolean };

export type MenuProps<I> = SuggestionProps<I, I> & { ref?: Ref<MenuHandle> };

export function useMenuCursor<I>({ items, query, command, ref }: MenuProps<I>) {
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

  return { index, point: (position: number) => setCursor({ query, index: position }) };
}

export function renderMenu<I>(Menu: ComponentType<MenuProps<I>>): NonNullable<SuggestionOptions<I, I>["render"]> {
  return () => {
    let menu: ReactRenderer<MenuHandle, MenuProps<I>> | undefined;
    let unmount: (() => void) | undefined;
    return {
      onStart: (props) => {
        menu = new ReactRenderer(Menu, { props, editor: props.editor, className: "z-50" });
        unmount = props.mount(menu.element);
      },
      onUpdate: (props) => menu?.updateProps(props),
      onKeyDown: ({ event }) => menu?.ref?.onKeyDown(event) ?? false,
      onExit: () => {
        unmount?.();
        menu?.destroy();
        menu = undefined;
      },
    };
  };
}
