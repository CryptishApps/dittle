export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-[0.3em] font-extrabold tracking-[-0.04em] text-ink ${className}`}>
      <LogoMark className="size-[1.2em]" />
      dittle
    </span>
  );
}

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className={className}>
      <rect width="32" height="32" rx="10" fill="var(--primary)" />
      <path
        d="M12.4 9.5c-1.7 2.3-2.5 4.6-2.5 6.9M20.4 9.5c-1.7 2.3-2.5 4.6-2.5 6.9"
        stroke="var(--primary-ink)"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="11" cy="22" r="2" fill="var(--hl-green)" />
      <circle cx="19" cy="22" r="2" fill="var(--primary-ink)" />
    </svg>
  );
}
