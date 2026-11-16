import type { DetectedValue, DetectResult } from "@/features/ai/detect";
import type { ExpectedValue, Sample } from "./samples";

export type ValueVerdict = { value: DetectedValue; verdict: "match" | "extra" | "invalid" | "optional"; kindOk?: boolean; linkOk?: boolean };
export type SampleScore = {
  verdicts: ValueVerdict[];
  missed: ExpectedValue[];
  expected: number;
  matched: number;
  valid: number;
  kindOk: number;
  linkChecks: number;
  linkOk: number;
  requestOk: boolean;
};

const normal = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim();
const overlaps = (a: string, b: string) => {
  const [x, y] = [normal(a), normal(b)];
  return x.length > 0 && y.length > 0 && (x.includes(y) || y.includes(x));
};

export function scoreSample(sample: Sample, result: DetectResult): SampleScore {
  const text = normal(sample.text);
  const remaining = [...sample.values];
  const verdicts: ValueVerdict[] = [];
  let kindOk = 0;
  let linkChecks = 0;
  let linkOk = 0;

  for (const value of result.values) {
    if (!text.includes(normal(value.quote))) {
      verdicts.push({ value, verdict: "invalid" });
      continue;
    }
    const index = remaining.findIndex((expected) => overlaps(expected.quote, value.quote));
    if (index === -1) {
      verdicts.push({ value, verdict: "extra" });
      continue;
    }
    const [expected] = remaining.splice(index, 1);
    if (expected!.optional) {
      verdicts.push({ value, verdict: "optional" });
      continue;
    }
    const isKindOk = expected!.kind === value.kind;
    const wantLink = expected!.existing ?? "none";
    const isLinkOk = value.existing === wantLink;
    if (isKindOk) kindOk += 1;
    linkChecks += 1;
    if (isLinkOk) linkOk += 1;
    verdicts.push({ value, verdict: "match", kindOk: isKindOk, linkOk: isLinkOk });
  }

  const required = sample.values.filter((value) => !value.optional);
  const matched = verdicts.filter((item) => item.verdict === "match").length;
  const expectedRequests = sample.requests ?? [];
  const requestOk =
    expectedRequests.length === 0
      ? result.requests.length === 0
      : expectedRequests.every((request) => result.requests.some((found) => overlaps(found, request)));

  return {
    verdicts,
    missed: remaining.filter((value) => !value.optional),
    expected: required.length,
    matched,
    valid: verdicts.filter((item) => item.verdict === "match" || item.verdict === "extra").length,
    kindOk,
    linkChecks,
    linkOk,
    requestOk,
  };
}

export type Summary = {
  runs: number;
  recall: number;
  precision: number;
  kindAccuracy: number;
  linkAccuracy: number;
  requestAccuracy: number;
  invalid: number;
  onDevice: number;
  inCloud: number;
  fallbacks: number;
  errors: number;
  medianMs: { on_device?: number; in_cloud?: number };
};

export function summarise(rows: { result?: DetectResult; score?: SampleScore; error?: string }[]): Summary {
  const done = rows.filter((row) => row.result && row.score);
  const sum = (pick: (score: SampleScore) => number) => done.reduce((total, row) => total + pick(row.score!), 0);
  const ratio = (a: number, b: number) => (b === 0 ? Number.NaN : a / b);
  const median = (where: "on_device" | "in_cloud") => {
    const times = done.filter((row) => row.result!.where === where).map((row) => row.result!.ms).sort((a, b) => a - b);
    return times.length ? times[Math.floor(times.length / 2)] : undefined;
  };
  return {
    runs: done.length,
    recall: ratio(sum((s) => s.matched), sum((s) => s.expected)),
    precision: ratio(sum((s) => s.matched), sum((s) => s.valid)),
    kindAccuracy: ratio(sum((s) => s.kindOk), sum((s) => s.matched)),
    linkAccuracy: ratio(sum((s) => s.linkOk), sum((s) => s.linkChecks)),
    requestAccuracy: ratio(done.filter((row) => row.score!.requestOk).length, done.length),
    invalid: done.reduce((total, row) => total + row.score!.verdicts.filter((v) => v.verdict === "invalid").length, 0),
    onDevice: done.filter((row) => row.result!.where === "on_device").length,
    inCloud: done.filter((row) => row.result!.where === "in_cloud").length,
    fallbacks: done.filter((row) => row.result!.fallbackReason).length,
    errors: rows.filter((row) => row.error).length,
    medianMs: { on_device: median("on_device"), in_cloud: median("in_cloud") },
  };
}
