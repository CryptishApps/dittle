import type { TagKind } from "./value-shapes";

export type ColumnDraft = { name: string; kind: TagKind; example?: string };

const MAX_NAME = 32;

export const COLUMNS_INSTRUCTIONS = `Someone just started a table in their notes from a single entry. Each column's working name was taken from that first entry, so it can be too narrow for the rows to come, such as "palace ticket price" in a list of things to do or "riverside run distance" in a log of runs.

Give each column a short, general name that fits every row the table will hold: one to three words, sentence case, no units. Keep a detail only when the column needs it to make sense, such as "Price per head" for caterers. Answer the names in the same order as the columns.

Example
Table: Things to do, one row per named thing
Columns:
c1 palace ticket price (money), e.g. €32
c2 trip date (date), e.g. Sun 13 December
Answer: {"names":["Price","Date"]}

Example
Table: Caterers, one row per named thing
Columns:
c1 price per head (money), e.g. £38
c2 deposit due (date), e.g. 1 March
Answer: {"names":["Price per head","Deposit due"]}`;

export function columnsPrompt(table: string, per: "day" | "name", columns: ColumnDraft[]): string {
  return [
    `Table: ${table}, one row per ${per === "day" ? "day" : "named thing"}`,
    "Columns:",
    ...columns.map((column, index) => `c${index + 1} ${column.name} (${column.kind})${column.example ? `, e.g. ${column.example}` : ""}`),
  ].join("\n");
}

export function readColumnNames(text: string, count: number): string[] | undefined {
  const data = JSON.parse(text) as { names?: unknown };
  if (!Array.isArray(data.names) || data.names.length !== count) return undefined;
  const names = data.names.map((name) => (typeof name === "string" ? name.trim() : ""));
  if (names.some((name) => name.length === 0 || name.length > MAX_NAME)) return undefined;
  if (new Set(names.map((name) => name.toLocaleLowerCase())).size !== names.length) return undefined;
  return names;
}
