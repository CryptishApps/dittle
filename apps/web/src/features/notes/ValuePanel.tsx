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
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, ease }}
      className="tile fixed inset-x-2 top-[72px] bottom-2 z-40 overflow-y-auto px-6 pt-5 pb-8 text-[15px] sm:inset-x-auto sm:top-[88px] sm:right-6 sm:bottom-6 sm:w-[390px] lg:static lg:z-auto lg:my-5 lg:mr-5 lg:max-h-[calc(100%-2.5rem)] lg:w-[380px] lg:shrink-0 lg:self-start"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-label text-faint first-letter:uppercase">{value.kind ?? "Value"}</p>
          <p className="mt-0.5 truncate text-[22px] font-semibold tracking-[-0.02em] first-letter:uppercase">{nameOf(value) ?? "Value"}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 grid size-9 shrink-0 place-items-center rounded-[10px] bg-panel text-soft hover:bg-chip-hover hover:text-ink">
          <MIcon name="close" className="size-4" />
        </button>
      </div>
      <p className="mt-4">
        <span
          className={`keycap inline-block max-w-full px-5 pt-2.5 pb-2 leading-none font-semibold tracking-[-0.04em] break-words tabular-nums ${value.text.length > 9 ? "text-[32px]" : "text-[58px]"}`}
        >
          {value.text}
        </span>
      </p>
      {value.naming ? (
        <p className="mt-3">
          <span className="t-shimmer-text" data-text="Describing">
            Describing
          </span>
        </p>
      ) : (
        context && <p className="mt-3 text-soft">{context}</p>
      )}

      {formula ? (
        <div className="mt-6 rounded-2xl bg-accent-tint px-4 py-3.5">
          <p className="text-label text-accent-ink">Worked out</p>
          <p className="mt-1 font-medium text-ink">= {formula}</p>
          <p className="mt-1 text-[13.5px] text-soft">Change an input and this follows.</p>
        </div>
      ) : (
        !value.proposal && (
          <div className="mt-7">
            <p className="text-label text-faint">Change</p>
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
          <div className="mt-5">
            <StartCollection value={value} onStart={(name, per) => services.startCollection?.(value, name, per)} />
          </div>
        )
      )}

      <p className="mt-7 text-label text-faint">Used in</p>
      <ul className="mt-1">
        {usedIn.map((note) => (
          <li key={note.id} className="flex items-baseline justify-between gap-3 border-b border-line py-2.5">
            {note.id === noteId ? (
              <span className="truncate text-ink">{note.title || "Untitled"}</span>
            ) : (
              <Link to="/notes/$noteId" params={{ noteId: note.id }} className="truncate font-medium text-accent-ink underline-offset-4 hover:underline">
                {note.title || "Untitled"}
              </Link>
            )}
            {note.id === noteId && <span className="shrink-0 text-[13px] text-faint">this note</span>}
          </li>
        ))}
      </ul>

      {value.history?.length ? (
        <>
          <p className="mt-7 text-label text-faint">Before</p>
          <ul className="mt-2 space-y-1 text-soft">
            {[...value.history].reverse().map((entry, index) => (
              <li key={index}>
                <span className="text-faint line-through decoration-accent">{entry.text}</span> <span className="text-faint">· until {WHEN.format(entry.at)}</span>
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
    <div className="mt-7 rounded-2xl bg-panel px-4 pt-3.5 pb-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[17px] font-semibold tracking-[-0.01em]">{collection.name}</span>
        <Link to="/notes/collections/$collectionId" params={{ collectionId }} className="inline-flex items-center gap-1 text-[13px] font-medium text-accent-ink tabular-nums hover:underline">
          {summary.totals[0]?.text ?? summary.count} {summary.scope}
          <MIcon name="right" className="size-3.5" />
        </Link>
      </div>
      <table className="mt-2 w-full border-collapse text-left text-[13px]">
        <thead>
          <tr className="text-[12px] font-semibold text-soft">
            <th className="border-b border-line py-2 pr-3 font-semibold first-letter:uppercase">{byDay ? "Day" : collection.rowLabel}</th>
            {columns.map((field) => (
              <th key={field.id} className="border-b border-line py-2 pr-3 font-semibold first-letter:uppercase">
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
