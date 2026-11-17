import { useState, type FormEvent } from "react";
import type { CalculatedColumn, Collection } from "@/features/notes/fact";
import { acceptColumn, describeColumn, numericFields, type RowCells } from "./columns";
import { Btn, btnClass } from "@/ui/kit";
import type { Scales } from "./scale";

const OPERATORS = [
  { op: "/", label: "÷" },
  { op: "*", label: "×" },
  { op: "+", label: "+" },
  { op: "-", label: "−" },
] as const;

type Operator = (typeof OPERATORS)[number]["op"];
type AddColumnProps = { collection: Collection; rows: RowCells[]; scales: Scales; onAdd: (column: CalculatedColumn) => void };

const CONTROL = "h-9 rounded-xl border border-line-strong bg-card px-3 text-[14px] text-ink outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-tint";

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
      <button type="button" onClick={start} className={`${btnClass({ variant: "secondary", size: "md" })} mt-5`}>
        + Calculated column
      </button>
    );
  }

  return (
    <div className="mt-5 rounded-2xl border border-line bg-card px-5 py-4 shadow-tile">
      <p className="text-label text-soft">Calculated column</p>
      {suggested === "asking" ? (
        <p className="mt-2 text-[14px]">
          <span className="t-shimmer-text" data-text="Looking for useful columns">
            Looking for useful columns
          </span>
        </p>
      ) : (
        suggested.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {suggested.map((column) => (
              <li key={column.id}>
                <button type="button" onClick={() => add(column)} className="rounded-lg border border-dashed border-accent-line bg-accent-tint px-3.5 py-1.5 text-[13.5px] font-medium text-accent-ink hover:border-accent">
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
        <Btn primary type="submit" size="md">
          Add
        </Btn>
        <Btn variant="quiet" size="md" onClick={close}>
          Cancel
        </Btn>
      </form>
      {problem && <p className="mt-2.5 text-[13.5px] text-danger">{problem}</p>}
    </div>
  );
}
