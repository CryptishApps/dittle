import type { TagKind } from "./value-shapes";

export const MAX_OPTIONS = 40;
const MAX_QUESTION = 300;

export const OPTION_KEYS = Array.from({ length: MAX_OPTIONS }, (_, index) => `v${index + 1}`);
export const OPERATIONS = ["set", "add", "subtract", "multiply"] as const;
export type Operation = (typeof OPERATIONS)[number];

export type WhatIfOption = { text: string; kind?: TagKind; name?: string; about?: string; notes: string[] };
export type WhatIfAnswer = { option: number; operation: Operation; number: number } | null;

const isOperation = (value: unknown): value is Operation => OPERATIONS.some((operation) => operation === value);

export function readWhatIfAnswer(text: string, shown: WhatIfOption[]): WhatIfAnswer {
  const data = JSON.parse(text) as { value?: unknown; operation?: unknown; number?: unknown };
  const option = typeof data.value === "string" ? OPTION_KEYS.indexOf(data.value) : -1;
  if (option < 0 || option >= Math.min(shown.length, MAX_OPTIONS)) return null;
  if (!isOperation(data.operation) || typeof data.number !== "number" || !Number.isFinite(data.number)) return null;
  return { option, operation: data.operation, number: data.number };
}

const line = (option: WhatIfOption) =>
  [
    option.text,
    option.kind,
    option.name?.replaceAll("_", " "),
    option.about && `about ${option.about}`,
    option.notes.length > 0 && `in ${option.notes.map((title) => `"${title}"`).join(", ")}`,
  ]
    .filter(Boolean)
    .join(" · ");

export function whatIfPrompt(question: string, shown: WhatIfOption[]): string {
  return [
    "Values:",
    ...shown.slice(0, MAX_OPTIONS).map((option, index) => `v${index + 1}: ${line(option)}`),
    `Question: ${question.trim().slice(0, MAX_QUESTION)}`,
  ].join("\n");
}
