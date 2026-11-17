import { describe, expect, test } from "bun:test";
import { fromNoteDoc, summarise, toNoteDoc } from "./note-doc";
import { STARTERS } from "./starters";

describe("starter notes", () => {
  test("each starter opens in the editor exactly as written", () => {
    for (const starter of STARTERS) expect(toNoteDoc(fromNoteDoc(starter.doc))).toEqual(starter.doc);
  });

  test("each starter is titled with its own name and has a body to preview", () => {
    for (const starter of STARTERS) {
      const { title, preview } = summarise(starter.doc);
      expect(title).toBe(starter.title);
      expect(preview.length).toBeGreaterThan(40);
    }
  });

  test("starter titles are unique", () => {
    expect(new Set(STARTERS.map((starter) => starter.title)).size).toBe(STARTERS.length);
  });
});
