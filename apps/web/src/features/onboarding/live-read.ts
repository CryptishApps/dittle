export type Timer = { set: (run: () => void, ms: number) => unknown; clear: (handle: unknown) => void };

const browserTimer: Timer = {
  set: (run, ms) => globalThis.setTimeout(run, ms),
  clear: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
};

type Options<T> = {
  wait: number;
  read: (text: string) => Promise<T>;
  onResult: (text: string, result: T) => void;
  onError: (text: string, error: unknown) => void;
  onBusy: (busy: boolean) => void;
  timer?: Timer;
};

export type LiveReader = { type: (text: string) => void; now: (text: string) => Promise<void>; cancel: () => void };

export function liveReader<T>({ wait, read, onResult, onError, onBusy, timer = browserTimer }: Options<T>): LiveReader {
  let latest = "";
  let handle: unknown;
  let pending = 0;
  let inFlight: { text: string; done: Promise<void> } | undefined;

  const run = (text: string): Promise<void> => {
    if (inFlight?.text === text) return inFlight.done;
    pending += 1;
    onBusy(true);
    const done = read(text)
      .then(
        (result) => {
          if (text === latest) onResult(text, result);
        },
        (error: unknown) => {
          if (text === latest) onError(text, error);
        },
      )
      .finally(() => {
        pending -= 1;
        if (inFlight?.done === done) inFlight = undefined;
        onBusy(pending > 0 && inFlight?.text === latest);
      });
    inFlight = { text, done };
    return done;
  };

  return {
    type: (text) => {
      latest = text;
      timer.clear(handle);
      if (inFlight && inFlight.text !== text) onBusy(false);
      if (text) handle = timer.set(() => void run(text), wait);
    },
    now: (text) => {
      latest = text;
      timer.clear(handle);
      return run(text);
    },
    cancel: () => {
      latest = "";
      timer.clear(handle);
      onBusy(false);
    },
  };
}
