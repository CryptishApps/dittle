import { createFileRoute } from "@tanstack/react-router";
import type { JSONContent } from "@tiptap/react";
import { useState } from "react";
import { NoteEditor } from "@/features/editor/NoteEditor";
import { VALUE_NODE } from "@/features/editor/value-tag";
import { createValueStore, useValues, type TrackedValue } from "@/features/editor/values";
import { Wordmark } from "@/ui/Wordmark";

export const Route = createFileRoute("/dev/editor")({
  component: EditorPage,
});

const SEED: TrackedValue[] = [
  { id: "seed-guests", text: "80", kind: "count", name: "guest_count", naming: false },
  { id: "seed-head", text: "£38", kind: "money", name: "per_head_price", naming: false },
  { id: "seed-date", text: "14 June", kind: "date", name: "wedding_date", naming: false },
];

const tag = (value: TrackedValue): JSONContent => ({ type: VALUE_NODE, attrs: { id: value.id, label: value.text, mentionSuggestionChar: "@" } });

const CONTENT: JSONContent = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Catering quote" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Rosa's Kitchen can do a buffet for " },
        tag(SEED[0]!),
        { type: "text", text: " guests at " },
        tag(SEED[1]!),
        { type: "text", text: " a head, for the wedding on " },
        tag(SEED[2]!),
        { type: "text", text: "." },
      ],
    },
    { type: "paragraph" },
  ],
};

function EditorPage() {
  const [store] = useState(() => createValueStore(SEED));
  const values = useValues(store);

  return (
    <div className="min-h-dvh bg-page">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-6">
        <Wordmark className="text-[15px]" />
        <span className="text-[11px] tracking-[0.06em] text-faint uppercase">Editor test</span>
      </header>
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <main>
          <NoteEditor store={store} content={CONTENT} label="Note" />
        </main>
        <aside className="text-[12px] lg:border-l lg:border-line lg:pl-6">
          <h2 className="text-[11px] tracking-[0.06em] text-faint uppercase">Values</h2>
          <ul className="mt-3 space-y-3">
            {values.map((value) => (
              <li key={value.id} className="border-b border-line pb-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-ink">{value.text}</span>
                  <span className="text-[10.5px] tracking-[0.04em] text-faint uppercase">{value.kind ?? ""}</span>
                </div>
                <div className="mt-0.5 text-soft">
                  {value.naming ? (
                    <span className="t-shimmer-text" data-text="Naming">
                      Naming
                    </span>
                  ) : (
                    (value.name ?? "unnamed")
                  )}
                </div>
                {value.namedBy && (
                  <div className="mt-0.5 text-[11px] text-faint">
                    {value.namedBy.where === "on_device" ? "On device" : "Cloud"} · {(value.namedBy.ms / 1000).toFixed(1)} s
                  </div>
                )}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
