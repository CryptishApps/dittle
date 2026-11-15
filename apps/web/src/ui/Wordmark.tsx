export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-[0.55em] font-medium tracking-[0.08em] text-ink ${className}`}>
      <LogoMark className="size-[1.6em]" />
      DITTLE
    </span>
  );
}

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className={className}>
      <rect width="32" height="32" rx="3" fill="var(--ink)" />
      <path d="M12.4 9.5c-1.7 2.3-2.5 4.6-2.5 6.9M20.4 9.5c-1.7 2.3-2.5 4.6-2.5 6.9" stroke="var(--page)" strokeWidth="2.8" strokeLinecap="square" fill="none" />
      <rect x="9" y="20.5" width="3.4" height="3.4" fill="var(--accent)" />
      <rect x="17" y="20.5" width="3.4" height="3.4" fill="var(--page)" />
    </svg>
  );
}
