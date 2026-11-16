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

  const tab = "px-2.5 py-1 transition hover:text-ink [&.active]:bg-ink [&.active]:text-page";
  return (
    <>
      <nav
        data-dev-nav
        className="fixed right-3 bottom-12 z-[60] flex items-center gap-1 border border-line-strong bg-card p-1 text-[11px] tracking-[0.04em] text-soft uppercase shadow-pop"
      >
        <span className="px-2 text-faint">Dev</span>
        <Link to="/dev/designs/app" className={tab}>
          App
        </Link>
        <Link to="/dev/designs/welcome" className={tab}>
          Homepage
        </Link>
        <Link to="/dev/designs/signin" className={tab}>
          Sign in
        </Link>
        <select
          aria-label="Theme"
          value={theme}
          onChange={(event) => setTheme(event.target.value as Theme)}
          className="ml-1 bg-transparent px-1 py-1 uppercase outline-none"
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </nav>
      <Outlet />
    </>
  );
}
