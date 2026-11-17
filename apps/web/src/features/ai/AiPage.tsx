import { Link } from "@tanstack/react-router";
import { m } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { Btn, btnClass, ease, MIcon } from "@/ui/kit";
import { SpinCheck } from "@/ui/SpinCheck";
import { Wordmark } from "@/ui/Wordmark";
import { downloadDeviceModel, loadDeviceModel, useDeviceModel, type DeviceModelState } from "./device-model";
import { useAiCalls } from "./usage";

const HEADLINE: Record<DeviceModelState["status"], string> = {
  checking: "Checking this device",
  "no-api": "Not available in this browser",
  unavailable: "This device can't run it",
  downloadable: "Not downloaded yet",
  downloading: "Downloading",
  available: "Ready on this device",
};

const DETAIL: Record<DeviceModelState["status"], string> = {
  checking: "",
  "no-api": "Gemini Nano runs inside Chrome on a computer. In this browser, Dittle uses Gemini in the cloud instead.",
  unavailable: "Chrome says this device doesn't meet the requirements below, or is short of disk space. Dittle uses Gemini in the cloud instead.",
  downloadable: "Chrome can download Gemini Nano to this computer. Until then, Dittle uses Gemini in the cloud.",
  downloading: "Chrome is downloading Gemini Nano. You can keep writing; Dittle uses the cloud until it's ready.",
  available: "Dittle runs its AI on this computer. It's private and works offline.",
};

export function AiPage() {
  const model = useDeviceModel();
  const calls = useAiCalls();
  const percent = Math.round((model.progress ?? 0) * 100);

  useEffect(() => {
    if (model.status === "downloadable") void loadDeviceModel();
  }, [model.status]);

  return (
    <div className="min-h-dvh bg-page">
      <header className="flex h-16 items-center justify-between border-b border-line px-4 sm:px-7">
        <Link to="/notes" aria-label="Dittle home">
          <Wordmark className="text-[21px]" />
        </Link>
        <Link to="/notes" className={btnClass({ variant: "secondary", size: "md" })}>
          <MIcon name="left" className="size-4" />
          Notes
        </Link>
      </header>

      <main className="mx-auto max-w-[700px] px-6 py-12 sm:px-10 sm:py-16">
        <p className="inline-flex h-7 items-center gap-2 rounded-full bg-accent-tint px-3 text-label text-accent-ink">
          <span aria-hidden className="size-1.5 rounded-full bg-accent" />
          On-device AI
        </p>
        <h1 className="mt-4 font-heading text-[44px] leading-[1.02] font-semibold tracking-[-0.045em] sm:text-[56px]">Gemini Nano</h1>

        <m.section
          layout
          transition={{ duration: 0.3, ease }}
          aria-live="polite"
          className={`tile mt-8 px-6 py-5 ${model.status === "downloadable" ? "outline-2 outline-accent" : ""}`}
        >
          <div className="flex items-center gap-3">
            {model.status === "available" && <SpinCheck done className="-m-1 text-accent" />}
            {(model.status === "downloading" || model.status === "checking") && <SpinCheck className="-m-1 text-accent" />}
            <h2 className="font-heading text-[22px] font-semibold tracking-[-0.025em]">
              {HEADLINE[model.status]}
              {model.status === "downloading" && model.progress !== undefined && <span className="ml-2 text-soft tabular-nums">{percent}%</span>}
            </h2>
          </div>
          {DETAIL[model.status] && <p className="mt-2 text-[15px] leading-[1.65] text-soft">{DETAIL[model.status]}</p>}

          {model.status === "downloading" && model.progress !== undefined && (
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-chip" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Download progress">
              <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${percent}%` }} />
            </div>
          )}
          {model.status === "downloadable" && (
            <Btn primary size="md" onClick={() => void downloadDeviceModel()} className="mt-4">
              Download Gemini Nano
            </Btn>
          )}
          {model.error && <p className="mt-3 text-[14px] text-danger">{model.error}</p>}
          {model.status === "available" && <TryIt />}
        </m.section>

        <Section title="What it does in Dittle">
          <li>Names the values you tag with @, such as "guest count" for 80.</li>
          <li>Runs on this computer, so it works offline and what you write isn't sent anywhere for these checks.</li>
          <li>When it isn't available, Dittle asks Gemini in the cloud through Firebase instead. That sends the sentence being checked to Google.</li>
        </Section>

        <Section title="About the download">
          <li>Chrome downloads and manages the model, not Dittle. It's stored with your Chrome profile and shared by every site that uses it.</li>
          <li>It downloads once. After that it runs without a connection.</li>
          <li>
            To see its exact size, open <Copyable text="chrome://on-device-internals" /> in Chrome.
          </li>
          <li>Chrome removes it if your disk drops below 10 GB free, and downloads it again when there's room.</li>
        </Section>

        <Section title="What it needs">
          <li>Chrome on Windows 10 or 11, macOS 13 or later, Linux, or a Chromebook Plus. Not phones or tablets.</li>
          <li>At least 22 GB free on the disk that holds your Chrome profile.</li>
          <li>A graphics card with more than 4 GB of memory, or 16 GB of RAM and 4 CPU cores.</li>
          <li>An unmetered connection for the download.</li>
        </Section>

        <section className="mt-12">
          <h2 className="font-heading text-[20px] font-semibold tracking-[-0.025em]">This session</h2>
          {calls.length === 0 ? (
            <p className="mt-3 text-[15px] text-soft">No AI calls yet. Tag a value with @ in a note and it shows here.</p>
          ) : (
            <table className="mt-3 w-full overflow-hidden rounded-[20px] border-separate border-spacing-0 bg-card text-left text-[14px] shadow-sheet">
              <thead className="bg-side text-label text-soft">
                <tr>
                  <th className="px-5 py-3 font-semibold">Task</th>
                  <th className="px-5 py-3 font-semibold">Ran</th>
                  <th className="px-5 py-3 text-right font-semibold">Time</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((call) => (
                  <tr key={call.at}>
                    <td className="border-t border-line px-5 py-3">{call.task}</td>
                    <td className="border-t border-line px-5 py-3 text-soft">{call.where === "on_device" ? "On this device" : "In the cloud"}</td>
                    <td className="border-t border-line px-5 py-3 text-right text-soft tabular-nums">{(call.ms / 1000).toFixed(1)} s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-heading text-[20px] font-semibold tracking-[-0.025em]">{title}</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-[1.65] text-ink marker:text-accent">{children}</ul>
    </section>
  );
}

function Copyable({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  return (
    <button type="button" onClick={() => void copy()} className="rounded-md bg-chip px-1.5 py-0.5 text-[14px] font-medium hover:bg-chip-hover" title="Copy">
      {copied ? "Copied" : text}
    </button>
  );
}

function TryIt() {
  const [result, setResult] = useState<string>();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      const { describeTag } = await import("./describe");
      const named = await describeTag({ paragraph: "Booked the barn for 14 June.", noteTitle: "Wedding", tagged: "14 June" });
      setResult(`Named "14 June" as ${named.name.replaceAll("_", " ")} (${named.kind}) ${named.where === "on_device" ? "on this device" : "in the cloud"} in ${(named.ms / 1000).toFixed(1)} s.`);
    } catch (error) {
      setResult(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <Btn onClick={() => void run()}>{busy ? "Running" : "Try it"}</Btn>
      {result && <p className="text-[14px] text-soft">{result}</p>}
    </div>
  );
}
