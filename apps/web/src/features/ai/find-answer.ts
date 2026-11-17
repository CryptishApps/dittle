import { VALUE_KINDS, type ValueKind } from "./kinds";

export type SpottedValue = { quote: string; kind: ValueKind | "text"; name: string };
export type Filing = { sentence: string; list: string };
export type Found = { values: SpottedValue[]; requests: string[]; filings: Filing[] };

export const MAX_LIST_NAME = 40;

export const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean) : [];

export const records = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null) : [];

export const nameOf = (raw: Record<string, unknown>) => (typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "value");

export function readFound(text: string, paragraph: string): Found {
  const data = JSON.parse(text) as { values?: unknown; requests?: unknown; filings?: unknown };
  const values = records(data.values).flatMap((raw): SpottedValue[] => {
    const quote = typeof raw.quote === "string" ? raw.quote.trim() : "";
    const kind = VALUE_KINDS.find((candidate): candidate is ValueKind => candidate === raw.kind);
    return quote && kind && paragraph.includes(quote) ? [{ quote, kind, name: nameOf(raw) }] : [];
  });
  const filings = records(data.filings).flatMap((raw): Filing[] => {
    const sentence = typeof raw.sentence === "string" ? raw.sentence.trim() : "";
    const list = typeof raw.list === "string" ? raw.list.trim().slice(0, MAX_LIST_NAME).trim() : "";
    return sentence && list && paragraph.includes(sentence) ? [{ sentence, list }] : [];
  });
  const filed = new Set(filings.map((filing) => filing.sentence));
  const requests = strings(data.requests).filter((request) => paragraph.includes(request) && !filed.has(request));
  return { values, requests, filings };
}
