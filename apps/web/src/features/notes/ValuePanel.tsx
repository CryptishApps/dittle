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
    const dom = editor.view.dom;
    const mark = () =>
      dom.querySelectorAll<HTMLElement>(".value-tag").forEach((element) => {
        if (element.dataset.id === valueId) element.dataset.open = "true";
        else delete element.dataset.open;
      });
    mark();
    editor.on("transaction", mark);
    return () => {
      editor.off("transaction", mark);
      dom.querySelectorAll<HTMLElement>(".value-tag[data-open]").forEach((element) => delete element.dataset.open);
    };
  }, [editor, valueId]);

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
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease }}
      className="fixed inset-x-2 bottom-2 z-40 max-h-[70dvh] overflow-y-auto rounded-xl bg-card px-4 pt-3.5 pb-4 text-[14px] shadow-pop sm:inset-x-auto sm:top-[76px] sm:right-5 sm:bottom-auto sm:max-h-[calc(100dvh-96px)] sm:w-[320px]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[12.5px] text-faint first-letter:uppercase">{nameOf(value) ?? value.kind ?? "Value"}</p>
          <p className="mt-0.5 text-[20px] leading-tight font-semibold tracking-[-0.02em] break-words tabular-nums">{value.text}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="-mt-0.5 -mr-1.5 grid size-7 shrink-0 place-items-center rounded-md text-faint hover:bg-chip hover:text-ink">
          <MIcon name="close" className="size-3.5" />
        </button>
      </div>
      {value.naming ? (
        <p className="mt-1.5 text-[13.5px]">
          <span className="t-shimmer-text" data-text="Describing">
            Describing
          </span>
        </p>
      ) : (
        context && <p className="mt-1.5 text-[13.5px] text-soft">{context}</p>
      )}

      {formula ? (
        <div className="mt-3 border-t border-line pt-3">
          <p className="text-[12.5px] text-faint">Worked out</p>
          <p className="mt-0.5 font-medium text-ink">= {formula}</p>
          <p className="mt-0.5 text-[13px] text-faint">Change an input and this follows.</p>
        </div>
      ) : (
        !value.proposal && (
          <div className="mt-3 border-t border-line pt-3">
            <p className="text-[12.5px] text-faint">Change</p>
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
          <div className="mt-3">
            <StartCollection value={value} onStart={(name, per) => services.startCollection?.(value, name, per)} />
          </div>
        )
      )}

      <p className="mt-4 text-[12.5px] text-faint">Used in</p>
      <ul>
        {usedIn.map((note) => (
          <li key={note.id} className="flex items-baseline justify-between gap-3 border-b border-line py-1.5 last:border-b-0">
            {note.id === noteId ? (
              <span className="truncate text-ink">{note.title || "Untitled"}</span>
            ) : (
              <Link to="/notes/$noteId" params={{ noteId: note.id }} className="truncate font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                {note.title || "Untitled"}
              </Link>
            )}
            {note.id === noteId && <span className="shrink-0 text-[12.5px] text-faint">this note</span>}
          </li>
        ))}
      </ul>

      {value.history?.length ? (
        <>
          <p className="mt-4 text-[12.5px] text-faint">Before</p>
          <ul className="mt-1 space-y-0.5 text-soft">
            {[...value.history].reverse().map((entry, index) => (
              <li key={index}>
                <span className="text-faint line-through">{entry.text}</span> <span className="text-faint">· until {WHEN.format(entry.at)}</span>
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
    <div className="mt-4 border-t border-line pt-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[14px] font-semibold">{collection.name}</span>
        <Link to="/notes/collections/$collectionId" params={{ collectionId }} className="inline-flex items-center gap-1 text-[13px] text-soft tabular-nums hover:text-ink">
          {summary.totals[0]?.text ?? summary.count} {summary.scope}
          <MIcon name="right" className="size-3.5" />
        </Link>
      </div>
      <table className="mt-1.5 w-full border-collapse text-left text-[13px]">
        <thead>
          <tr className="text-[12px] text-faint">
            <th className="border-b border-line py-1.5 pr-3 font-medium first-letter:uppercase">{byDay ? "Day" : collection.rowLabel}</th>
            {columns.map((field) => (
              <th key={field.id} className="border-b border-line py-1.5 pr-3 font-medium first-letter:uppercase">
                {field.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((row) => (
            <tr key={row.id} className={`group ${row.id === rowId ? "text-ink" : "text-soft"}`}>
              <td className="border-b border-line py-2 pr-3 group-last:border-b-0">{rowLabel(row)}</td>
              {columns.map((field) => {
                const value = cell(row.id, field.id);
                return (
                  <td key={field.id} className="border-b border-line py-2 pr-3 whitespace-nowrap tabular-nums group-last:border-b-0">
                    {value ? <span className={row.id === rowId ? "tag font-medium" : ""}>{value.text}</span> : <span className="text-faint">–</span>}
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
