import type { QueryClient } from "@tanstack/react-query";
import { persistQueryClient, type PersistedClient, type Persister } from "@tanstack/query-persist-client-core";
import { del, get, set } from "idb-keyval";
import { sessionHint } from "./session";

const KEY = "dittle.queries";
const KEEP_FOR_MS = 30 * 24 * 60 * 60_000;
const WRITE_EVERY_MS = 1000;

export type ClientStore = {
  read: () => Promise<PersistedClient | undefined>;
  write: (client: PersistedClient) => Promise<void>;
  remove: () => Promise<void>;
};

export type ThrottledPersister = Persister & { flush: () => void; stop: () => void };

export function throttledPersister(store: ClientStore, allowed: () => boolean, waitMs: number): ThrottledPersister {
  let waiting: PersistedClient | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = () => {
    clearTimeout(timer);
    timer = undefined;
    const client = waiting;
    waiting = undefined;
    if (client && allowed()) void store.write(client).catch(() => undefined);
  };

  return {
    persistClient: (client) => {
      waiting = client;
      timer ??= setTimeout(flush, waitMs);
    },
    restoreClient: store.read,
    removeClient: store.remove,
    flush,
    stop: () => {
      clearTimeout(timer);
      timer = undefined;
      waiting = undefined;
    },
  };
}

const onThisDevice: ClientStore = {
  read: () => get<PersistedClient>(KEY),
  write: (client) => set(KEY, client),
  remove: () => del(KEY),
};

type Kept = { owner: string; restored: Promise<void>; stop: () => void };

let kept: Kept | undefined;

export function keepOnDevice(queryClient: QueryClient, { owner, shapes }: { owner: string; shapes: string }): Promise<void> {
  if (kept?.owner === owner) return kept.restored;
  kept?.stop();

  const persister = throttledPersister(
    onThisDevice,
    () => {
      const hint = sessionHint();
      return hint.kind === "signedIn" && hint.account.uid === owner;
    },
    WRITE_EVERY_MS,
  );
  const [stopSaving, restored] = persistQueryClient({ queryClient, persister, maxAge: KEEP_FOR_MS, buster: `${shapes}:${owner}` });
  const saveWhenHidden = () => document.visibilityState === "hidden" && persister.flush();
  document.addEventListener("visibilitychange", saveWhenHidden);
  window.addEventListener("pagehide", persister.flush);

  kept = {
    owner,
    restored: restored.catch(() => undefined),
    stop: () => {
      stopSaving();
      persister.stop();
      document.removeEventListener("visibilitychange", saveWhenHidden);
      window.removeEventListener("pagehide", persister.flush);
    },
  };
  return kept.restored;
}

export async function forgetOnDevice(): Promise<void> {
  kept?.stop();
  kept = undefined;
  await onThisDevice.remove();
}
