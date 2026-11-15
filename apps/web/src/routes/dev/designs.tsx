import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/dev/designs")({
  component: DesignsLayout,
});

type Theme = "system" | "light" | "dark";

function DesignsLayout() {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);

  const tab = "rounded-full px-3 py-1 transition hover:text-ink [&.active]:bg-ink [&.active]:text-paper";
  return (
    <div className="min-h-dvh bg-paper">
      <nav data-dev-nav className="fixed right-3 bottom-3 z-50 flex items-center gap-1 rounded-full border border-rule bg-paper-raised/90 p-1 text-[12px] text-ink-soft shadow-pop backdrop-blur">
        <span className="px-2 text-[11px] text-ink-faint">designs</span>
        <Link to="/dev/designs/board" className={tab}>
          A · Board
        </Link>
        <Link to="/dev/designs/document" className={tab}>
          B · Document
        </Link>
        <Link to="/dev/designs/elsewhere" className={tab}>
          C · Elsewhere
        </Link>
        <Link to="/dev/designs/welcome" className={tab}>
          Welcome
        </Link>
        <Link to="/dev/designs/moments" className={tab}>
          Moments
        </Link>
        <select
          aria-label="Theme"
          value={theme}
          onChange={(event) => setTheme(event.target.value as Theme)}
          className="ml-1 rounded-full bg-transparent px-2 py-1 outline-none"
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </nav>
      <Outlet />
    </div>
  );
}
