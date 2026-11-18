import { createFileRoute } from "@tanstack/react-router";
import { InferenceMode } from "firebase/ai";
import { useState } from "react";
import { useDeviceModel } from "@/features/ai/device-model";
import { UPDATE_PROMPT_VERSION } from "@/features/ai/prompt-versions";
import type { UpdateResult } from "@/features/ai/update";
import { UPDATE_CASES, UPDATE_TODAY, UPDATE_TRACKED, type UpdateCase } from "@/features/spike/update-samples";
import { scoreUpdate, type UpdateScore } from "@/features/spike/update-score";
import { Wordmark } from "@/ui/Wordmark";

export const Route = createFileRoute("/dev/update")({
  component: UpdatePage,
});

type Row = { id: string; result?: UpdateResult; score?: UpdateScore; error?: string };

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

function imageOf(message: string): { mimeType: string; data: string } {
  const lines = message.split("\n");
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 80 + lines.length * 44;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#fffdf7";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#1f1f1f";
  context.font = "28px Georgia, serif";
  lines.forEach((line, index) => context.fillText(line, 40, 60 + index * 44));
  const url = canvas.toDataURL("image/png");
  return { mimeType: "image/png", data: url.slice(url.indexOf(",") + 1) };
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

function UpdatePage() {
  const model = useDeviceModel();
  const [mode, setMode] = useState<InferenceMode>(InferenceMode.ONLY_IN_CLOUD);
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);

  const runAll = async () => {
    setRunning(true);
    setRows([]);
    const { createUpdateReader } = await import("@/features/ai/update");
    const reader = createUpdateReader(mode);
    const run = (sample: UpdateCase) =>
      sample.image
        ? reader.readFile({ file: imageOf(sample.message), tracked: UPDATE_TRACKED, today: sample.today ?? UPDATE_TODAY })
        : reader.readText({ message: sample.message, tracked: UPDATE_TRACKED, today: sample.today ?? UPDATE_TODAY });
    for (const sample of UPDATE_CASES) {
      try {
        const result = await withRetry(() => run(sample));
        setRows((current) => [...current, { id: sample.id, result, score: scoreUpdate(sample, result) }]);
      } catch (error) {
        setRows((current) => [...current, { id: sample.id, error: message(error) }]);
      }
    }
    setRunning(false);
  };

  const scored = rows.filter((row) => row.score);
  const expected = scored.reduce((sum, row) => sum + row.score!.expected, 0);
  const found = scored.reduce((sum, row) => sum + row.score!.found, 0);
  const wrong = scored.reduce((sum, row) => sum + row.score!.wrong.length, 0);
  const medianMs = (() => {
    const times = rows.flatMap((row) => (row.result ? [row.result.ms] : [])).sort((a, b) => a - b);
    return times.length ? times[Math.floor(times.length / 2)]! : 0;
  })();
  const report = {
    prompt: UPDATE_PROMPT_VERSION,
    mode,
    availability: model.status,
    cases: `${scored.filter((row) => row.score!.ok).length}/${UPDATE_CASES.length}`,
    changesFound: `${found}/${expected}`,
    wrongChanges: wrong,
    medianMs,
    rows: rows.map((row) => ({
      id: row.id,
      ok: row.score?.ok,
      where: row.result?.where,
      ms: row.result?.ms,
      error: row.error,
      updates: row.result?.updates.map((update) => `u${update.tracked + 1} ${update.text}${update.blocked ? ` blocked ${update.blocked.currency}` : ""}${update.when ? ` ${update.when.on}` : ""}`),
      confirmed: row.result?.confirmed.map((tracked) => `u${tracked + 1}`),
      additions: row.result?.additions.map((addition) => `${addition.text} ${addition.kind}`),
      missed: row.score?.missed,
    })),
  };

  return (
    <div className="min-h-dvh bg-page text-[13px]">
      <header className="flex flex-wrap items-center gap-4 border-b border-line px-6 py-3">
        <Wordmark className="text-[14px]" />
        <span className="text-[11px] tracking-[0.06em] text-faint uppercase">Update test · prompt {UPDATE_PROMPT_VERSION}</span>
        <span className="text-[11px] tracking-[0.06em] text-soft uppercase">Gemini Nano: {model.status}</span>
        <select value={mode} onChange={(event) => setMode(event.target.value as InferenceMode)} className="ml-auto border border-line-strong bg-card px-2 py-1">
          <option value={InferenceMode.ONLY_IN_CLOUD}>Cloud only</option>
          <option value={InferenceMode.ONLY_ON_DEVICE}>Device only (text)</option>
          <option value={InferenceMode.PREFER_IN_CLOUD}>Prefer cloud</option>
        </select>
        <button type="button" disabled={running} onClick={() => void runAll()} className="bg-ink px-3 py-1.5 text-[11px] tracking-[0.06em] text-page uppercase disabled:opacity-60">
          {running ? `Running ${rows.length}/${UPDATE_CASES.length}` : `Run all ${UPDATE_CASES.length}`}
        </button>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <p className="text-[15px]" data-done={!running && rows.length === UPDATE_CASES.length}>
          {report.cases} cases right · {report.changesFound} changes found · {wrong} wrong changes · median {(medianMs / 1000).toFixed(1)} s
        </p>
        <ul className="mt-6 space-y-3">
          {rows.map((row) => {
            const sample = UPDATE_CASES.find((item) => item.id === row.id)!;
            return (
              <li key={row.id} className={`border-b border-line pb-3 ${row.score?.ok ? "" : "text-accent-ink"}`}>
                <p>
                  <span className="text-faint">{row.id}</span> {sample.image ? "(image) " : ""}
                  {sample.message.replaceAll("\n", " / ")}
                </p>
                <p className="mt-1 text-[12px] text-soft">{row.error ?? JSON.stringify(report.rows.find((item) => item.id === row.id))}</p>
              </li>
            );
          })}
        </ul>
        <pre id="report" className="mt-8 overflow-x-auto bg-panel p-4 text-[11px]">
          {JSON.stringify(report, null, 2)}
        </pre>
      </main>
    </div>
  );
}
