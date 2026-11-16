import { createFileRoute } from "@tanstack/react-router";
import type { InferenceMode } from "firebase/ai";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { DetectResult, Detector } from "@/features/ai/detect";
import { KNOWN, SAMPLES, type Sample } from "@/features/spike/samples";
import { scoreSample, summarise, type SampleScore } from "@/features/spike/score";
import { Wordmark } from "@/ui/Wordmark";

export const Route = createFileRoute("/dev/spike")({
  component: SpikePage,
});

type Row = { status: "idle" | "running" | "done" | "error"; result?: DetectResult; score?: SampleScore; error?: string };
type Availability = "checking" | "no-api" | "unavailable" | "downloadable" | "downloading" | "available";

const MODES: { value: InferenceMode; label: string }[] = [
  { value: "prefer_on_device", label: "Prefer device" },
  { value: "only_on_device", label: "Device only" },
  { value: "only_in_cloud", label: "Cloud only" },
];

const TEXT_EN = [{ type: "text", languages: ["en"] }];

const pause = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

async function withRetry<T>(call: () => Promise<T>): Promise<T> {
  const { isRateLimited } = await import("@/features/ai/hybrid");
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await call();
    } catch (error) {
      if (!isRateLimited(error) || attempt === 5) throw error;
      await pause(6000 * (attempt + 1));
    }
  }
}

type PromptApi = { availability: (options: object) => Promise<string> };

async function readAvailability(): Promise<Availability> {
  const api = (globalThis as { LanguageModel?: PromptApi }).LanguageModel;
  if (!api) return "no-api";
  const state = await api.availability({ expectedInputs: TEXT_EN, expectedOutputs: TEXT_EN });
  return (["unavailable", "downloadable", "downloading", "available"] as const).find((value) => value === state) ?? "unavailable";
}

function SpikePage() {
  const [mode, setMode] = useState<InferenceMode>("prefer_on_device");
  const [availability, setAvailability] = useState<Availability>("checking");
  const [progress, setProgress] = useState<number>();
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [setupError, setSetupError] = useState<string>();
  const [version, setVersion] = useState<string>();
  const stop = useRef(false);
  const detectors = useRef(new Map<InferenceMode, Promise<Detector>>());

  useEffect(() => {
    void readAvailability().then(setAvailability, () => setAvailability("unavailable"));
  }, []);

  const detector = (forMode: InferenceMode) => {
    let pending = detectors.current.get(forMode);
    if (!pending) {
      pending = import("@/features/ai/detect").then(({ createDetector, DETECT_PROMPT_VERSION }) => {
        setVersion(DETECT_PROMPT_VERSION);
        return createDetector(forMode, KNOWN);
      });
      detectors.current.set(forMode, pending);
    }
    return pending;
  };

  const download = async () => {
    setSetupError(undefined);
    setProgress(0);
    try {
      const { model } = await detector("prefer_on_device");
      await model.initializeDeviceModel((value) => setProgress(value));
      setAvailability(await readAvailability());
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : String(error));
    } finally {
      setProgress(undefined);
    }
  };

  const runOne = async (sample: Sample, active: Detector) => {
    setRows((current) => ({ ...current, [sample.id]: { status: "running" } }));
    try {
      const result = await withRetry(() => active.detect(sample.text));
      setRows((current) => ({ ...current, [sample.id]: { status: "done", result, score: scoreSample(sample, result) } }));
    } catch (error) {
      setRows((current) => ({ ...current, [sample.id]: { status: "error", error: error instanceof Error ? error.message : String(error) } }));
    }
  };

  const run = async (samples: Sample[]) => {
    setSetupError(undefined);
    setRunning(true);
    stop.current = false;
    try {
      const active = await detector(mode);
      for (const sample of samples) {
        if (stop.current) break;
        await runOne(sample, active);
      }
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : String(error));
    } finally {
      setRunning(false);
    }
  };

  const ordered = SAMPLES.map((sample) => rows[sample.id] ?? { status: "idle" as const });
  const summary = summarise(ordered);

  const copy = async () => {
    const report = {
      when: new Date().toISOString(),
      prompt: version,
      mode,
      availability,
      userAgent: navigator.userAgent,
      summary,
      samples: SAMPLES.map((sample) => {
        const row = rows[sample.id];
        return {
          id: sample.id,
          where: row?.result?.where,
          ms: row?.result?.ms,
          fallbackReason: row?.result?.fallbackReason,
          error: row?.error,
          values: row?.result?.values,
          requests: row?.result?.requests,
          missed: row?.score?.missed.map((value) => value.quote),
        };
      }),
    };
    await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="min-h-dvh bg-page text-ink">
      <header className="sticky top-0 z-10 border-b border-line bg-page/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4">
          <div className="flex items-center gap-3">
            <Wordmark className="text-[13px]" />
            <span className="text-[11px] tracking-[0.06em] text-faint uppercase">Detect test{version ? ` · prompt ${version}` : ""}</span>
          </div>
          <ModelStatus availability={availability} progress={progress} />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="flex border border-line-strong text-[11px] tracking-[0.05em] uppercase">
              {MODES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  disabled={running}
                  onClick={() => setMode(item.value)}
                  className={`px-3 py-2 ${mode === item.value ? "bg-ink text-page" : "text-soft hover:text-ink"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {availability === "downloadable" && (
              <Action onClick={() => void download()} disabled={progress !== undefined}>
                {progress === undefined ? "Download Gemini Nano" : `Downloading ${Math.round(progress * 100)}%`}
              </Action>
            )}
            {running ? (
              <Action onClick={() => (stop.current = true)}>Stop</Action>
            ) : (
              <Action primary onClick={() => void run(SAMPLES)}>
                Run all {SAMPLES.length}
              </Action>
            )}
            <Action onClick={() => void copy()} disabled={summary.runs === 0}>
              {copied ? "Copied" : "Copy results"}
            </Action>
          </div>
        </div>
        {setupError && <p className="mx-auto max-w-[1200px] px-6 pb-3 text-[12px] text-accent-ink">{setupError}</p>}
      </header>

      <main className="mx-auto max-w-[1200px] px-6 py-8">
        <Summary summary={summary} total={SAMPLES.length} />
        <p className="mt-6 text-[12px] leading-[1.7] text-soft">
          Known variables given to the model:{" "}
          <span className="text-ink">{KNOWN.map((variable) => `${variable.name} = ${variable.value}`).join(", ")}</span>. Grey highlights are values the model found
          in the text. Orange chips are wrong: the wrong kind, the wrong link, or a value that isn't in the paragraph.
        </p>
        <ol className="mt-6 divide-y divide-line border-y border-line">
          {SAMPLES.map((sample) => (
            <SampleRow key={sample.id} sample={sample} row={rows[sample.id] ?? { status: "idle" }} onRun={() => void run([sample])} disabled={running} />
          ))}
        </ol>
      </main>
    </div>
  );
}

function ModelStatus({ availability, progress }: { availability: Availability; progress?: number }) {
  const text: Record<Availability, string> = {
    checking: "Checking Gemini Nano",
    "no-api": "No Prompt API in this browser · cloud only",
    unavailable: "Gemini Nano unavailable on this device",
    downloadable: "Gemini Nano not downloaded yet",
    downloading: "Gemini Nano downloading",
    available: "Gemini Nano ready on this device",
  };
  const ready = availability === "available";
  return (
    <span className="flex items-center gap-2 border border-line-strong bg-card px-2.5 py-1.5 text-[11px] tracking-[0.05em] text-soft uppercase">
      <span className={`size-1.5 ${ready ? "bg-accent" : "bg-faint"}`} />
      {progress !== undefined ? `Downloading Gemini Nano ${Math.round(progress * 100)}%` : text[availability]}
    </span>
  );
}

function Action({ children, onClick, primary = false, disabled = false }: { children: ReactNode; onClick: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-9 px-3.5 text-[11px] tracking-[0.06em] uppercase disabled:opacity-50 ${primary ? "bg-ink text-page" : "border border-line-strong bg-card hover:border-ink"}`}
    >
      {children}
    </button>
  );
}

function Summary({ summary, total }: { summary: ReturnType<typeof summarise>; total: number }) {
  const percent = (value: number) => (Number.isNaN(value) ? "–" : `${Math.round(value * 100)}%`);
  const ms = (value?: number) => (value === undefined ? "–" : `${value} ms`);
  const items: { label: string; value: string; hint: string }[] = [
    { label: "Ran", value: `${summary.runs}/${total}`, hint: summary.errors ? `${summary.errors} errors` : "no errors" },
    { label: "Found", value: percent(summary.recall), hint: "of expected values" },
    { label: "Correct", value: percent(summary.precision), hint: "of values it found" },
    { label: "Kind", value: percent(summary.kindAccuracy), hint: "money, date, count…" },
    { label: "Links", value: percent(summary.linkAccuracy), hint: "to existing variables" },
    { label: "Requests", value: percent(summary.requestAccuracy), hint: "spotted or rightly none" },
    { label: "Made up", value: String(summary.invalid), hint: "quotes not in the text" },
    { label: "Device", value: `${summary.onDevice}`, hint: `median ${ms(summary.medianMs.on_device)}` },
    { label: "Cloud", value: `${summary.inCloud}`, hint: `median ${ms(summary.medianMs.in_cloud)}${summary.fallbacks ? ` · ${summary.fallbacks} fallbacks` : ""}` },
  ];
  return (
    <dl className="grid grid-cols-2 border-t border-l border-line sm:grid-cols-3 lg:grid-cols-9">
      {items.map((item) => (
        <div key={item.label} className="border-r border-b border-line bg-card px-4 py-3">
          <dt className="text-[10.5px] tracking-[0.06em] text-faint uppercase">{item.label}</dt>
          <dd className="mt-1 text-[22px] leading-none font-medium tracking-[-0.03em] tabular-nums">{item.value}</dd>
          <dd className="mt-1.5 text-[10.5px] text-faint">{item.hint}</dd>
        </div>
      ))}
    </dl>
  );
}

function SampleRow({ sample, row, onRun, disabled }: { sample: Sample; row: Row; onRun: () => void; disabled: boolean }) {
  const found = row.score?.verdicts.filter((item) => item.verdict !== "invalid").map((item) => item.value.quote) ?? [];
  return (
    <li className="grid gap-4 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div>
        <p className="flex items-center gap-3 text-[10.5px] tracking-[0.06em] text-faint uppercase">
          <span className="text-accent-ink">{sample.id}</span>
          {sample.topic}
          <button type="button" onClick={onRun} disabled={disabled} className="ml-auto text-soft hover:text-ink disabled:opacity-40">
            Run
          </button>
        </p>
        <p className="mt-2 text-[14px] leading-[1.9]">{highlight(sample.text, found)}</p>
      </div>
      <div className="text-[12px]">
        {row.status === "idle" && <p className="text-faint">Not run</p>}
        {row.status === "running" && (
          <p className="t-shimmer-text text-[11px] tracking-[0.06em] uppercase" data-text="Reading">
            Reading
          </p>
        )}
        {row.status === "error" && <p className="text-accent-ink">{row.error}</p>}
        {row.status === "done" && row.result && row.score && <Outcome result={row.result} score={row.score} sample={sample} />}
      </div>
    </li>
  );
}

function Outcome({ result, score, sample }: { result: DetectResult; score: SampleScore; sample: Sample }) {
  return (
    <div className="space-y-2.5">
      <p className="flex flex-wrap items-center gap-2 text-[10.5px] tracking-[0.06em] uppercase">
        <span className={`px-1.5 py-0.5 ${result.where === "on_device" ? "bg-accent-tint text-accent-ink" : "bg-chip text-soft"}`}>
          {result.where === "on_device" ? "On device" : "Cloud"}
        </span>
        <span className="text-faint tabular-nums">{result.ms} ms</span>
        {result.fallbackReason && <span className="text-accent-ink normal-case">Fell back: {result.fallbackReason}</span>}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {score.verdicts.length === 0 && <span className="text-faint">No values</span>}
        {score.verdicts.map((item, index) => {
          const wrong = item.verdict === "invalid" || item.verdict === "extra" || item.kindOk === false || item.linkOk === false;
          return (
            <span
              key={index}
              className={`px-1.5 py-1 leading-tight ${wrong ? "bg-accent-tint text-accent-ink" : item.verdict === "optional" ? "border border-dashed border-line-strong text-soft" : "bg-chip"}`}
              title={item.verdict}
            >
              <span className={item.verdict === "invalid" ? "line-through" : ""}>{item.value.quote}</span>
              <span className="text-faint"> · {item.value.kind}</span>
              <span className="text-faint"> · {item.value.existing === "none" ? item.value.name : `→ ${item.value.existing}`}</span>
            </span>
          );
        })}
      </div>
      {score.missed.length > 0 && (
        <p className="text-accent-ink">
          Missed: {score.missed.map((value) => `${value.quote} (${value.kind})`).join(", ")}
        </p>
      )}
      {(result.requests.length > 0 || (sample.requests?.length ?? 0) > 0) && (
        <p className={score.requestOk ? "text-soft" : "text-accent-ink"}>
          Request: {result.requests.length ? result.requests.map((request) => `“${request}”`).join(", ") : "none found"}
        </p>
      )}
    </div>
  );
}

function highlight(text: string, quotes: string[]): ReactNode[] {
  const lower = text.toLowerCase();
  const ranges: [number, number][] = [];
  for (const quote of quotes) {
    let from = 0;
    while (true) {
      const start = lower.indexOf(quote.toLowerCase(), from);
      if (start === -1) break;
      const end = start + quote.length;
      if (!ranges.some(([a, b]) => start < b && end > a)) {
        ranges.push([start, end]);
        break;
      }
      from = start + 1;
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const parts: ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(([start, end], index) => {
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(
      <span key={index} className="token" data-found="true">
        {text.slice(start, end)}
      </span>,
    );
    cursor = end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}
