const KEY = "dittle.reloadedForBuild";
const RETRY_AFTER_MS = 10_000;

export function shouldReload(lastReloadAt: number | undefined, now: number): boolean {
  return lastReloadAt === undefined || !Number.isFinite(lastReloadAt) || now - lastReloadAt > RETRY_AFTER_MS;
}

function lastReload(): number | undefined {
  try {
    const stored = sessionStorage.getItem(KEY);
    return stored === null ? undefined : Number(stored);
  } catch {
    return undefined;
  }
}

export function reloadOnStaleBuild(): void {
  window.addEventListener("vite:preloadError", (event) => {
    const now = Date.now();
    if (!shouldReload(lastReload(), now)) return;
    event.preventDefault();
    try {
      sessionStorage.setItem(KEY, String(now));
    } catch {
      return;
    }
    window.location.reload();
  });
}
