export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-[0.36em] font-semibold tracking-[-0.025em] text-ink ${className}`}>
      <LogoMark className="size-[1.15em]" />
      Dittle
    </span>
  );
}

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="4 4 24 24" className={className}>
      <path d="M10.5 9.5 8 21.5" stroke="var(--mark-ink)" strokeWidth="4.6" strokeLinecap="round" />
      <path d="M19.5 9.5 17 21.5" stroke="var(--mark-blue)" strokeWidth="4.6" strokeLinecap="round" />
      <circle cx="24.5" cy="21.5" r="2.8" fill="var(--mark-dot)" />
    </svg>
  );
}
