import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, m } from "motion/react";
import { collectionsQuery, notesQuery, rowsQuery, valuesQuery, writes } from "@/features/notes/api";
import { showToast } from "@/features/notes/toast";
import { ease, MIcon } from "@/ui/kit";
import { rowLabel } from "./format";

export function CollectionPage({ uid, collectionId }: { uid: string; collectionId: string }) {
  const navigate = useNavigate();
  const { data: collections } = useSuspenseQuery(collectionsQuery(uid));
  const { data: rows } = useSuspenseQuery(rowsQuery(uid));
  const { data: values } = useSuspenseQuery(valuesQuery(uid));
  const { data: notes } = useSuspenseQuery(notesQuery(uid));
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
  const noteTitle = (noteId: string | undefined) => notes.find((note) => note.id === noteId)?.title || "Untitled";

  const remove = () => {
    writes.deleteCollection(uid, collection.id);
    showToast(`Deleted collection "${collection.name}". The values stay in your notes.`);
    void navigate({ to: "/notes" });
  };

  return (
    <>
      <div className="flex h-12 shrink-0 items-center border-b border-line px-4 text-[11px] tracking-[0.04em] uppercase md:hidden">
        <Link to="/notes" className="inline-flex items-center gap-1.5 text-soft hover:text-ink">
          <MIcon name="left" className="size-3.5" />
          Notes
        </Link>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-[860px] px-6 pt-10 pb-24 sm:px-10">
          <p className="text-[11px] tracking-[0.06em] text-faint uppercase">Collection · one row per {collection.key.by === "when" ? "day" : collection.rowLabel}</p>
          <div className="mt-2 flex items-baseline justify-between gap-4">
            <h1 className="text-[26px] leading-tight font-medium tracking-[-0.03em]">{collection.name}</h1>
            <button type="button" onClick={remove} className="text-[11px] tracking-[0.04em] text-soft uppercase hover:text-accent-ink">
              Delete collection
            </button>
          </div>

          {mine.length === 0 ? (
            <p className="mt-8 text-[13px] text-soft">No rows yet. Write about a new {collection.rowLabel} in any note and it lands here.</p>
          ) : (
            <table className="mt-8 w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-line-strong text-[10.5px] tracking-[0.06em] text-faint uppercase">
                  <th className="py-2 pr-6 font-normal">{collection.key.by === "when" ? "Date" : collection.rowLabel}</th>
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
                      <td className="py-2.5 pr-6 whitespace-nowrap text-soft">{rowLabel(row)}</td>
                      {columns.map((field) => {
                        const value = cell(row.id, field.id);
                        return (
                          <td key={field.id} className="py-2.5 pr-6">
                            {value ? (
                              <Link
                                to="/notes/$noteId"
                                params={{ noteId: value.origin?.noteId ?? "" }}
                                disabled={!value.origin?.noteId}
                                title={`From "${noteTitle(value.origin?.noteId)}"`}
                                className="bg-chip px-1 py-0.5 text-ink hover:bg-chip-hover"
                              >
                                {value.text}
                              </Link>
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
