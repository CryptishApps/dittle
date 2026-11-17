import type { TrackedValue } from "./values";

export type EditorServices = {
  noteId?: string;
  noteTitleOf?: (noteId: string | undefined) => string | undefined;
  usage?: (factId: string) => number;
  onChanged?: (factId: string, text: string) => void;
  onNewFact?: (value: TrackedValue) => void;
  placementOf?: (value: TrackedValue) => string | undefined;
  startCollection?: (value: TrackedValue, name: string) => void;
  ignoredRequests?: () => string[];
  ignoreRequest?: (text: string) => void;
  openValue?: (id: string, from: "pointer" | "keyboard") => void;
};
