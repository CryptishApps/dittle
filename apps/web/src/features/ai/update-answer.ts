import { formatAmount } from "@/features/formulas/apply";
import { formatDuration, parseIsoDuration } from "@/features/formulas/duration";
import { isCurrency, isMeasure } from "@/features/formulas/units";
import { GRAINS, validWhen, VALUE_KINDS, type TagKind, type ValueKind, type When } from "./value-shapes";

export const MAX_TRACKED = 40;
export const MAX_UPDATES = 10;
export const MAX_ADDITIONS = 8;
const MAX_TITLE = 80;

export const TRACKED_KEYS = Array.from({ length: MAX_TRACKED }, (_, index) => `u${index + 1}`);

export type UpdateSource = "text" | "file";

export type UpdateTracked = {
  text: string;
  kind?: TagKind;
  name?: string;
  about?: string;
  noteTitle?: string;
  when?: When;
  amount?: number;
  seconds?: number;
  before?: string;
  after?: string;
  unit?: string;
};

export type ProposedQuantity = { amount?: number; seconds?: number };

export type ProposedUpdate = {
  tracked: number;
  text: string;
  quote: string;
  source: UpdateSource;
  quantity: ProposedQuantity;
  when?: When;
  blocked?: { currency: string };
};

export type ProposedAddition = { text: string; kind: ValueKind; name: string; quote: string; source: UpdateSource };

export type UpdateAnswer = { title: string; updates: ProposedUpdate[]; confirmed: number[]; additions: ProposedAddition[]; transcript: string };

const records = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null) : [];

const trimmed = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export function amountIn(tracked: Pick<UpdateTracked, "before" | "after">, text: string): number | undefined {
  const before = tracked.before ?? "";
  const after = tracked.after ?? "";
  if (!text.startsWith(before) || !text.endsWith(after) || text.length < before.length + after.length) return undefined;
  const digits = text.slice(before.length, text.length - after.length).replaceAll(",", "").trim();
  const amount = digits === "" ? Number.NaN : Number(digits);
  return Number.isFinite(amount) ? amount : undefined;
}

type Reading = { text: string; quantity: ProposedQuantity; when?: When; blocked?: { currency: string } } | "same" | undefined;

function readChange(tracked: UpdateTracked, raw: Record<string, unknown>, written: string): Reading {
  if (tracked.amount !== undefined) {
    const unit = trimmed(raw.unit);
    const amount = amountIn(tracked, written);
    const otherCurrency = tracked.kind === "money" && isCurrency(unit) && isCurrency(tracked.unit) && unit !== tracked.unit;
    if (otherCurrency) return { text: written, quantity: {}, blocked: { currency: unit } };
    if (amount === undefined) return undefined;
    if (amount === tracked.amount) return "same";
    return { text: formatAmount(tracked, amount), quantity: { amount } };
  }
  if (tracked.seconds !== undefined) {
    const seconds = parseIsoDuration(trimmed(raw.duration));
    if (seconds === undefined) return undefined;
    if (seconds === tracked.seconds) return "same";
    return { text: isMeasure(tracked.unit) ? written : formatDuration(seconds), quantity: { seconds } };
  }
  if (written === tracked.text) return "same";
  if (tracked.when) {
    const on = trimmed(raw.when);
    const when = GRAINS.map((grain) => validWhen(on, grain)).find(Boolean);
    if (when?.on === tracked.when.on) return "same";
    return when ? { text: written, quantity: {}, when } : undefined;
  }
  return { text: written, quantity: {} };
}

function grounded(source: UpdateSource, sourceText: string, quote: string, text: string): boolean {
  if (!text || !quote.includes(text)) return false;
  return source === "file" || sourceText.includes(quote);
}

export function readUpdateAnswer(answer: string, shown: UpdateTracked[], source: UpdateSource, sourceText = ""): UpdateAnswer {
  const data = JSON.parse(answer) as { title?: unknown; updates?: unknown; additions?: unknown; transcript?: unknown };
  const updates: ProposedUpdate[] = [];
  const confirmed: number[] = [];
  const seen = new Set<number>();

  for (const raw of records(data.updates).slice(0, MAX_UPDATES)) {
    const index = typeof raw.value === "string" ? TRACKED_KEYS.indexOf(raw.value) : -1;
    if (index < 0 || index >= shown.length || seen.has(index)) continue;
    const text = trimmed(raw.text);
    const quote = trimmed(raw.quote);
    if (!grounded(source, sourceText, quote, text)) continue;
    const reading = readChange(shown[index]!, raw, text);
    if (!reading) continue;
    seen.add(index);
    if (reading === "same") confirmed.push(index);
    else updates.push({ tracked: index, quote, source, ...reading });
  }

  const additions = records(data.additions)
    .slice(0, MAX_ADDITIONS)
    .flatMap((raw): ProposedAddition[] => {
      const text = trimmed(raw.text);
      const quote = trimmed(raw.quote);
      const kind = VALUE_KINDS.find((candidate) => candidate === raw.kind);
      if (!kind || !grounded(source, sourceText, quote, text)) return [];
      return [{ text, kind, name: trimmed(raw.name) || "value", quote, source }];
    });

  const title = trimmed(data.title).slice(0, MAX_TITLE);
  return { title, updates, confirmed, additions, transcript: source === "file" ? trimmed(data.transcript) : sourceText };
}

function trackedLine(tracked: UpdateTracked): string {
  return [
    tracked.text,
    tracked.kind,
    tracked.name,
    tracked.about && `about ${tracked.about}`,
    tracked.when && `on ${tracked.when.on}`,
    tracked.noteTitle && `in "${tracked.noteTitle}"`,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function updatePrompt(dates: string, shown: UpdateTracked[], message?: string): string {
  return [
    dates,
    "Tracked values:",
    ...(shown.length ? shown.map((tracked, index) => `u${index + 1}: ${trackedLine(tracked)}`) : ["none"]),
    message === undefined ? "Message: in the attached file." : `Message:\n${message}`,
  ].join("\n");
}
