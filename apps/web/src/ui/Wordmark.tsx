export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-[0.42em] font-semibold tracking-[-0.025em] text-ink ${className}`}>
      <LogoMark className="size-[1.15em]" />
      Dittle
    </span>
  );
}

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 26 26" className={className}>
      <rect width="17" height="17" rx="5" fill="var(--mark-ink)" />
      <rect x="7.25" y="7.25" width="19.5" height="19.5" rx="6.5" fill="var(--mark-gap, var(--page))" />
      <rect x="9" y="9" width="17" height="17" rx="5" fill="var(--mark-blue)" />
    </svg>
  );
}
