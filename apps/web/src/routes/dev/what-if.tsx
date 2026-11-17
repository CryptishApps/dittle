import { createFileRoute } from "@tanstack/react-router";
import { InferenceMode } from "firebase/ai";
import { useState } from "react";
import { useDeviceModel } from "@/features/ai/device-model";
import { WHAT_IF_CASES, WHAT_IF_OPTIONS, scoreWhatIf, type WhatIfVerdict } from "@/features/spike/what-if-samples";
import { Wordmark } from "@/ui/Wordmark";

export const Route = createFileRoute("/dev/what-if")({
  component: WhatIfTestPage,
});

type Row = { id: string; verdict?: WhatIfVerdict; where?: string; ms?: number; error?: string };

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

const median = (numbers: number[]) => {
  const sorted = [...numbers].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)]! : 0;
};

function WhatIfTestPage() {
  const model = useDeviceModel();
  const [mode, setMode] = useState<InferenceMode>(InferenceMode.ONLY_IN_CLOUD);
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [version, setVersion] = useState("");

  const runAll = async () => {
    setRunning(true);
    setRows([]);
    const { createWhatIf, WHAT_IF_PROMPT_VERSION } = await import("@/features/ai/what-if");
    setVersion(WHAT_IF_PROMPT_VERSION);
    const ask = createWhatIf(mode);
    for (const sample of WHAT_IF_CASES) {
      try {
        const result = await withRetry(() => ask({ question: sample.question, options: WHAT_IF_OPTIONS }));
        setRows((done) => [...done, { id: sample.id, verdict: scoreWhatIf(sample, result.answer), where: result.where, ms: result.ms }]);
      } catch (error) {
        setRows((done) => [...done, { id: sample.id, error: error instanceof Error ? error.message : String(error) }]);
      }
    }
    setRunning(false);
  };

  const right = rows.filter((row) => row.verdict?.ok).length;
  const refusals = WHAT_IF_CASES.filter((sample) => !sample.expect);
  const refusedRight = rows.filter((row) => row.verdict?.ok && refusals.some((sample) => sample.id === row.id)).length;
  const timings = rows.flatMap((row) => (row.ms === undefined ? [] : [row.ms]));
  const report = {
    prompt: version,
    mode,
    availability: model.status,
    right: `${right}/${rows.length}`,
    changes: `${right - refusedRight}/${rows.length - rows.filter((row) => refusals.some((sample) => sample.id === row.id)).length}`,
    refusals: `${refusedRight}/${rows.filter((row) => refusals.some((sample) => sample.id === row.id)).length}`,
    medianMs: median(timings),
    where: [...new Set(rows.map((row) => row.where).filter(Boolean))],
    cases: rows,
  };

  return (
    <div className="min-h-dvh bg-page text-[13px]">
      <header className="flex flex-wrap items-center gap-4 border-b border-line px-6 py-3">
        <Wordmark className="text-[14px]" />
        <span className="text-[11px] tracking-[0.06em] text-faint uppercase">What-if test {version && `· prompt ${version}`}</span>
        <span className="text-[11px] tracking-[0.06em] text-soft uppercase">Gemini Nano: {model.status}</span>
        <select value={mode} onChange={(event) => setMode(event.target.value as InferenceMode)} className="ml-auto border border-line-strong bg-card px-2 py-1">
          <option value={InferenceMode.ONLY_IN_CLOUD}>Cloud only</option>
          <option value={InferenceMode.ONLY_ON_DEVICE}>Device only</option>
          <option value={InferenceMode.PREFER_ON_DEVICE}>Prefer device</option>
        </select>
        <button type="button" disabled={running} onClick={() => void runAll()} className="bg-ink px-3 py-1.5 text-[11px] tracking-[0.06em] text-page uppercase disabled:opacity-60">
          {running ? `Running ${rows.length}/${WHAT_IF_CASES.length}` : `Run all ${WHAT_IF_CASES.length}`}
        </button>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">
        <h2 className="text-[11px] tracking-[0.06em] text-faint uppercase">
          {right}/{rows.length} right · changes {report.changes} · refusals {report.refusals} · median {(report.medianMs / 1000).toFixed(1)} s
        </h2>
        <ul className="mt-3 space-y-1 text-[12px]">
          {rows.map((row) => (
            <li key={row.id} className={row.verdict?.ok ? "text-soft" : "text-accent-ink"}>
              <span className="text-faint">{row.id}</span> {WHAT_IF_CASES.find((sample) => sample.id === row.id)?.question} · wanted {row.verdict?.want}, got {row.error ?? row.verdict?.got}
              {row.ms !== undefined && (
                <span className="text-faint">
                  {" "}
                  · {row.where === "on_device" ? "device" : "cloud"} {(row.ms / 1000).toFixed(1)} s
                </span>
              )}
            </li>
          ))}
        </ul>
        <h2 className="mt-8 text-[11px] tracking-[0.06em] text-faint uppercase">Tracked values shown to the model</h2>
        <ol className="mt-3 list-decimal pl-5 text-[12px] text-soft">
          {WHAT_IF_OPTIONS.map((option, index) => (
            <li key={index}>
              {option.text} · {option.name} · about {option.about} · in {option.notes.join(", ")}
            </li>
          ))}
        </ol>
        {!running && rows.length > 0 && (
          <pre id="report" className="mt-8 overflow-x-auto bg-panel p-3 text-[11px]">
            {JSON.stringify(report, null, 2)}
          </pre>
        )}
      </main>
    </div>
  );
}
