import { describe, expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import { ensureLive, live, type Listen } from "./live-query";

type Feed<T> = { listen: Listen<T>; push: (data: T) => void; started: () => number };

function feed<T>(): Feed<T> {
  let next: ((data: T) => void) | undefined;
  let count = 0;
  return {
    listen: async (onData) => {
      count += 1;
      next = onData;
      return () => undefined;
    },
    push: (data) => next?.(data),
    started: () => count,
  };
}

const settled = () => new Promise((resolve) => setTimeout(resolve, 0));
const forever = { staleTime: Number.POSITIVE_INFINITY };

describe("ensureLive", () => {
  test("waits for the first snapshot when nothing is cached", async () => {
    const client = new QueryClient();
    const notes = feed<string[]>();
    const options = { queryKey: ["empty-cache"], queryFn: live<string[], string[]>(notes.listen), ...forever };
    let waitedForPaint = false;

    const loaded = ensureLive(client, options, async () => {
      waitedForPaint = true;
    });
    await settled();
    notes.push(["first"]);

    expect(await loaded).toEqual(["first"]);
    expect(waitedForPaint).toBe(false);
  });

  test("answers from the cache at once, then listens after the quiet moment", async () => {
    const client = new QueryClient();
    const notes = feed<string[]>();
    const options = { queryKey: ["restored"], queryFn: live<string[], string[]>(notes.listen), ...forever };
    client.setQueryData(options.queryKey, ["from device"]);
    let paint = () => {};
    const painted = new Promise<void>((resolve) => {
      paint = resolve;
    });

    expect(await ensureLive(client, options, () => painted)).toEqual(["from device"]);
    expect(notes.started()).toBe(0);

    paint();
    await settled();
    expect(notes.started()).toBe(1);

    notes.push(["from server"]);
    await settled();
    expect(client.getQueryData(options.queryKey)).toEqual(["from server"]);

    notes.push(["changed later"]);
    expect(client.getQueryData(options.queryKey)).toEqual(["changed later"]);
  });

  test("does not start a second listener for a query that is already live", async () => {
    const client = new QueryClient();
    const notes = feed<string[]>();
    const options = { queryKey: ["already-live"], queryFn: live<string[], string[]>(notes.listen), ...forever };
    const first = ensureLive(client, options, () => Promise.resolve());
    await settled();
    notes.push(["live"]);
    await first;

    await ensureLive(client, options, () => Promise.resolve());
    await ensureLive(client, options, () => Promise.resolve());
    await settled();

    expect(notes.started()).toBe(1);
  });
});
