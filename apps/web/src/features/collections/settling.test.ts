import { describe, expect, test } from "bun:test";
import { createSettling } from "./settling";

const later = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => (resolve = done));
  return { promise, resolve };
};

describe("createSettling", () => {
  test("settles at once when nothing is pending", async () => {
    const settling = createSettling();
    let done = false;
    await settling.settled(1000).then(() => (done = true));
    expect(done).toBe(true);
  });

  test("waits for a pending rename before filing goes ahead", async () => {
    const settling = createSettling();
    const rename = later();
    void settling.track(rename.promise);
    let done = false;
    const waiting = settling.settled(1000).then(() => (done = true));
    await Promise.resolve();
    expect(done).toBe(false);
    rename.resolve();
    await waiting;
    expect(done).toBe(true);
  });

  test("stops waiting after the limit so a stuck rename never blocks filing", async () => {
    const settling = createSettling();
    void settling.track(new Promise<void>(() => undefined));
    const started = Date.now();
    await settling.settled(20);
    expect(Date.now() - started).toBeLessThan(500);
  });

  test("a failed rename still lets filing go ahead", async () => {
    const settling = createSettling();
    void settling.track(Promise.reject(new Error("model down"))).catch(() => undefined);
    await settling.settled(1000);
    expect(true).toBe(true);
  });
});
