import { Link } from "@tanstack/react-router";
import { m } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { Btn, ease, MIcon } from "@/ui/kit";
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
      <header className="flex h-14 items-center justify-between border-b border-line px-4 sm:px-6">
        <Link to="/notes" aria-label="Back to notes">
          <Wordmark className="text-[14px]" />
        </Link>
        <Link to="/notes" className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.04em] text-soft uppercase hover:text-ink">
          <MIcon name="left" className="size-3.5" />
          Notes
        </Link>
      </header>

      <main className="mx-auto max-w-[680px] px-6 py-12 sm:px-10">
        <p className="text-[11px] tracking-[0.06em] text-faint uppercase">On-device AI</p>
        <h1 className="mt-2 text-[28px] leading-[1.15] font-medium tracking-[-0.03em]">Gemini Nano</h1>

        <m.section
          layout
          transition={{ duration: 0.3, ease }}
          aria-live="polite"
          className={`mt-8 border-l-2 bg-panel px-5 py-4 ${model.status === "downloadable" ? "border-accent" : "border-ink"}`}
        >
          <div className="flex items-center gap-3">
            {model.status === "available" && <SpinCheck done className="-m-1 text-ink" />}
            {(model.status === "downloading" || model.status === "checking") && <SpinCheck className="-m-1 text-ink" />}
            <h2 className="text-[15px] font-medium">
              {HEADLINE[model.status]}
              {model.status === "downloading" && model.progress !== undefined && <span className="ml-2 text-soft tabular-nums">{percent}%</span>}
            </h2>
          </div>
          {DETAIL[model.status] && <p className="mt-2 text-[13px] leading-[1.7] text-soft">{DETAIL[model.status]}</p>}

          {model.status === "downloading" && model.progress !== undefined && (
            <div className="mt-4 h-1 bg-line" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Download progress">
              <div className="h-full bg-ink transition-[width] duration-300" style={{ width: `${percent}%` }} />
            </div>
          )}
          {model.status === "downloadable" && (
            <Btn primary onClick={() => void downloadDeviceModel()} className="mt-4">
              Download Gemini Nano
            </Btn>
          )}
          {model.error && <p className="mt-3 text-[12.5px] text-accent-ink">{model.error}</p>}
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
          <h2 className="text-[11px] tracking-[0.06em] text-faint uppercase">This session</h2>
          {calls.length === 0 ? (
            <p className="mt-3 text-[13px] text-soft">No AI calls yet. Tag a value with @ in a note and it shows here.</p>
          ) : (
            <table className="mt-3 w-full text-left text-[12.5px]">
              <thead className="text-[10.5px] tracking-[0.06em] text-faint uppercase">
                <tr>
                  <th className="py-2 font-normal">Task</th>
                  <th className="py-2 font-normal">Ran</th>
                  <th className="py-2 text-right font-normal">Time</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((call) => (
                  <tr key={call.at} className="border-t border-line">
                    <td className="py-2">{call.task}</td>
                    <td className="py-2 text-soft">{call.where === "on_device" ? "On this device" : "In the cloud"}</td>
                    <td className="py-2 text-right text-soft tabular-nums">{(call.ms / 1000).toFixed(1)} s</td>
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
      <h2 className="text-[11px] tracking-[0.06em] text-faint uppercase">{title}</h2>
      <ul className="mt-3 list-[square] space-y-2 pl-5 text-[13px] leading-[1.7] text-ink marker:text-faint">{children}</ul>
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
    <button type="button" onClick={() => void copy()} className="bg-chip px-1.5 py-0.5 text-[12px] hover:bg-chip-hover" title="Copy">
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
      {result && <p className="text-[12.5px] text-soft">{result}</p>}
    </div>
  );
}
