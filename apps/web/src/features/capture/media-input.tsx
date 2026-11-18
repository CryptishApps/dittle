import { useCallback, useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import { MAX_RECORDING_MS, readImage, transcribeAudio } from "@/features/ai/media";
import { formatElapsed, isEditable, isPushToTalk, isTalkKey, meterLevel, releaseStops } from "./media-keys";

type MicPhase = { phase: "idle" } | { phase: "starting" } | { phase: "recording"; startedAt: number } | { phase: "writing" } | { phase: "error"; message: string };

type Session = {
  stream?: MediaStream;
  recorder?: MediaRecorder;
  context?: AudioContext;
  chunks: Blob[];
  cancelled: boolean;
  limit?: number;
  frame?: number;
};

const BARS = 5;
const QUIET_LEVELS = Array.from({ length: BARS }, () => 0);
const RECORDER_TYPES = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"];
const ERROR_MS = 6000;

function micErrorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "Microphone access is blocked. Allow it in your browser's site settings.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No microphone found.";
  if (name === "NotReadableError") return "The microphone is busy in another app.";
  return "Couldn't start the microphone.";
}

function recorderType(): string | undefined {
  return RECORDER_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

function useRecorder(onText: (text: string) => void) {
  const [state, setState] = useState<MicPhase>({ phase: "idle" });
  const [levels, setLevels] = useState<number[]>(QUIET_LEVELS);
  const session = useRef<Session | undefined>(undefined);
  const phase = useRef<MicPhase["phase"]>("idle");
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  const set = useCallback((next: MicPhase) => {
    phase.current = next.phase;
    setState(next);
  }, []);

  const release = useCallback((current: Session) => {
    window.clearTimeout(current.limit);
    if (current.frame !== undefined) cancelAnimationFrame(current.frame);
    current.stream?.getTracks().forEach((track) => track.stop());
    void current.context?.close().catch(() => undefined);
    setLevels(QUIET_LEVELS);
  }, []);

  const finish = useCallback(
    async (current: Session, type: string) => {
      release(current);
      if (session.current === current) session.current = undefined;
      if (current.cancelled) return set({ phase: "idle" });
      set({ phase: "writing" });
      try {
        const text = await transcribeAudio(new Blob(current.chunks, { type }));
        if (!text) return set({ phase: "error", message: "Didn't catch anything. Try again." });
        set({ phase: "idle" });
        onTextRef.current(text);
      } catch {
        set({ phase: "error", message: "Couldn't write that down. Try again." });
      }
    },
    [release, set],
  );

  const start = useCallback(async () => {
    if (phase.current !== "idle" && phase.current !== "error") return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      return set({ phase: "error", message: "This browser can't record audio." });
    }
    const current: Session = { chunks: [], cancelled: false };
    session.current = current;
    set({ phase: "starting" });
    try {
      current.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (error) {
      if (session.current === current) session.current = undefined;
      return current.cancelled ? set({ phase: "idle" }) : set({ phase: "error", message: micErrorMessage(error) });
    }
    if (current.cancelled) {
      release(current);
      return set({ phase: "idle" });
    }

    const mimeType = recorderType();
    const recorder = new MediaRecorder(current.stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 32_000 });
    current.recorder = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) current.chunks.push(event.data);
    };
    recorder.onstop = () => void finish(current, recorder.mimeType || mimeType || "audio/webm");

    const context = new AudioContext();
    current.context = context;
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    context.createMediaStreamSource(current.stream).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    let frame = 0;
    let peak = 0;
    const draw = () => {
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (const sample of samples) sum += sample * sample;
      peak = Math.max(peak, Math.sqrt(sum / samples.length));
      frame += 1;
      if (frame % 5 === 0) {
        const level = meterLevel(peak);
        peak = 0;
        setLevels((previous) => [...previous.slice(1), level]);
      }
      current.frame = requestAnimationFrame(draw);
    };
    current.frame = requestAnimationFrame(draw);

    recorder.start(250);
    current.limit = window.setTimeout(() => recorder.state === "recording" && recorder.stop(), MAX_RECORDING_MS);
    set({ phase: "recording", startedAt: performance.now() });
  }, [finish, release, set]);

  const stop = useCallback(() => {
    const current = session.current;
    if (!current) return;
    if (!current.recorder) {
      current.cancelled = true;
      return;
    }
    if (current.recorder.state === "recording") current.recorder.stop();
  }, []);

  const cancel = useCallback(() => {
    const current = session.current;
    if (!current) return;
    current.cancelled = true;
    if (current.recorder?.state === "recording") current.recorder.stop();
    else if (current.recorder) release(current);
  }, [release]);

  useEffect(
    () => () => {
      const current = session.current;
      if (!current) return;
      current.cancelled = true;
      if (current.recorder?.state === "recording") current.recorder.stop();
      release(current);
    },
    [release],
  );

  useEffect(() => {
    if (state.phase !== "error") return;
    const timer = window.setTimeout(() => set({ phase: "idle" }), ERROR_MS);
    return () => window.clearTimeout(timer);
  }, [state, set]);

  return { state, levels, start, stop, cancel, phase };
}

export function MicButton({ onText }: { onText: (text: string) => void }) {
  const { state, levels, start, stop, cancel, phase } = useRecorder(onText);
  const [now, setNow] = useState(() => performance.now());
  const held = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (state.phase !== "recording") return;
    const timer = window.setInterval(() => setNow(performance.now()), 250);
    return () => window.clearInterval(timer);
  }, [state.phase]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const active = phase.current === "starting" || phase.current === "recording";
      if (event.key === "Escape" && active) {
        event.preventDefault();
        held.current = undefined;
        cancel();
        return;
      }
      if (!isPushToTalk({ key: event.key, code: event.code, repeat: event.repeat, altKey: event.altKey, ctrlKey: event.ctrlKey, metaKey: event.metaKey, shiftKey: event.shiftKey, target: event.target as HTMLElement | null })) return;
      event.preventDefault();
      if (active) {
        held.current = undefined;
        stop();
        return;
      }
      if (phase.current === "writing") return;
      held.current = performance.now();
      void start();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (!isTalkKey({ key: event.key, code: event.code }) || held.current === undefined) return;
      const heldMs = performance.now() - held.current;
      held.current = undefined;
      if (releaseStops(heldMs)) stop();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [start, stop, cancel, phase]);

  const caption =
    state.phase === "recording" || state.phase === "starting" ? (
      <span className="text-faint">
        {state.phase === "starting" ? "Waiting for the microphone…" : "Listening…"} <span className="text-soft">Esc to cancel</span>
      </span>
    ) : state.phase === "error" ? (
      <span role="alert" className="text-danger">
        {state.message}
      </span>
    ) : null;

  return (
    <span data-mic-busy={caption ? "" : undefined} className="relative inline-flex shrink-0">
      {state.phase === "recording" ? (
        <button
          type="button"
          onClick={stop}
          aria-label="Stop recording and write it down"
          className="inline-flex h-10 items-center gap-2.5 rounded-xl bg-ink px-3.5 text-page transition-opacity hover:opacity-90"
        >
          <span aria-hidden className="size-2 rounded-full bg-danger" />
          <span aria-hidden className="flex h-4.5 items-center gap-[3px]">
            {levels.map((level, index) => (
              <span key={index} className="w-[3px] rounded-full bg-page transition-[height] duration-75" style={{ height: `${4 + Math.round(level * 14)}px` }} />
            ))}
          </span>
          <span className="text-[13.5px] font-medium tabular-nums">{formatElapsed(now - state.startedAt)}</span>
          <span aria-hidden className="ml-0.5 size-2.5 rounded-[2px] bg-page" />
        </button>
      ) : state.phase === "writing" ? (
        <span role="status" className="inline-flex h-10 items-center rounded-xl px-3 text-[14px]">
          <span className="t-shimmer-text" data-text="Writing it down…">
            Writing it down…
          </span>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => (state.phase === "starting" ? cancel() : void start())}
          aria-label={state.phase === "starting" ? "Cancel recording" : "Record a voice note"}
          title="Record a voice note, or hold M"
          className={`inline-flex size-10 items-center justify-center rounded-xl transition-colors ${state.phase === "starting" ? "bg-chip text-ink" : "text-faint hover:bg-chip hover:text-ink"}`}
        >
          <MicIcon />
        </button>
      )}
      {caption && <span className="pointer-events-none absolute top-full right-0 mt-[14px] text-[13px] whitespace-nowrap">{caption}</span>}
    </span>
  );
}

function MicIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7.25" y="2.75" width="5.5" height="9.5" rx="2.75" />
      <path d="M4.5 9.5a5.5 5.5 0 0 0 11 0M10 15v2.5" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="14" height="12" rx="2" />
      <circle cx="7.5" cy="8.5" r="1.25" />
      <path d="m3.5 14.5 4-4 3 3 2-2 4 4" />
    </svg>
  );
}

type ZonePhase = { phase: "idle" } | { phase: "over" } | { phase: "reading" } | { phase: "error"; message: string };

function imageIn(files: FileList | null | undefined): File | undefined {
  return Array.from(files ?? []).find((file) => file.type.startsWith("image/"));
}

function carriesFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer.types).includes("Files");
}

export function ImageDropZone({ onText, children }: { onText: (text: string) => void; children: ReactNode }) {
  const [state, setState] = useState<ZonePhase>({ phase: "idle" });
  const zone = useRef<HTMLDivElement>(null);
  const depth = useRef(0);
  const busy = useRef(false);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  const read = useCallback(async (image: Blob) => {
    if (busy.current) return;
    busy.current = true;
    setState({ phase: "reading" });
    try {
      const text = await readImage(image);
      if (text) {
        setState({ phase: "idle" });
        onTextRef.current(text);
      } else {
        setState({ phase: "error", message: "Nothing to note in that image." });
      }
    } catch {
      setState({ phase: "error", message: "Couldn't read that image. Try again." });
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target instanceof Node ? event.target : null;
      const inside = target !== null && zone.current?.contains(target) === true;
      if (!inside && isEditable(document.activeElement as HTMLElement | null)) return;
      const image = imageIn(event.clipboardData?.files);
      if (!image) return;
      event.preventDefault();
      void read(image);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [read]);

  useEffect(() => {
    if (state.phase !== "error") return;
    const timer = window.setTimeout(() => setState({ phase: "idle" }), ERROR_MS);
    return () => window.clearTimeout(timer);
  }, [state]);

  const leave = () => {
    depth.current = 0;
    setState((current) => (current.phase === "over" ? { phase: "idle" } : current));
  };

  return (
    <div
      ref={zone}
      className="relative"
      onDragEnter={(event) => {
        if (!carriesFiles(event) || busy.current) return;
        event.preventDefault();
        depth.current += 1;
        setState({ phase: "over" });
      }}
      onDragOver={(event) => {
        if (!carriesFiles(event) || busy.current) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={() => {
        depth.current -= 1;
        if (depth.current <= 0) leave();
      }}
      onDrop={(event) => {
        if (!carriesFiles(event)) return;
        event.preventDefault();
        leave();
        const image = imageIn(event.dataTransfer.files);
        if (image) void read(image);
        else setState({ phase: "error", message: "Drop an image, such as a screenshot or a photo of a receipt." });
      }}
    >
      {children}
      {(state.phase === "over" || state.phase === "reading") && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-2.5 rounded-[20px] bg-card text-[15px] text-ink shadow-[0_0_0_1.5px_var(--ink)]">
          <ImageIcon />
          {state.phase === "over" ? (
            <span>Drop to read the screenshot</span>
          ) : (
            <span role="status" className="t-shimmer-text" data-text="Reading the screenshot…">
              Reading the screenshot…
            </span>
          )}
        </div>
      )}
      {state.phase === "error" && (
        <p role="alert" className="pointer-events-none absolute top-full left-6 mt-2 text-[13px] text-danger">
          {state.message}
        </p>
      )}
    </div>
  );
}
