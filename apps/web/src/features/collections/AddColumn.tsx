import { useState, type FormEvent } from "react";
import type { CalculatedColumn, Collection } from "@/features/notes/fact";
import { acceptColumn, describeColumn, numericFields, type RowCells } from "./columns";
import type { Scales } from "./scale";

const OPERATORS = [
  { op: "/", label: "÷" },
  { op: "*", label: "×" },
  { op: "+", label: "+" },
  { op: "-", label: "−" },
] as const;

type Operator = (typeof OPERATORS)[number]["op"];
type AddColumnProps = { collection: Collection; rows: RowCells[]; scales: Scales; onAdd: (column: CalculatedColumn) => void };

const CONTROL = "h-8 border border-line-strong bg-transparent px-2 text-[12.5px] text-ink outline-none focus:border-accent";

export function AddColumn({ collection, rows, scales, onAdd }: AddColumnProps) {
  const fields = numericFields(collection.fields);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [left, setLeft] = useState(fields[1]?.id ?? "");
  const [op, setOp] = useState<Operator>("/");
  const [right, setRight] = useState(fields[0]?.id ?? "");
  const [problem, setProblem] = useState<string>();
  const [suggested, setSuggested] = useState<CalculatedColumn[] | "asking">([]);

  if (fields.length < 2 || rows.length === 0) return null;

  const position = (fieldId: string) => fields.findIndex((field) => field.id === fieldId) + 1;
  const taken = (column: CalculatedColumn) =>
    (collection.columns ?? []).some((other) => other.expr === column.expr && other.inputs.join() === column.inputs.join());

  const start = () => {
    setOpen(true);
    setSuggested("asking");
    const example = (fieldId: string) => rows.map((cellOf) => cellOf(fieldId)?.text).find(Boolean);
    void import("@/features/ai/formula")
      .then(({ suggestColumns }) =>
        suggestColumns({
          table: collection.name,
          per: collection.key.by === "when" ? "day" : "name",
          fields: fields.map((field) => ({ name: field.name, kind: field.kind, example: example(field.id) })),
        }),
      )
      .then((found) => setSuggested(found.flatMap((item) => acceptColumn(item.name, item.formula, fields, rows, scales) ?? []).filter((column) => !taken(column))))
      .catch((error: unknown) => {
        console.warn("Dittle could not suggest columns", error);
        setSuggested([]);
      });
  };

  const close = () => {
    setOpen(false);
    setName("");
    setProblem(undefined);
  };

  const add = (column: CalculatedColumn) => {
    onAdd(column);
    close();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return setProblem("Give the column a name.");
    if (left === right) return setProblem("Pick two different fields.");
    const column = acceptColumn(name, `f${position(left)} ${op} f${position(right)}`, fields, rows, scales);
    if (!column) return setProblem("That doesn't work out on any row yet.");
    add(column);
  };

  if (!open) {
    return (
      <button type="button" onClick={start} className="mt-4 text-[11px] tracking-[0.04em] text-soft uppercase hover:text-ink">
        + Calculated column
      </button>
    );
  }

  return (
    <div className="mt-4 border border-line px-4 py-3.5">
      <p className="text-[10.5px] tracking-[0.06em] text-faint uppercase">Calculated column</p>
      {suggested === "asking" ? (
        <p className="mt-2 text-[12px]">
          <span className="t-shimmer-text" data-text="Looking for useful columns">
            Looking for useful columns
          </span>
        </p>
      ) : (
        suggested.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {suggested.map((column) => (
              <li key={column.id}>
                <button type="button" onClick={() => add(column)} className="border border-dashed border-line-strong px-2.5 py-1.5 text-[12px] text-soft hover:border-ink hover:text-ink">
                  {column.name} = {describeColumn(column, fields)}
                </button>
              </li>
            ))}
          </ul>
        )
      )}
      <form onSubmit={submit} className="mt-3 flex flex-wrap items-center gap-2">
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name, like Pace" aria-label="Column name" className={`${CONTROL} w-36`} />
        <span className="text-soft">=</span>
        <select value={left} onChange={(event) => setLeft(event.target.value)} aria-label="First field" className={CONTROL}>
          {fields.map((field) => (
            <option key={field.id} value={field.id}>
              {field.name}
            </option>
          ))}
        </select>
        <select value={op} onChange={(event) => setOp(event.target.value as Operator)} aria-label="Operation" className={CONTROL}>
          {OPERATORS.map((item) => (
            <option key={item.op} value={item.op}>
              {item.label}
            </option>
          ))}
        </select>
        <select value={right} onChange={(event) => setRight(event.target.value)} aria-label="Second field" className={CONTROL}>
          {fields.map((field) => (
            <option key={field.id} value={field.id}>
              {field.name}
            </option>
          ))}
        </select>
        <button type="submit" className="h-8 bg-ink px-3 text-[10.5px] tracking-[0.06em] text-page uppercase hover:opacity-90">
          Add
        </button>
        <button type="button" onClick={close} className="h-8 px-2 text-[10.5px] tracking-[0.06em] text-soft uppercase hover:text-ink">
          Cancel
        </button>
      </form>
      {problem && <p className="mt-2 text-[11.5px] text-accent-ink">{problem}</p>}
    </div>
  );
}
