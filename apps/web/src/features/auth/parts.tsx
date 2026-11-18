import { MotionConfig } from "motion/react";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { PasswordCheck } from "@/lib/auth";
import { Icon, type IconName } from "@/features/welcome/quiet";
import "@/features/welcome/welcome.css";
import { MIcon } from "@/ui/kit";
import { Wordmark } from "@/ui/Wordmark";
import { Showcase } from "./Showcase";

export type Nav = { href: string; go: () => void };

export function AuthShell({ home, children }: { home: Nav; children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="welcome grid min-h-dvh bg-page text-ink lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)]">
        <div className="relative isolate flex min-h-dvh flex-col px-5 py-5 sm:px-10 sm:py-6">
          <div aria-hidden className="welcome-wash absolute inset-x-0 top-0 -z-10 h-80 [mask-image:linear-gradient(to_bottom,#000,transparent)] lg:hidden" />
          <header>
            <NavLink nav={home} label="Dittle home" className="-m-1 inline-flex p-1">
              <Wordmark className="text-[21px]" />
            </NavLink>
          </header>
          <main className="flex flex-1 flex-col items-center pt-8 pb-2 sm:justify-center sm:py-8">
            {children}
            <TrustLine />
          </main>
        </div>
        <Showcase />
      </div>
    </MotionConfig>
  );
}

const TRUST: { icon: IconName; label: string }[] = [
  { icon: "spark", label: "Free" },
  { icon: "offline", label: "Works offline" },
  { icon: "chip", label: "AI on your device where it can" },
];

function TrustLine() {
  return (
    <ul aria-label="About Dittle" className="mt-8 flex w-full max-w-[380px] flex-wrap justify-center gap-x-4 gap-y-1.5 border-t border-line pt-5 text-[13px] text-soft sm:justify-start">
      {TRUST.map(({ icon, label }) => (
        <li key={label} className="flex items-center gap-1.5">
          <Icon name={icon} className="size-3.5 text-[var(--sky-ink)]" />
          {label}
        </li>
      ))}
    </ul>
  );
}

export const LABEL = "text-[13px] leading-snug font-semibold text-soft";
export const INPUT = "h-12 rounded-xl px-4 text-[15px] focus-visible:border-[var(--brand-blue)] focus-visible:shadow-[0_0_0_4px_var(--sky-strong)] focus-visible:outline-none";
export const BUTTON = "h-12 gap-2 rounded-xl text-[15px]";
export const PRIMARY = `${BUTTON} welcome-cta bg-[var(--brand-blue)] text-white hover:bg-[#1a52d6] hover:opacity-100 [--spin-mark:var(--brand-blue)]`;

type PasswordInputProps = { id: string; value: string; onChange: (value: string) => void; autoComplete: "current-password" | "new-password" };

export function PasswordInput({ id, value, onChange, autoComplete }: PasswordInputProps) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={shown ? "text" : "password"}
        autoComplete={autoComplete}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${INPUT} pr-16`}
      />
      <button
        type="button"
        onClick={() => setShown((current) => !current)}
        aria-pressed={shown}
        aria-label={shown ? "Hide password" : "Show password"}
        className="absolute inset-y-1.5 right-1.5 rounded-lg px-3 text-[13px] font-medium text-soft hover:bg-chip hover:text-ink"
      >
        {shown ? "Hide" : "Show"}
      </button>
    </div>
  );
}

export function usePasswordCheck(password: string, checkPassword: (password: string) => Promise<PasswordCheck>): PasswordCheck | undefined {
  const [result, setResult] = useState<{ password: string; check: PasswordCheck }>();
  useEffect(() => {
    if (!password) return;
    let live = true;
    const timer = window.setTimeout(() => {
      checkPassword(password)
        .then((check) => live && setResult({ password, check }))
        .catch(() => undefined);
    }, 180);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [password, checkPassword]);
  return password && result?.password === password ? result.check : undefined;
}

export function PasswordRules({ check }: { check?: PasswordCheck }) {
  if (!check) return <FieldDescription className="text-[13px] text-faint">Checked against the password rules as you type.</FieldDescription>;
  return (
    <ul aria-live="polite" className="flex flex-wrap gap-1.5 pt-0.5">
      {check.rules.map((rule) => (
        <li
          key={rule.label}
          className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12.5px] font-medium transition-colors ${rule.met ? "bg-[var(--sky-strong)] text-[var(--sky-ink)]" : "bg-chip text-soft"}`}
        >
          {rule.met && <MIcon name="check" className="size-3" />}
          {rule.label}
        </li>
      ))}
    </ul>
  );
}

export type BusyState = "idle" | "busy" | "done";

export function BusyLabel({ state, text, busyText, doneText }: { state: BusyState; text: string; busyText: string; doneText?: string }) {
  if (state === "idle") return <span>{text}</span>;
  if (state === "done") return <span>{doneText ?? busyText}</span>;
  return (
    <span className="t-shimmer-text" data-text={busyText}>
      {busyText}
    </span>
  );
}

export function NavLink({ nav, label, className, children }: { nav: Nav; label?: string; className?: string; children: ReactNode }) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    nav.go();
  };
  return (
    <a href={nav.href} onClick={onClick} aria-label={label} className={className}>
      {children}
    </a>
  );
}

export function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path
        fill="currentColor"
        d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.66 4.1-5.35 4.1-3.22 0-5.85-2.67-5.85-5.96S8.78 6.26 12 6.26c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.68 3.72 14.55 2.8 12 2.8 6.92 2.8 2.8 6.92 2.8 12s4.12 9.2 9.2 9.2c5.31 0 8.83-3.73 8.83-8.99 0-.6-.07-1.06-.15-1.51z"
      />
    </svg>
  );
}
