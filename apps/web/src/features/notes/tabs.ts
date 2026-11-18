import { useSyncExternalStore } from "react";

export type Tab = { kind: "note" | "collection"; id: string };

const EMPTY: Tab[] = [];
const listeners = new Set<() => void>();
const cache = new Map<string, Tab[]>();

const storageKey = (uid: string) => `dittle:tabs:${uid}`;

const isTab = (entry: unknown): entry is Tab =>
  typeof entry === "object" &&
  entry !== null &&
  ((entry as Tab).kind === "note" || (entry as Tab).kind === "collection") &&
  typeof (entry as Tab).id === "string";

function read(uid: string): Tab[] {
  const known = cache.get(uid);
  if (known) return known;
  let tabs = EMPTY;
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKey(uid)) ?? "[]");
    if (Array.isArray(parsed)) tabs = parsed.filter(isTab);
  } catch {
    tabs = EMPTY;
  }
  cache.set(uid, tabs);
  return tabs;
}

function persist(uid: string, tabs: Tab[]): void {
  try {
    localStorage.setItem(storageKey(uid), JSON.stringify(tabs));
  } catch {
    return;
  }
}

function write(uid: string, tabs: Tab[]): void {
  cache.set(uid, tabs);
  persist(uid, tabs);
  listeners.forEach((listener) => listener());
}

const sameTab = (a: Tab, b: Tab) => a.kind === b.kind && a.id === b.id;

export function openTab(uid: string, tab: Tab): void {
  const tabs = read(uid);
  if (tabs.some((open) => sameTab(open, tab))) return;
  write(uid, [...tabs, tab]);
}

export function closeTab(uid: string, tab: Tab): Tab | undefined {
  const tabs = read(uid);
  const index = tabs.findIndex((open) => sameTab(open, tab));
  if (index === -1) return undefined;
  const rest = tabs.filter((_, at) => at !== index);
  write(uid, rest);
  return rest[index] ?? rest[index - 1];
}

export function keepTabs(uid: string, keep: (tab: Tab) => boolean): void {
  const tabs = read(uid);
  const kept = tabs.filter(keep);
  if (kept.length !== tabs.length) write(uid, kept);
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useTabs(uid: string): Tab[] {
  return useSyncExternalStore(subscribe, () => read(uid));
}
