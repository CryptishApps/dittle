import { beforeEach, describe, expect, test } from "bun:test";
import type { User } from "firebase/auth";
import { publishSession, sessionEnded, sessionHint } from "./session";
import { SESSION_HINT_KEY } from "./session-key";

const stored = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => void stored.set(key, value),
    removeItem: (key: string) => void stored.delete(key),
  },
});

const user = (uid: string, displayName: string | null, email: string | null) => ({ uid, displayName, email }) as User;

beforeEach(() => stored.clear());

describe("sessionHint", () => {
  test("is signed out when nothing is stored", () => {
    expect(sessionHint()).toEqual({ kind: "signedOut" });
  });

  test("is signed out for the older hint that had no account", () => {
    stored.set(SESSION_HINT_KEY, "signedIn");
    expect(sessionHint()).toEqual({ kind: "signedOut" });
  });

  test("is signed out when the stored account is incomplete", () => {
    stored.set(SESSION_HINT_KEY, JSON.stringify({ uid: "", name: "Ada" }));
    expect(sessionHint()).toEqual({ kind: "signedOut" });
    stored.set(SESSION_HINT_KEY, JSON.stringify({ uid: "u1" }));
    expect(sessionHint()).toEqual({ kind: "signedOut" });
  });

  test("names the account that last signed in on this device", () => {
    publishSession({ kind: "signedIn", user: user("u1", "Ada", "ada@example.com") });
    expect(sessionHint()).toEqual({ kind: "signedIn", account: { uid: "u1", name: "Ada" } });

    publishSession({ kind: "signedIn", user: user("u2", null, "grace@example.com") });
    expect(sessionHint()).toEqual({ kind: "signedIn", account: { uid: "u2", name: "grace@example.com" } });
  });

  test("is cleared by signing out", () => {
    publishSession({ kind: "signedIn", user: user("u1", "Ada", null) });
    publishSession({ kind: "signedOut" });
    expect(sessionHint()).toEqual({ kind: "signedOut" });
  });
});

describe("sessionEnded", () => {
  const account = { uid: "u1", name: "Ada" };

  test("is false until the real session is known", () => {
    expect(sessionEnded(undefined, account)).toBe(false);
  });

  test("is false while the same account is signed in", () => {
    expect(sessionEnded({ kind: "signedIn", user: user("u1", "Ada", null) }, account)).toBe(false);
  });

  test("is true after signing out or switching account", () => {
    expect(sessionEnded({ kind: "signedOut" }, account)).toBe(true);
    expect(sessionEnded({ kind: "signedIn", user: user("u2", "Grace", null) }, account)).toBe(true);
  });
});
