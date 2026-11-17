import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { Editor } from "@tiptap/react";
import { m } from "motion/react";
import { useEffect } from "react";
import { rowLabel } from "@/features/collections/format";
import { summariseCollection } from "@/features/collections/summary";
import { changeValue } from "@/features/editor/change-value";
import type { EditorServices } from "@/features/editor/services";
import { EditValue, nameOf } from "@/features/editor/EditValue";
import { contextLine, StartCollection } from "@/features/editor/ValueCard";
import { useValues, type ValueStore } from "@/features/editor/values";
import { describeFormula } from "@/features/formulas/apply";
import { ease, MIcon } from "@/ui/kit";
import { collectionsQuery, notesQuery, rowsQuery, valuesQuery } from "./api";

const RECENT_ROWS = 4;
const WHEN = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

type ValuePanelProps = {
  uid: string;
  noteId: string;
  valueId: string;
  focusOnOpen: boolean;
  editor: Editor;
  store: ValueStore;
  services: EditorServices;
  onClose: () => void;
};

export function ValuePanel({ uid, noteId, valueId, focusOnOpen, editor, store, services, onClose }: ValuePanelProps) {
  const values = useValues(store);
  const { data: notes } = useSuspenseQuery(notesQuery(uid));
  const { data: collections } = useSuspenseQuery(collectionsQuery(uid));
  const { data: rows } = useSuspenseQuery(rowsQuery(uid));
  const value = values.find((item) => item.id === valueId);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!value) return null;

  const usedIn = notes.filter((note) => note.valueIds.includes(value.id));
  const row = rows.find((item) => item.id === value.subject?.entityId);
  const collection = row && collections.find((item) => item.id === row.collectionId);
  const context = contextLine(value);
  const formula = value.formula && describeFormula(value, (id) => store.get(id));

  return (
    <m.aside
      aria-label={`About ${value.text}`}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, ease }}
      className="fixed inset-x-0 top-14 bottom-0 z-40 overflow-y-auto border-l border-line bg-side px-5 pt-4 pb-10 text-[12.5px] shadow-pop sm:left-auto sm:w-[400px] lg:static lg:z-auto lg:w-[380px] lg:shrink-0 lg:shadow-none"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-[10.5px] tracking-[0.06em] text-faint uppercase">{[nameOf(value), value.kind].filter(Boolean).join(" · ")}</p>
        <button type="button" onClick={onClose} aria-label="Close" className="grid size-7 place-items-center text-soft hover:bg-chip hover:text-ink">
          <MIcon name="close" className="size-3.5" />
        </button>
      </div>
      <p className="mt-3 text-[28px] leading-tight font-medium tracking-[-0.03em] break-words">{value.text}</p>
      {value.naming ? (
        <p className="mt-1.5">
          <span className="t-shimmer-text" data-text="Describing">
            Describing
          </span>
        </p>
      ) : (
        context && <p className="mt-1.5 text-soft">{context}</p>
      )}

      {formula ? (
        <div className="mt-5 border border-line bg-card px-3 py-2.5">
          <p className="text-[10.5px] tracking-[0.06em] text-faint uppercase">Calculated</p>
          <p className="mt-1 text-ink">= {formula}</p>
          <p className="mt-1 text-faint">Change an input and this follows.</p>
        </div>
      ) : (
        !value.proposal && (
          <div className="mt-5">
            <p className="text-[10.5px] tracking-[0.06em] text-faint uppercase">Change</p>
            <EditValue
              key={`${value.id}:${value.text}`}
              value={value}
              count={usedIn.length}
              autoFocus={focusOnOpen}
              onSave={(text, scope, quantity) => changeValue(editor, store, services, value, text, scope, quantity)}
              onCancel={onClose}
            />
          </div>
        )
      )}

      {row && collection ? (
        <CollectionPart uid={uid} collectionId={collection.id} rowId={row.id} />
      ) : (
        !value.field &&
        !value.proposal &&
        services.startCollection && (
          <div className="mt-6">
            <StartCollection value={value} onStart={(name, per) => services.startCollection?.(value, name, per)} />
          </div>
        )
      )}

      <p className="mt-6 text-[10.5px] tracking-[0.06em] text-faint uppercase">Used in</p>
      <ul className="mt-1.5">
        {usedIn.map((note) => (
          <li key={note.id} className="flex items-baseline justify-between gap-3 border-b border-dashed border-line py-1.5">
            {note.id === noteId ? (
              <span className="truncate text-ink">{note.title || "Untitled"}</span>
            ) : (
              <Link to="/notes/$noteId" params={{ noteId: note.id }} className="truncate text-accent-ink hover:underline">
                {note.title || "Untitled"}
              </Link>
            )}
            {note.id === noteId && <span className="shrink-0 text-faint">this note</span>}
          </li>
        ))}
      </ul>

      {value.history?.length ? (
        <>
          <p className="mt-6 text-[10.5px] tracking-[0.06em] text-faint uppercase">Before</p>
          <ul className="mt-1.5 space-y-1 text-soft">
            {[...value.history].reverse().map((entry, index) => (
              <li key={index}>
                {entry.text} <span className="text-faint">· until {WHEN.format(entry.at)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </m.aside>
  );
}

function CollectionPart({ uid, collectionId, rowId }: { uid: string; collectionId: string; rowId: string }) {
  const { data: collections } = useSuspenseQuery(collectionsQuery(uid));
  const { data: rows } = useSuspenseQuery(rowsQuery(uid));
  const { data: stored } = useSuspenseQuery(valuesQuery(uid));
  const collection = collections.find((item) => item.id === collectionId);
  if (!collection) return null;
  const byDay = collection.key.by === "when";
  const columns = collection.fields.filter((field) => !(byDay && field.kind === "date"));
  const mine = rows.filter((row) => row.collectionId === collection.id).sort((a, b) => (byDay ? b.id.localeCompare(a.id) : b.createdAt - a.createdAt));
  const shown = [...mine.filter((row) => row.id === rowId), ...mine.filter((row) => row.id !== rowId)].slice(0, RECENT_ROWS);
  if (byDay) shown.sort((a, b) => b.id.localeCompare(a.id));
  const summary = summariseCollection(collection, rows, stored);
  const cell = (id: string, fieldId: string) => stored.find((value) => value.subject?.entityId === id && value.field === fieldId);

  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[14px] font-medium">{collection.name}</span>
        <Link to="/notes/collections/$collectionId" params={{ collectionId }} className="text-[11px] text-faint hover:text-ink">
          {summary.totals[0]?.text ?? summary.count} {summary.scope} · open ↗
        </Link>
      </div>
      <table className="mt-2 w-full border-collapse text-left text-[12px]">
        <thead>
          <tr className="text-[10px] tracking-[0.06em] text-faint uppercase">
            <th className="border-b border-line py-1.5 pr-3 font-normal">{byDay ? "Day" : collection.rowLabel}</th>
            {columns.map((field) => (
              <th key={field.id} className="border-b border-line py-1.5 pr-3 font-normal">
                {field.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((row) => (
            <tr key={row.id} className={row.id === rowId ? "text-ink" : "text-soft"}>
              <td className="border-b border-dashed border-line py-1.5 pr-3 whitespace-nowrap">{rowLabel(row)}</td>
              {columns.map((field) => {
                const value = cell(row.id, field.id);
                return (
                  <td key={field.id} className="border-b border-dashed border-line py-1.5 pr-3">
                    {value ? <span className={row.id === rowId ? "bg-accent-tint px-1 text-accent-ink" : ""}>{value.text}</span> : <span className="text-faint">–</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
