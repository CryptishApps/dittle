import { InferenceMode } from "firebase/ai";
import { COLUMNS_INSTRUCTIONS, columnsPrompt, readColumnNames, type ColumnDraft } from "./columns-answer";
import { createHybrid } from "./hybrid";

const SCHEMA = {
  type: "object",
  properties: { names: { type: "array", items: { type: "string" } } },
  required: ["names"],
};

const namer = createHybrid("Name columns", InferenceMode.PREFER_ON_DEVICE, COLUMNS_INSTRUCTIONS, SCHEMA);

export async function nameColumns(table: string, per: "day" | "name", columns: ColumnDraft[]): Promise<string[] | undefined> {
  const { text } = await namer.ask(columnsPrompt(table, per, columns));
  return readColumnNames(text, columns.length);
}
