export function safeRedirect(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

export function sameOriginPath(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url, location.origin);
    return parsed.origin === location.origin ? safeRedirect(parsed.pathname + parsed.search + parsed.hash) : undefined;
  } catch {
    return undefined;
  }
}
