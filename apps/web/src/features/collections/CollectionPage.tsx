import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { EditValue } from "@/features/editor/EditValue";
import { createSyncedValueStore, useValues, type TrackedValue } from "@/features/editor/values";
import { collectionsQuery, notesQuery, rowsQuery, valuesQuery, writes } from "@/features/notes/api";
import { changeOutsideEditor } from "@/features/notes/editor-services";
import type { Quantity } from "@/features/editor/linking";
import type { NoteSummary } from "@/features/notes/store";
import { showToast } from "@/features/notes/toast";
import type { CalculatedColumn, Glance } from "@/features/notes/fact";
import { btnClass, ease, MIcon } from "@/ui/kit";
import { AddColumn } from "./AddColumn";
import { columnValue, describeColumn, type RowCells } from "./columns";
import { GLANCES, glanceHint } from "./glance";
import { rowLabel } from "./format";
import { scalesOf, withUnits } from "./scale";
import { summariseRows, type FieldTotal } from "./summary";

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
          <Link to="/notes" className={`${btnClass({ variant: "primary", size: "md" })} mt-6`}>
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
  const rowIds = new Set(mine.map((row) => row.id));
  const cells = withUnits(values.filter((value) => value.field && rowIds.has(value.subject?.entityId ?? "")));
  const scales = scalesOf(collection.fields, cells);
  const lookup = (rowId: string): RowCells => (fieldId) => cells.find((value) => value.subject?.entityId === rowId && value.field === fieldId);
  const calculated = collection.columns ?? [];
  const { totals, columns: averages } = summariseRows(collection, rowIds, values);

  const saveColumns = (next: CalculatedColumn[]) => writes.saveColumns(uid, collection.id, next);
  const addColumn = (column: CalculatedColumn) => {
    saveColumns([...calculated, column]);
    showToast(`Added ${column.name} to ${collection.name}`);
  };
  const removeColumn = (column: CalculatedColumn) => {
    saveColumns(calculated.filter((other) => other.id !== column.id));
    showToast(`Removed ${column.name}`);
  };

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
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-[920px] px-5 pb-24 sm:px-8">
          <nav aria-label="Breadcrumb" className="flex h-14 items-center gap-1.5 pt-4 text-[14px] text-faint sm:pt-6">
            <Link to="/notes" className="shrink-0 transition-colors hover:text-ink">
              Home
            </Link>
            <MIcon name="chevron" className="size-3.5 shrink-0" />
            <span aria-current="page" className="min-w-0 truncate text-soft">
              {collection.name}
            </span>
          </nav>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 sm:mt-5">
            <div className="min-w-0">
              <h1 className="text-[34px] leading-[1.1] font-semibold tracking-[-0.03em] sm:text-[40px]">{collection.name}</h1>
              <p className="mt-1.5 text-[14px] text-faint">Collection · one row per {collection.key.by === "when" ? "day" : "name"}</p>
            </div>
            <button type="button" onClick={remove} className="mb-0.5 inline-flex h-8 shrink-0 items-center rounded-lg px-3 text-[13.5px] font-medium whitespace-nowrap text-soft transition-colors hover:bg-danger-tint hover:text-danger">
              Delete collection
            </button>
          </div>
          <GlanceChoice glance={collection.glance ?? "total"} byDay={collection.key.by === "when"} onChange={(glance) => writes.setGlance(uid, collection.id, glance)} />

          {mine.length === 0 ? (
            <p className="mt-8 border-t border-line py-5 text-[15px] text-faint">No rows yet. Values you write about in any note land here.</p>
          ) : (
            <div className="mt-8 overflow-x-auto">
              <table className="w-full border-collapse text-left text-[14.5px] whitespace-nowrap">
                <thead>
                  <tr className="border-b border-line text-[13px] text-faint">
                    <th className={`${CELL} py-2.5 font-medium`}>{collection.key.by === "when" ? "Date" : "Name"}</th>
                    {columns.map((field) => (
                      <th key={field.id} className={`${CELL} py-2.5 font-medium first-letter:uppercase`}>
                        {field.name}
                      </th>
                    ))}
                    {calculated.map((column) => (
                      <th key={column.id} className={`group ${CELL} py-2.5 font-medium first-letter:uppercase`} title={`= ${describeColumn(column, collection.fields) ?? ""}`}>
                        <span className="inline-flex items-center gap-1.5">
                          {column.name}
                          <button
                            type="button"
                            onClick={() => removeColumn(column)}
                            aria-label={`Remove ${column.name}`}
                            className="grid size-5 place-items-center rounded-full text-faint opacity-0 group-hover:opacity-100 hover:bg-chip hover:text-ink focus-visible:opacity-100"
                          >
                            <MIcon name="close" className="size-3.5" />
                          </button>
                        </span>
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
                        className="border-b border-line last:border-b-0"
                      >
                        <td className={`${CELL} py-3 align-top whitespace-nowrap text-soft`}>{rowLabel(row)}</td>
                        {columns.map((field) => {
                          const value = cell(row.id, field.id);
                          return (
                            <td key={field.id} className={`${CELL} py-3 align-top tabular-nums`}>
                              {value ? (
                                <Cell value={value} notes={notes} editing={editing === value.id} onEdit={() => setEditing(value.id)} onClose={() => setEditing(undefined)} onChange={change} />
                              ) : (
                                <span className="text-faint">–</span>
                              )}
                            </td>
                          );
                        })}
                        {calculated.map((column) => (
                          <td key={column.id} className={`${CELL} py-3 align-top text-soft tabular-nums`}>
                            {columnValue(column, lookup(row.id), scales)?.text ?? <span className="text-faint">–</span>}
                          </td>
                        ))}
                      </m.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
                {mine.length > 1 && (
                  <tfoot>
                    <tr className="border-t border-line-strong align-top text-[13.5px]">
                      <td className={`${CELL} py-3 text-soft`}>{mine.length} rows</td>
                      {columns.map((field) => (
                        <td key={field.id} className={`${CELL} py-3`}>
                          <FooterTotal total={totals.find((item) => item.field.id === field.id)} rows={mine.length} />
                        </td>
                      ))}
                      {averages.map(({ column, average }) => (
                        <td key={column.id} className={`${CELL} py-3 text-soft tabular-nums`}>
                          {average ? (
                            <>
                              avg {average.text}
                              {average.counted < mine.length && <span className="block text-faint">from {average.counted} of {mine.length}</span>}
                            </>
                          ) : null}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
          {mine.length > 0 && <AddColumn collection={collection} rows={mine.map((row) => lookup(row.id))} scales={scales} onAdd={addColumn} />}
        </div>
      </div>
    </>
  );
}

function FooterTotal({ total, rows }: { total?: FieldTotal; rows: number }) {
  if (!total) return null;
  const from = total.counted < rows ? `from ${total.counted} of ${rows}` : "";
  return (
    <>
      <span className="text-[15px] font-semibold text-ink tabular-nums">{total.text}</span>
      {(total.average || from) && (
        <span className="block text-soft">
          {total.average && `avg ${total.average} `}
          <span className="text-faint">{from}</span>
        </span>
      )}
      {total.otherUnits > 0 && <span className="block text-faint">{total.otherUnits} in other units not added</span>}
    </>
  );
}

const CELL = "px-3 first:pl-0 last:pr-0";

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
      <Link to="/notes/$noteId" params={{ noteId: noteId ?? "" }} disabled={!noteId} title={value.formula ? "Calculated from other values" : undefined} data-derived={Boolean(value.formula)} className="value-chip">
        {value.text}
      </Link>
    );
  }

  if (!editing) {
    return (
      <button type="button" onClick={onEdit} title="Click to change" className="value-chip text-left">
        {value.text}
      </button>
    );
  }

  return (
    <div ref={box} className="-mt-2 min-w-[200px]">
      <EditValue value={value} count={1} onSave={(text, _scope, quantity) => onChange(value, text, quantity)} onCancel={onClose} />
      <p className="mt-1.5 text-[12.5px] text-faint">
        {usedIn > 1 ? `Changes it in ${usedIn} notes · ` : ""}
        {noteId ? (
          <Link to="/notes/$noteId" params={{ noteId }} className="text-soft underline decoration-line-strong underline-offset-4 hover:text-ink">
            From {source?.title || "Untitled"}
          </Link>
        ) : null}
      </p>
    </div>
  );
}

function GlanceChoice({ glance, byDay, onChange }: { glance: Glance; byDay: boolean; onChange: (glance: Glance) => void }) {
  return (
    <fieldset className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2">
      <legend className="float-left mr-1 text-[13.5px] text-faint">Show on home</legend>
      <div className="flex flex-wrap gap-1 rounded-[10px] border border-line p-0.5">
        {GLANCES.map((option) => (
          <label
            key={option.glance}
            title={glanceHint(option.glance, byDay)}
            className={`cursor-pointer rounded-lg px-2.5 py-1 text-[13.5px] transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink ${glance === option.glance ? "bg-ink font-medium text-page" : "text-soft hover:bg-chip hover:text-ink"}`}
          >
            <input type="radio" name="glance" value={option.glance} checked={glance === option.glance} onChange={() => onChange(option.glance)} className="sr-only" />
            {option.label}
          </label>
        ))}
      </div>
      <span className="text-[13px] text-faint">{glanceHint(glance, byDay)}</span>
    </fieldset>
  );
}
