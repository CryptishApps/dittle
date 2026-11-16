import type { User } from "firebase/auth";
import { useSyncExternalStore } from "react";
import { SESSION_HINT_KEY } from "./session-key";

export type Session = { kind: "signedOut" } | { kind: "signedIn"; user: User };
export type SessionKind = Session["kind"];

let current: Session | undefined;
const listeners = new Set<() => void>();

export function sessionHint(): SessionKind {
  try {
    const stored = localStorage.getItem(SESSION_HINT_KEY);
    return stored === "signedIn" ? stored : "signedOut";
  } catch {
    return "signedOut";
  }
}

export function publishSession(session: Session): void {
  current = session;
  try {
    if (session.kind === "signedOut") localStorage.removeItem(SESSION_HINT_KEY);
    else localStorage.setItem(SESSION_HINT_KEY, session.kind);
  } catch {}
  for (const listener of listeners) listener();
}

export function useSession(): Session | undefined {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => current,
  );
}

let loading: Promise<typeof import("./auth")> | undefined;

export function loadAuth(): Promise<typeof import("./auth")> {
  loading ??= import("./auth").catch((error: unknown) => {
    loading = undefined;
    throw error;
  });
  return loading;
}

export async function readSession(): Promise<Session> {
  return (await loadAuth()).ready();
}

export function preloadAuthWhenIdle(): () => void {
  const start = () => void loadAuth().catch(() => undefined);
  if ("requestIdleCallback" in window) {
    const id = window.requestIdleCallback(start, { timeout: 4000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = globalThis.setTimeout(start, 1500);
  return () => globalThis.clearTimeout(id);
}
