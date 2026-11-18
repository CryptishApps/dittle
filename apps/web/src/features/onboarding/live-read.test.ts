import { describe, expect, test } from "bun:test";
import { liveReader, type Timer } from "./live-read";

function manualTimer() {
  let next: (() => void) | undefined;
  const timer: Timer = {
    set: (run) => {
      next = run;
      return run;
    },
    clear: (handle) => {
      if (handle === next) next = undefined;
    },
  };
  return { timer, fire: () => next?.(), waiting: () => next !== undefined };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}

function setup() {
  const clock = manualTimer();
  const asked: string[] = [];
  const answers = new Map<string, ReturnType<typeof deferred<string>>>();
  const results: string[] = [];
  const busy: boolean[] = [];
  const reader = liveReader<string>({
    wait: 600,
    read: (text) => {
      asked.push(text);
      const answer = deferred<string>();
      answers.set(text, answer);
      return answer.promise;
    },
    onResult: (text, result) => results.push(`${text} -> ${result}`),
    onError: () => results.push("error"),
    onBusy: (value) => busy.push(value),
    timer: clock.timer,
  });
  return { clock, asked, answers, results, busy, reader };
}

describe("liveReader", () => {
  test("reads once the typing pauses, not on every keystroke", () => {
    const { clock, asked, reader } = setup();
    reader.type("Ran");
    reader.type("Ran 5");
    reader.type("Ran 5 km");
    expect(asked).toEqual([]);
    clock.fire();
    expect(asked).toEqual(["Ran 5 km"]);
  });

  test("drops an answer for text the person has since changed", async () => {
    const { clock, answers, results, reader } = setup();
    reader.type("Ran 5 km");
    clock.fire();
    reader.type("Ran 5 km in 28 minutes");
    answers.get("Ran 5 km")!.resolve("old");
    await answers.get("Ran 5 km")!.promise;
    await Promise.resolve();
    expect(results).toEqual([]);
    clock.fire();
    answers.get("Ran 5 km in 28 minutes")!.resolve("new");
    await new Promise((done) => setTimeout(done, 0));
    expect(results).toEqual(["Ran 5 km in 28 minutes -> new"]);
  });

  test("reads straight away on Enter and reuses a read already under way", async () => {
    const { clock, asked, answers, results, reader } = setup();
    reader.type("Lunch £8");
    clock.fire();
    const pressed = reader.now("Lunch £8");
    expect(asked).toEqual(["Lunch £8"]);
    expect(clock.waiting()).toBe(false);
    answers.get("Lunch £8")!.resolve("found");
    await pressed;
    expect(results).toEqual(["Lunch £8 -> found"]);
  });

  test("stops showing busy once the text moves on from a pending read", () => {
    const { clock, busy, reader } = setup();
    reader.type("Ran 5 km");
    clock.fire();
    reader.type("Ran 5 km today");
    expect(busy).toEqual([true, false]);
  });

  test("cancel forgets the pending pause", () => {
    const { clock, asked, reader } = setup();
    reader.type("Ran 5 km");
    reader.cancel();
    clock.fire();
    expect(asked).toEqual([]);
  });
});
