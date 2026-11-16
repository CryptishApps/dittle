import { createFileRoute } from "@tanstack/react-router";
import { InferenceMode } from "firebase/ai";
import { useRef, useState } from "react";
import type { DescribedValue, createDescriber } from "@/features/ai/describe";
import type { DetectResult } from "@/features/ai/detect";
import { useDeviceModel } from "@/features/ai/device-model";
import { CONTEXT_CASES, CONTEXT_TODAY } from "@/features/spike/context-samples";
import { scoreContext, type ContextScore } from "@/features/spike/context-score";
import { SAMPLES } from "@/features/spike/samples";
import { scoreSample, summarise, type SampleScore } from "@/features/spike/score";
import { Wordmark } from "@/ui/Wordmark";

export const Route = createFileRoute("/dev/describe")({
  component: DescribePage,
});

type Describer = ReturnType<typeof createDescriber>;
type ValueRow = { id: string; result?: DetectResult; score?: SampleScore; error?: string };
type ContextRow = { id: string; values?: DescribedValue[]; where?: string; ms?: number; findMs?: number; score?: ContextScore; error?: string };

const pause = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

async function withRetry<T>(call: () => Promise<T>): Promise<T> {
  const { isTemporary } = await import("@/features/ai/hybrid");
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await call();
    } catch (error) {
      if (!isTemporary(error) || attempt === 5) throw error;
      await pause(6000 * (attempt + 1));
    }
  }
}

const percent = (value: number) => (Number.isNaN(value) ? "–" : `${Math.round(value * 100)}%`);
const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

function DescribePage() {
  const model = useDeviceModel();
  const [mode, setMode] = useState<InferenceMode>(InferenceMode.PREFER_ON_DEVICE);
  const [valueRows, setValueRows] = useState<ValueRow[]>([]);
  const [contextRows, setContextRows] = useState<ContextRow[]>([]);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const describers = useRef(new Map<InferenceMode, Promise<Describer>>());

  const describer = (forMode: InferenceMode) => {
    let pending = describers.current.get(forMode);
    if (!pending) {
      pending = import("@/features/ai/describe").then(({ createDescriber }) => createDescriber(forMode));
      describers.current.set(forMode, pending);
    }
    return pending;
  };

  const runAll = async () => {
    setRunning(true);
    setValueRows([]);
    setContextRows([]);
    const active = await describer(mode);
    for (const sample of CONTEXT_CASES) {
      try {
        const input = { paragraph: sample.text, noteTitle: sample.note, today: CONTEXT_TODAY };
        const found = await withRetry(() => active.find(input));
        const result = found.values.length ? await withRetry(() => active.describe({ ...input, quotes: found.values.map((value) => value.quote) })) : { values: [], where: found.where, ms: 0 };
        setContextRows((rows) => [...rows, { id: sample.id, values: result.values, where: result.where, ms: result.ms, findMs: found.ms, score: scoreContext(sample, result.values) }]);
      } catch (error) {
        setContextRows((rows) => [...rows, { id: sample.id, error: message(error) }]);
      }
    }
    for (const sample of SAMPLES) {
      try {
        const result = await withRetry(() => active.find({ paragraph: sample.text, noteTitle: sample.topic }));
        const asDetect: DetectResult = { ...result, values: result.values.map((value) => ({ quote: value.quote, kind: value.kind === "text" ? "number" : value.kind, name: value.name, existing: "none" })) };
        setValueRows((rows) => [...rows, { id: sample.id, result: asDetect, score: scoreSample({ ...sample, values: sample.values.map(({ existing: _, ...rest }) => rest) }, asDetect) }]);
      } catch (error) {
        setValueRows((rows) => [...rows, { id: sample.id, error: message(error) }]);
      }
    }
    setRunning(false);
  };

  const values = summarise(valueRows);
  const checks = contextRows.flatMap((row) => row.score?.checks ?? []);
  const fields = ["found", "kind", "about", "event", "when", "conditions", "remarks"].map((field) => {
    const scored = checks.filter((check) => check.field === field);
    const expectedFound = field === "found" ? contextRows.reduce((sum, row) => sum + (row.score?.expected ?? 0), 0) : 0;
    const okCount = field === "found" ? contextRows.reduce((sum, row) => sum + (row.score?.found ?? 0), 0) : scored.filter((check) => check.ok).length;
    const total = field === "found" ? expectedFound : scored.length;
    return { field, ok: okCount, total };
  });

  const report = () =>
    JSON.stringify(
      {
        when: new Date().toISOString(),
        prompt: "v6.1",
        mode,
        availability: model.status,
        userAgent: navigator.userAgent,
        values,
        context: Object.fromEntries(fields.map(({ field, ok, total }) => [field, `${ok}/${total}`])),
        contextCases: contextRows.map((row) => ({ id: row.id, where: row.where, findMs: row.findMs, describeMs: row.ms, error: row.error, wrong: row.score?.checks.filter((check) => !check.ok) })),
        valueSamples: valueRows.map((row) => ({ id: row.id, where: row.result?.where, ms: row.result?.ms, fallback: row.result?.fallbackReason, error: row.error, requests: row.result?.requests, requestOk: row.score?.requestOk, missed: row.score?.missed.map((value) => value.quote), extra: row.score?.verdicts.filter((verdict) => verdict.verdict !== "match" && verdict.verdict !== "optional").map((verdict) => verdict.value.quote) })),
      },
      null,
      2,
    );

  const copy = async () => {
    await navigator.clipboard.writeText(report());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-dvh bg-page text-[13px]">
      <header className="flex flex-wrap items-center gap-4 border-b border-line px-6 py-3">
        <Wordmark className="text-[14px]" />
        <span className="text-[11px] tracking-[0.06em] text-faint uppercase">Describe test · prompt v6.1</span>
        <span className="text-[11px] tracking-[0.06em] text-soft uppercase">Gemini Nano: {model.status}</span>
        <select value={mode} onChange={(event) => setMode(event.target.value as InferenceMode)} className="ml-auto border border-line-strong bg-card px-2 py-1">
          <option value={InferenceMode.PREFER_ON_DEVICE}>Prefer device</option>
          <option value={InferenceMode.ONLY_ON_DEVICE}>Device only</option>
          <option value={InferenceMode.ONLY_IN_CLOUD}>Cloud only</option>
        </select>
        <button type="button" disabled={running} onClick={() => void runAll()} className="bg-ink px-3 py-1.5 text-[11px] tracking-[0.06em] text-page uppercase disabled:opacity-60">
          {running ? `Running ${contextRows.length + valueRows.length}/${CONTEXT_CASES.length + SAMPLES.length}` : `Run all ${CONTEXT_CASES.length + SAMPLES.length}`}
        </button>
        <button type="button" onClick={() => void copy()} className="border border-line-strong px-3 py-1.5 text-[11px] tracking-[0.06em] uppercase">
          {copied ? "Copied" : "Copy results"}
        </button>
      </header>

      <main className="mx-auto grid max-w-6xl gap-10 px-6 py-8 lg:grid-cols-2">
        <section>
          <h2 className="text-[11px] tracking-[0.06em] text-faint uppercase">Context ({CONTEXT_CASES.length} cases)</h2>
          <dl className="mt-3 grid grid-cols-4 gap-2">
            {fields.map(({ field, ok, total }) => (
              <div key={field} className="bg-panel px-3 py-2">
                <dt className="text-[10.5px] tracking-[0.06em] text-faint uppercase">{field}</dt>
                <dd className="text-[15px] tabular-nums">{total ? `${ok}/${total}` : "–"}</dd>
              </div>
            ))}
          </dl>
          <ul className="mt-5 space-y-3">
            {contextRows.map((row) => {
              const sample = CONTEXT_CASES.find((item) => item.id === row.id)!;
              return (
                <li key={row.id} className="border-b border-line pb-3">
                  <p>
                    <span className="text-faint">{row.id}</span> {sample.text}
                  </p>
                  {row.error && <p className="text-accent-ink">{row.error}</p>}
                  {row.values?.map((value, index) => (
                    <p key={index} className="mt-1 text-[12px] text-soft">
                      {value.quote} · {value.kind} · about {value.about || "?"} · {value.event ? "event" : "state"} · {value.when ? `${value.when.on} (${value.when.grain})` : "no date"}
                      {value.conditions.length > 0 && ` · if ${value.conditions.join(", ")}`}
                      {value.remarks.length > 0 && ` · ${value.remarks.join(", ")}`}
                    </p>
                  ))}
                  {row.score?.checks
                    .filter((check) => !check.ok)
                    .map((check, index) => (
                      <p key={index} className="text-[12px] text-accent-ink">
                        {check.field}: wanted {check.want}, got {check.got}
                      </p>
                    ))}
                  {row.where && (
                    <p className="text-[11px] text-faint">
                      {row.where === "on_device" ? "On device" : "Cloud"} · find {((row.findMs ?? 0) / 1000).toFixed(1)} s · describe {((row.ms ?? 0) / 1000).toFixed(1)} s
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <h2 className="text-[11px] tracking-[0.06em] text-faint uppercase">Values ({SAMPLES.length} notes from the first test)</h2>
          <dl className="mt-3 grid grid-cols-4 gap-2">
            {[
              ["Found", percent(values.recall)],
              ["Correct", percent(values.precision)],
              ["Kind", percent(values.kindAccuracy)],
              ["Requests", percent(values.requestAccuracy)],
            ].map(([label, value]) => (
              <div key={label} className="bg-panel px-3 py-2">
                <dt className="text-[10.5px] tracking-[0.06em] text-faint uppercase">{label}</dt>
                <dd className="text-[15px] tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-[11px] text-faint">
            Median {values.medianMs.on_device ? `${(values.medianMs.on_device / 1000).toFixed(1)} s on device` : ""}
            {values.medianMs.in_cloud ? ` ${(values.medianMs.in_cloud / 1000).toFixed(1)} s in cloud` : ""}
          </p>
          <ul className="mt-5 space-y-2">
            {valueRows.map((row) => (
              <li key={row.id} className="text-[12px]">
                <span className="text-faint">{row.id}</span> {row.error ?? row.result?.values.map((value) => value.quote).join(" · ")}
                {row.score && row.score.missed.length > 0 && <span className="text-accent-ink"> · missed {row.score.missed.map((value) => value.quote).join(", ")}</span>}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
