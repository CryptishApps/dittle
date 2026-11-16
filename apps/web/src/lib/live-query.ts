import { hashKey, type QueryClient, type QueryFunction, type QueryKey } from "@tanstack/react-query";

export type Listen<T> = (next: (data: T) => void, fail: (error: Error) => void) => Promise<() => void>;

const active = new Map<string, () => void>();
const watched = new WeakSet<QueryClient>();

function stopListenersWhenRemoved(client: QueryClient) {
  if (watched.has(client)) return;
  watched.add(client);
  client.getQueryCache().subscribe((event) => {
    if (event.type !== "removed") return;
    active.get(event.query.queryHash)?.();
    active.delete(event.query.queryHash);
  });
}

export function live<T, Key extends QueryKey>(listen: Listen<T>): QueryFunction<T, Key> {
  return ({ client, queryKey }) => {
    stopListenersWhenRemoved(client);
    const hash = hashKey(queryKey);
    const cached = client.getQueryData<T>(queryKey);
    if (active.has(hash) && cached !== undefined) return Promise.resolve(cached);
    active.get(hash)?.();

    return new Promise<T>((resolve, reject) => {
      let first = true;
      const stop = () => {
        active.delete(hash);
        void unsubscribe.then((off) => off());
      };
      const unsubscribe = listen(
        (data) => {
          if (!first) return void client.setQueryData<T>(queryKey as QueryKey, data);
          first = false;
          resolve(data);
        },
        (error) => {
          stop();
          if (first) reject(error);
          else void client.invalidateQueries({ queryKey, exact: true });
        },
      );
      unsubscribe.catch((error: unknown) => {
        active.delete(hash);
        reject(error);
      });
      active.set(hash, stop);
    });
  };
}
