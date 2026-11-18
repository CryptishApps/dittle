import { SAMPLES, type Sample } from "./sample-clips";

export function Samples({ onSample, className = "" }: { onSample: (sample: Sample) => void; className?: string }) {
  return (
    <p className={`text-[13.5px] text-faint ${className}`}>
      No chat handy? Try{" "}
      {SAMPLES.map((sample, index) => (
        <span key={sample.id}>
          {index > 0 && " · "}
          <button type="button" onClick={() => onSample(sample)} className="text-soft underline decoration-line-strong underline-offset-[3px] transition-colors hover:text-ink">
            {sample.label}
          </button>
        </span>
      ))}
    </p>
  );
}
