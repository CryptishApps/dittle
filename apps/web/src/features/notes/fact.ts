import type { Grain, TagKind } from "@/features/ai/value-shapes";
import type { InferenceWhere } from "@/features/ai/hybrid";

export type FactFields = {
  text: string;
  kind?: TagKind;
  name?: string;
  subject?: { label: string; entityId?: string };
  field?: string;
  event?: boolean;
  when?: { on: string; grain: Grain };
  conditions?: string[];
  remarks?: string[];
  origin?: { noteId?: string; sentence: string };
  describedBy?: { where: InferenceWhere; ms: number; v: string };
  history?: { text: string; at: number }[];
  notSame?: string[];
  proposal?: { factId: string } | null;
  amount?: number;
  before?: string;
  after?: string;
  seconds?: number;
  unit?: string;
  formula?: { expr: string; inputs: string[] };
  updatedAt?: number;
};

export type StoredValue = { id: string } & FactFields;

export type CollectionField = { id: string; name: string; kind: TagKind };
export type CollectionKey = { by: "when"; grain: "day" } | { by: "name" };
export type CalculatedColumn = { id: string; name: string; expr: string; inputs: string[] };
export type Glance = "total" | "count" | "average" | "countdown";
export type Collection = { id: string; name: string; rowLabel: string; fields: CollectionField[]; columns?: CalculatedColumn[]; key: CollectionKey; glance?: Glance; createdAt: number };
export type Row = { id: string; collectionId: string; label: string; period?: string; createdAt: number };
