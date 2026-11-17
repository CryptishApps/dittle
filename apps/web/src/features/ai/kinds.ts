export const VALUE_KINDS = ["money", "count", "number", "date", "duration", "percent", "person", "place"] as const;
export type ValueKind = (typeof VALUE_KINDS)[number];
