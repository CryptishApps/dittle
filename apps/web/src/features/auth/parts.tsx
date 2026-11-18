import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { PasswordCheck } from "@/lib/auth";
import { MIcon } from "@/ui/kit";
import { Shot } from "@/ui/Shot";
import { Wordmark } from "@/ui/Wordmark";

export type Nav = { href: string; go: () => void };

export function AuthShell({ home, children }: { home: Nav; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-page text-ink lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
      <div className="flex min-h-dvh flex-col px-6 py-6 sm:px-10">
        <header>
          <NavLink nav={home} label="Dittle home" className="-m-1 inline-flex p-1">
            <Wordmark className="text-[21px]" />
          </NavLink>
        </header>
        <main className="flex flex-1 items-center justify-center py-14">{children}</main>
        <div aria-hidden className="h-8" />
      </div>
      <AppPeek />
    </div>
  );
}

export const LABEL = "text-[13px] leading-snug font-semibold text-soft";
export const INPUT = "h-12 px-4 text-[15px] focus-visible:outline-none";
export const BUTTON = "h-12 gap-2 text-[15px]";

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
  if (!check) return <FieldDescription className="text-[13px] text-faint">Checked against your project's password rules as you type.</FieldDescription>;
  return (
    <ul aria-live="polite" className="flex flex-wrap gap-1.5 pt-0.5">
      {check.rules.map((rule) => (
        <li
          key={rule.label}
          className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12.5px] font-medium transition-colors ${rule.met ? "bg-ink text-page" : "bg-chip text-soft"}`}
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

const PEEK_SHOWN = "(min-width: 1024px)";

function AppPeek() {
  const [shown] = useState(() => window.matchMedia(PEEK_SHOWN).matches);
  return (
    <aside aria-hidden className="relative m-3 hidden overflow-hidden rounded-2xl border border-line bg-panel lg:block">
      <div className="absolute top-[14%] left-[12%] w-[150%] overflow-hidden rounded-xl border border-line bg-card p-1">
        <div className="overflow-hidden rounded-xl">
          <Shot name="hero" alt="" priority={shown} sizes={`${PEEK_SHOWN} 80vw, 1px`} />
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-b from-transparent to-panel" />
    </aside>
  );
}
