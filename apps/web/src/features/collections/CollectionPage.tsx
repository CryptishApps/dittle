import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { EditValue } from "@/features/editor/ValueCard";
import { createSyncedValueStore, useValues, type TrackedValue } from "@/features/editor/values";
import { collectionsQuery, notesQuery, rowsQuery, valuesQuery, writes } from "@/features/notes/api";
import { changeOutsideEditor } from "@/features/notes/editor-services";
import type { Quantity } from "@/features/editor/linking";
import type { NoteSummary } from "@/features/notes/store";
import { showToast } from "@/features/notes/toast";
import { ease, MIcon } from "@/ui/kit";
import { rowLabel } from "./format";

export function CollectionPage({ uid, collectionId }: { uid: string; collectionId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: collections } = useSuspenseQuery(collectionsQuery(uid));
  const { data: rows } = useSuspenseQuery(rowsQuery(uid));
  useSuspenseQuery(valuesQuery(uid));
  const { data: notes } = useSuspenseQuery(notesQuery(uid));
  const [store] = useState(() => createSyncedValueStore(queryClient, uid, writes));
  const values = useValues(store);
  const [editing, setEditing] = useState<string>();
  const collection = collections.find((item) => item.id === collectionId);

  if (!collection) {
    return (
      <div className="grid flex-1 place-items-center px-6 text-center">
        <div>
          <p className="text-[13px] text-soft">This collection doesn't exist any more.</p>
          <Link to="/notes" className="mt-4 inline-block text-[12px] text-ink underline underline-offset-4">
            Back to your notes
          </Link>
        </div>
      </div>
    );
  }

  const columns = collection.fields.filter((field) => !(collection.key.by === "when" && field.kind === "date"));
  const mine = rows
    .filter((row) => row.collectionId === collection.id)
    .sort((a, b) => (collection.key.by === "when" ? b.id.localeCompare(a.id) : a.label.localeCompare(b.label)));
  const cell = (rowId: string, fieldId: string) => values.find((value) => value.subject?.entityId === rowId && value.field === fieldId);

  const change = (value: TrackedValue, text: string, quantity?: Quantity) => {
    setEditing(undefined);
    const used = notes.filter((note) => note.valueIds.includes(value.id)).length;
    changeOutsideEditor(queryClient, uid, store, value.id, text, quantity);
    showToast(`Changed ${value.text} to ${text}${used > 0 ? ` in ${used} ${used === 1 ? "note" : "notes"}` : ""}`);
  };

  const remove = () => {
    writes.deleteCollection(uid, collection.id);
    showToast(`Deleted collection "${collection.name}". The values stay in your notes.`);
    void navigate({ to: "/notes" });
  };

  return (
    <>
      <nav aria-label="Breadcrumb" className="flex h-10 shrink-0 items-center gap-2 px-4 text-[11.5px] text-faint sm:px-6">
        <Link to="/notes" className="inline-flex items-center gap-1.5 hover:text-ink">
          <MIcon name="left" className="size-3.5" />
          Home
        </Link>
        <span aria-hidden>/</span>
        <span className="truncate text-soft">{collection.name}</span>
      </nav>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-[860px] px-6 pt-8 pb-24 sm:px-10">
          <p className="text-[11px] tracking-[0.06em] text-faint uppercase">Collection · one row per {collection.key.by === "when" ? "day" : "name"}</p>
          <div className="mt-2 flex items-baseline justify-between gap-4">
            <h1 className="text-[26px] leading-tight font-medium tracking-[-0.03em]">{collection.name}</h1>
            <button type="button" onClick={remove} className="text-[11px] tracking-[0.04em] text-soft uppercase hover:text-accent-ink">
              Delete collection
            </button>
          </div>

          {mine.length === 0 ? (
            <p className="mt-8 text-[13px] text-soft">No rows yet. Values you write about in any note land here.</p>
          ) : (
            <table className="mt-8 w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-line-strong text-[10.5px] tracking-[0.06em] text-faint uppercase">
                  <th className="py-2 pr-6 font-normal">{collection.key.by === "when" ? "Date" : "Name"}</th>
                  {columns.map((field) => (
                    <th key={field.id} className="py-2 pr-6 font-normal">
                      {field.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {mine.map((row) => (
                    <m.tr
                      key={row.id}
                      layout="position"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3, ease }}
                      className="border-b border-line"
                    >
                      <td className="py-2.5 pr-6 align-top whitespace-nowrap text-soft">{rowLabel(row)}</td>
                      {columns.map((field) => {
                        const value = cell(row.id, field.id);
                        return (
                          <td key={field.id} className="py-2.5 pr-6 align-top">
                            {value ? (
                              <Cell value={value} notes={notes} editing={editing === value.id} onEdit={() => setEditing(value.id)} onClose={() => setEditing(undefined)} onChange={change} />
                            ) : (
                              <span className="text-faint">–</span>
                            )}
                          </td>
                        );
                      })}
                    </m.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

type CellProps = {
  value: TrackedValue;
  notes: NoteSummary[];
  editing: boolean;
  onEdit: () => void;
  onClose: () => void;
  onChange: (value: TrackedValue, text: string, quantity?: Quantity) => void;
};

function Cell({ value, notes, editing, onEdit, onClose, onChange }: CellProps) {
  const box = useRef<HTMLDivElement>(null);
  const noteId = value.origin?.noteId;
  const usedIn = notes.filter((note) => note.valueIds.includes(value.id)).length;
  const source = notes.find((note) => note.id === noteId);

  useEffect(() => {
    if (!editing) return;
    const outside = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) onClose();
    };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [editing, onClose]);

  if (value.formula || value.proposal) {
    return (
      <Link to="/notes/$noteId" params={{ noteId: noteId ?? "" }} disabled={!noteId} title={value.formula ? "Calculated from other values" : undefined} className="px-1 py-0.5 text-soft hover:bg-chip">
        {value.text}
      </Link>
    );
  }

  if (!editing) {
    return (
      <button type="button" onClick={onEdit} title="Click to change" className="bg-chip px-1 py-0.5 text-left text-ink hover:bg-chip-hover">
        {value.text}
      </button>
    );
  }

  return (
    <div ref={box} className="-mt-2 min-w-[200px]">
      <EditValue value={value} count={1} onSave={(text, _scope, quantity) => onChange(value, text, quantity)} onCancel={onClose} />
      <p className="mt-1 text-[11px] text-faint">
        {usedIn > 1 ? `Changes it in ${usedIn} notes · ` : ""}
        {noteId ? (
          <Link to="/notes/$noteId" params={{ noteId }} className="hover:text-ink">
            From {source?.title || "Untitled"} ↗
          </Link>
        ) : null}
      </p>
    </div>
  );
}
