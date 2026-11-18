import type { RowsPer } from "@/features/collections/logic";
import type { TrackedValue } from "./values";

export type EditorServices = {
  noteId?: string;
  noteTitleOf?: (noteId: string | undefined) => string | undefined;
  usage?: (factId: string) => number;
  onChanged?: (factId: string, text: string) => void;
  onNewFact?: (value: TrackedValue) => void;
  placementOf?: (value: TrackedValue) => string | undefined;
  startCollection?: (value: TrackedValue, name: string, per: RowsPer) => void;
  fileValues?: (values: TrackedValue[], list: string, sentence: string) => Promise<boolean>;
  ignoredRequests?: () => string[];
  trackedText?: () => string[];
  ignoreRequest?: (text: string) => void;
  openValue?: (id: string, from: "pointer" | "keyboard") => void;
};
