import type { DescribedValue } from "@/features/ai/describe";
import type { ContextCase, ExpectedContext } from "./context-samples";

export type FieldCheck = { field: string; ok: boolean; want: string; got: string };
export type ContextScore = { expected: number; found: number; checks: FieldCheck[] };

const normal = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim();
const overlaps = (a: string, b: string) => {
  const [x, y] = [normal(a), normal(b)];
  return x.length > 0 && y.length > 0 && (x.includes(y) || y.includes(x));
};
const list = (items: string[]) => (items.length ? items.join(", ") : "none");
const showWhen = (when: DescribedValue["when"] | null | undefined) => (when ? `${when.on} (${when.grain})` : "none");

function phrasesOk(want: string[], got: string[]): boolean {
  if (want.length === 0) return got.length === 0;
  return want.every((phrase) => got.some((found) => overlaps(found, phrase)));
}

function checksFor(want: ExpectedContext, got: DescribedValue): FieldCheck[] {
  const checks: FieldCheck[] = [];
  if (want.kind) checks.push({ field: "kind", ok: got.kind === want.kind, want: want.kind, got: got.kind });
  if (want.about) checks.push({ field: "about", ok: overlaps(got.about, want.about), want: want.about, got: got.about || "none" });
  if (want.event !== undefined) checks.push({ field: "event", ok: got.event === want.event, want: String(want.event), got: String(got.event) });
  if (want.when !== undefined) {
    const ok = want.when === null ? !got.when : got.when?.on === want.when.on && got.when.grain === want.when.grain;
    checks.push({ field: "when", ok, want: showWhen(want.when), got: showWhen(got.when) });
  }
  if (want.conditions) checks.push({ field: "conditions", ok: phrasesOk(want.conditions, got.conditions), want: list(want.conditions), got: list(got.conditions) });
  if (want.remarks) checks.push({ field: "remarks", ok: phrasesOk(want.remarks, got.remarks), want: list(want.remarks), got: list(got.remarks) });
  if (want.seconds !== undefined) checks.push({ field: "duration", ok: got.seconds === want.seconds, want: `${want.seconds} s`, got: got.seconds === undefined ? "none" : `${got.seconds} s` });
  return checks;
}

export function scoreContext(sample: ContextCase, values: DescribedValue[]): ContextScore {
  const unused = [...values];
  let found = 0;
  const checks: FieldCheck[] = [];
  for (const want of sample.expect) {
    const byQuote = unused.filter((value) => overlaps(value.quote, want.quote));
    const pick = byQuote.find((value) => want.about && overlaps(value.about, want.about)) ?? byQuote[0];
    if (!pick) {
      checks.push({ field: "found", ok: false, want: want.quote, got: "missing" });
      continue;
    }
    unused.splice(unused.indexOf(pick), 1);
    found += 1;
    checks.push(...checksFor(want, pick));
  }
  return { expected: sample.expect.length, found, checks };
}
