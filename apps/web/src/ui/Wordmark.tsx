export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-[0.35em] font-bold tracking-[-0.03em] text-ink ${className}`}>
      <LogoMark className="size-[1.15em]" />
      dittle
    </span>
  );
}

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className={className}>
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <path
        d="M12 9.5c-1.7 2.3-2.5 4.6-2.5 6.9M20 9.5c-1.7 2.3-2.5 4.6-2.5 6.9"
        stroke="var(--accent-ink)"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="10.6" cy="22" r="2" fill="var(--accent-ink)" />
      <circle cx="18.6" cy="22" r="2" fill="var(--accent-ink)" />
    </svg>
  );
}
