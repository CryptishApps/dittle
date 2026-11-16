import type { Grain, TagKind } from "@/features/ai/describe";
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
  updatedAt?: number;
};

export type StoredValue = { id: string } & FactFields;

export type CollectionField = { id: string; name: string; kind: TagKind };
export type CollectionKey = { by: "when"; grain: "day" } | { by: "name" };
export type Collection = { id: string; name: string; rowLabel: string; fields: CollectionField[]; key: CollectionKey; createdAt: number };
export type Row = { id: string; collectionId: string; label: string; period?: string; createdAt: number };
