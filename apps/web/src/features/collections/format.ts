import type { Row } from "@/features/notes/fact";

const DAY = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export function dayLabel(period: string | undefined): string {
  if (!period) return "";
  const date = new Date(`${period.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return period;
  const suffix = period.length > 10 ? ` (${period.slice(11)})` : "";
  return `${DAY.format(date)}${suffix}`;
}

export const rowLabel = (row: Pick<Row, "id" | "collectionId" | "label" | "period">) => (row.period ? dayLabel(row.id.slice(row.collectionId.length + 1)) : row.label);
