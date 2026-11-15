export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline font-note font-semibold tracking-[-0.02em] ${className}`}>
      dittle
      <span aria-hidden className="ml-[0.06em] -translate-y-[0.28em] text-[0.62em] font-normal text-ditto">
        〃
      </span>
    </span>
  );
}
