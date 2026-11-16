const STORAGE_KEY = "dittle.aiCache";
const MAX_ENTRIES = 400;

type Entry = { key: string; value: unknown };

let entries: Map<string, unknown> | undefined;
let saveTimer: number | undefined;

function load(): Map<string, unknown> {
  if (entries) return entries;
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Entry[];
    entries = new Map(stored.map((entry) => [entry.key, entry.value]));
  } catch {
    entries = new Map();
  }
  return entries;
}

function scheduleSave() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      const recent = [...load()].slice(-MAX_ENTRIES).map(([key, value]) => ({ key, value }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
    } catch {}
  }, 1000);
}

const inFlight = new Map<string, Promise<unknown>>();

export function remembered<Input, Output>(namespace: string, run: (input: Input) => Promise<Output>, keyOf: (input: Input) => unknown = (input) => input): (input: Input) => Promise<Output> {
  return (input) => {
    const key = `${namespace}:${JSON.stringify(keyOf(input))}`;
    const cache = load();
    if (cache.has(key)) {
      const value = cache.get(key) as Output;
      cache.delete(key);
      cache.set(key, value);
      return Promise.resolve(value);
    }
    const pending = inFlight.get(key) as Promise<Output> | undefined;
    if (pending) return pending;
    const started = run(input)
      .then((value) => {
        cache.set(key, value);
        if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value!);
        scheduleSave();
        return value;
      })
      .finally(() => inFlight.delete(key));
    inFlight.set(key, started);
    return started;
  };
}
