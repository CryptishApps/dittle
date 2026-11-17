import { describe, expect, test } from "bun:test";
import { KEPT_SHAPES_VERSION } from "./api";
import type { Collection, Row, StoredValue } from "./fact";
import type { NoteDoc } from "./note-doc";
import type { Folder, Note } from "./store";

const doc = {
  v: 1,
  blocks: [
    { t: "h", level: 1, c: [{ t: "text", text: "Catering", bold: true, italic: true }] },
    { t: "p", c: [{ t: "value", id: "v1", label: "80 guests" }] },
    { t: "ul", items: [{ c: [] }] },
    { t: "todo", items: [{ done: false, c: [] }] },
  ],
} satisfies NoteDoc;

const note = { id: "n1", title: "Catering", preview: "", updatedAt: 0, pending: false, folderId: null, valueIds: ["v1"], doc, ignoredRequests: [] } satisfies Required<Note>;

const folder = { id: "f1", name: "Wedding", createdAt: 0 } satisfies Required<Folder>;

const value = {
  id: "v1",
  text: "80 guests",
  kind: "number",
  name: "guest_count",
  subject: { label: "wedding", entityId: "r1" },
  field: "guests",
  event: false,
  when: { on: "2026-06-12", grain: "day" },
  conditions: [],
  remarks: [],
  origin: { noteId: "n1", sentence: "80 guests" },
  describedBy: { where: "on_device", ms: 0, v: "1" },
  history: [{ text: "70 guests", at: 0 }],
  notSame: [],
  proposal: { factId: "v2" },
  amount: 80,
  before: "",
  after: " guests",
  seconds: 0,
  formula: { expr: "a*b", inputs: ["v2"] },
  updatedAt: 0,
} satisfies Required<StoredValue>;

const collection = { id: "c1", name: "Runs", rowLabel: "run", fields: [{ id: "distance", name: "Distance", kind: "number" }], key: { by: "when", grain: "day" }, createdAt: 0 } satisfies Required<Collection>;

const row = { id: "r1", collectionId: "c1", label: "Sunday", period: "2026-06-12", createdAt: 0 } satisfies Required<Row>;

function shape(sample: unknown): unknown {
  if (Array.isArray(sample)) return sample.map(shape);
  if (sample === null || typeof sample !== "object") return typeof sample;
  return Object.fromEntries(
    Object.keys(sample)
      .sort()
      .map((key) => [key, shape((sample as Record<string, unknown>)[key])]),
  );
}

describe("shapes kept on the device", () => {
  test("change KEPT_SHAPES_VERSION whenever this snapshot has to change", () => {
    expect({ version: KEPT_SHAPES_VERSION, shapes: shape({ note, folder, value, collection, row }) }).toMatchSnapshot();
  });
});
