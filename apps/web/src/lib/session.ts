import type { User } from "firebase/auth";
import { useSyncExternalStore } from "react";
import { SESSION_HINT_KEY } from "./session-key";

export type Session = { kind: "signedOut" } | { kind: "signedIn"; user: User };
export type Account = { uid: string; name: string };
export type SessionHint = { kind: "signedOut" } | { kind: "signedIn"; account: Account };

let current: Session | undefined;
const listeners = new Set<() => void>();

const NO_HINT: SessionHint = { kind: "signedOut" };

export const accountOf = (user: User): Account => ({ uid: user.uid, name: user.displayName ?? user.email ?? "" });

function isAccount(value: unknown): value is Account {
  if (typeof value !== "object" || value === null) return false;
  const { uid, name } = value as Partial<Account>;
  return typeof uid === "string" && uid.length > 0 && typeof name === "string";
}

export function sessionHint(): SessionHint {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(SESSION_HINT_KEY) ?? "null");
    return isAccount(stored) ? { kind: "signedIn", account: { uid: stored.uid, name: stored.name } } : NO_HINT;
  } catch {
    return NO_HINT;
  }
}

export function sessionEnded(session: Session | undefined, account: Account): boolean {
  return session !== undefined && (session.kind === "signedOut" || session.user.uid !== account.uid);
}

export function publishSession(session: Session): void {
  current = session;
  try {
    if (session.kind === "signedOut") localStorage.removeItem(SESSION_HINT_KEY);
    else localStorage.setItem(SESSION_HINT_KEY, JSON.stringify(accountOf(session.user)));
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

export type ConfirmMethod = "password" | "google";

const RECENT_SIGN_IN_MS = 4 * 60 * 1000;

export function signedInRecently(user: User, now = Date.now()): boolean {
  const at = Date.parse(user.metadata.lastSignInTime ?? "");
  return Number.isFinite(at) && now - at < RECENT_SIGN_IN_MS;
}

export function confirmMethod(user: User): ConfirmMethod {
  return user.providerData.some((info) => info.providerId === "password") ? "password" : "google";
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
