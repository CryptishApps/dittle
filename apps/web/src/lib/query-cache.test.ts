import { describe, expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import { persistQueryClientRestore, persistQueryClientSave, type PersistedClient } from "@tanstack/query-persist-client-core";
import { throttledPersister, type ClientStore } from "./query-cache";

function memoryStore(): ClientStore & { writes: PersistedClient[]; held: () => PersistedClient | undefined } {
  let held: PersistedClient | undefined;
  const writes: PersistedClient[] = [];
  return {
    read: async () => held,
    write: async (client) => {
      held = client;
      writes.push(client);
    },
    remove: async () => {
      held = undefined;
    },
    writes,
    held: () => held,
  };
}

const client = (buster: string): PersistedClient => ({ buster, timestamp: Date.now(), clientState: { queries: [], mutations: [] } });
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("throttledPersister", () => {
  test("writes the latest state once per wait", async () => {
    const store = memoryStore();
    const persister = throttledPersister(store, () => true, 20);

    void persister.persistClient(client("a"));
    void persister.persistClient(client("b"));
    void persister.persistClient(client("c"));
    expect(store.writes).toHaveLength(0);

    await wait(40);
    expect(store.writes.map((written) => written.buster)).toEqual(["c"]);
  });

  test("flush writes straight away and stop drops what is waiting", async () => {
    const store = memoryStore();
    const persister = throttledPersister(store, () => true, 1000);

    void persister.persistClient(client("a"));
    persister.flush();
    expect(store.writes.map((written) => written.buster)).toEqual(["a"]);

    void persister.persistClient(client("b"));
    persister.stop();
    persister.flush();
    expect(store.writes).toHaveLength(1);
  });

  test("writes nothing once the owner is no longer signed in", () => {
    const store = memoryStore();
    let signedIn = true;
    const persister = throttledPersister(store, () => signedIn, 1000);

    signedIn = false;
    void persister.persistClient(client("a"));
    persister.flush();

    expect(store.writes).toHaveLength(0);
  });
});

describe("restoring a kept cache", () => {
  const keep = async (store: ClientStore, buster: string) => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["notes", "ada"], [{ id: "n1", title: "Catering" }]);
    const persister = throttledPersister(store, () => true, 0);
    await persistQueryClientSave({ queryClient, persister, buster });
    persister.flush();
  };

  test("brings the queries back for the same owner and shapes", async () => {
    const store = memoryStore();
    await keep(store, "1:ada");

    const queryClient = new QueryClient();
    await persistQueryClientRestore({ queryClient, persister: throttledPersister(store, () => true, 0), buster: "1:ada" });

    expect(queryClient.getQueryData<{ id: string; title: string }[]>(["notes", "ada"])).toEqual([{ id: "n1", title: "Catering" }]);
  });

  test("discards a cache kept for another owner or older shapes", async () => {
    for (const buster of ["1:grace", "2:ada"]) {
      const store = memoryStore();
      await keep(store, "1:ada");

      const queryClient = new QueryClient();
      await persistQueryClientRestore({ queryClient, persister: throttledPersister(store, () => true, 0), buster });

      expect(queryClient.getQueryData(["notes", "ada"])).toBeUndefined();
      expect(store.held()).toBeUndefined();
    }
  });
});
