export type Settling = { track: <T>(work: Promise<T>) => Promise<T>; settled: (limitMs: number) => Promise<void> };

export function createSettling(): Settling {
  const pending = new Set<Promise<unknown>>();
  return {
    track: (work) => {
      pending.add(work);
      void work.finally(() => pending.delete(work)).catch(() => undefined);
      return work;
    },
    settled: (limitMs) => {
      if (pending.size === 0) return Promise.resolve();
      let timer: ReturnType<typeof setTimeout> | undefined;
      const limit = new Promise<void>((resolve) => {
        timer = setTimeout(resolve, limitMs);
      });
      return Promise.race([Promise.allSettled(pending).then(() => undefined), limit]).finally(() => clearTimeout(timer));
    },
  };
}
