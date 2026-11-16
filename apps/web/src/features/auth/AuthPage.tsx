import { m, useReducedMotion } from "motion/react";
import { useEffect, useState, type FormEvent, type MouseEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { PasswordCheck } from "@/lib/auth";
import { authMessage, isCancelled } from "@/lib/auth-errors";
import { Reprint } from "@/ui/Reprint";
import { ease, MIcon, Scramble } from "@/ui/kit";
import { Wordmark } from "@/ui/Wordmark";

export type AuthMode = "signin" | "signup";

export type AuthActions = {
  google: () => Promise<void>;
  email: (input: { name: string; email: string; password: string }) => Promise<void>;
  guest: () => Promise<void>;
  reset: (email: string) => Promise<void>;
  checkPassword: (password: string) => Promise<PasswordCheck>;
};

type Pending = "google" | "email" | "guest" | "reset";

type AuthPageProps = {
  mode: AuthMode;
  actions: AuthActions;
  isGuest?: boolean;
  links: { home: Nav; signin: Nav; signup: Nav };
};

type Nav = { href: string; go: () => void };

const COPY = {
  signin: { label: "Sign in", title: "Welcome back.", submit: "Sign in", busy: "Signing in" },
  signup: { label: "Create account", title: "Start writing.", submit: "Create account", busy: "Creating account" },
} as const;

export function AuthPage({ mode, actions, isGuest = false, links }: AuthPageProps) {
  const copy = COPY[mode];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState<Pending>();
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const check = usePasswordCheck(mode === "signup" ? password : "", actions.checkPassword);

  const run = async (kind: Pending, action: () => Promise<void>) => {
    setPending(kind);
    setError(undefined);
    setNotice(undefined);
    try {
      await action();
    } catch (caught) {
      if (!isCancelled(caught)) setError(authMessage(caught));
    } finally {
      setPending(undefined);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode === "signup" && check && !check.valid) {
      setError("That password doesn't meet the rules under the box.");
      return;
    }
    void run("email", () => actions.email({ name: name.trim(), email: email.trim(), password }));
  };

  const forgot = () => {
    if (!email.trim()) {
      setNotice(undefined);
      setError("Enter your email above, then press Forgot again.");
      return;
    }
    void run("reset", async () => {
      await actions.reset(email.trim());
      setNotice(`If ${email.trim()} has an account, a reset link is on its way.`);
    });
  };

  const sub =
    mode === "signin"
      ? "Pick up your notes on any device."
      : isGuest
        ? "The notes you've written so far come with you."
        : "Free, private, and your notes work offline.";

  return (
    <div className="grid min-h-dvh bg-page text-ink lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
      <div className="flex min-h-dvh flex-col px-6 py-6 sm:px-10">
        <header className="flex items-center justify-between">
          <NavLink nav={links.home} className="-m-1 p-1">
            <Wordmark className="text-[14px]" />
          </NavLink>
          <NavLink nav={links.home} className="flex items-center gap-1.5 text-[11px] tracking-[0.06em] text-faint uppercase hover:text-ink">
            <MIcon name="left" className="size-3.5" />
            {isGuest ? "Your notes" : "Home"}
          </NavLink>
        </header>

        <main className="flex flex-1 items-center justify-center py-14">
          <m.div
            key={mode}
            initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.5, ease }}
            className="w-full max-w-[360px]"
          >
            <p className="flex items-center gap-3 text-[11px] tracking-[0.06em] text-faint uppercase">
              <span className="text-accent-ink">{mode === "signin" ? "01" : "00"}</span>
              {copy.label}
              <span className="h-px flex-1 bg-line" />
            </p>
            <h1 className="mt-6 text-[34px] leading-[1.05] font-medium tracking-[-0.05em]">
              <Scramble key={mode} text={copy.title} duration={520} />
            </h1>
            <p className="mt-3 text-[13px] leading-[1.7] text-soft">{sub}</p>

            <form onSubmit={submit} className="mt-9" noValidate>
              <FieldGroup className="gap-4">
                <Field>
                  <Button type="button" variant="outline" className={`${BUTTON} bg-card`} disabled={!!pending} onClick={() => void run("google", actions.google)}>
                    <GoogleMark />
                    <Label busy={pending === "google"} text="Continue with Google" busyText="Opening Google" />
                  </Button>
                </Field>

                <FieldSeparator className="my-1 *:data-[slot=field-separator-content]:bg-page *:data-[slot=field-separator-content]:text-[11px] *:data-[slot=field-separator-content]:tracking-[0.06em] *:data-[slot=field-separator-content]:text-faint *:data-[slot=field-separator-content]:uppercase">
                  or with email
                </FieldSeparator>

                {mode === "signup" && (
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="name" className={LABEL}>
                      Name
                    </FieldLabel>
                    <Input id="name" autoComplete="name" placeholder="Sam Rivera" value={name} onChange={(e) => setName(e.target.value)} className={INPUT} />
                  </Field>
                )}

                <Field className="gap-1.5">
                  <FieldLabel htmlFor="email" className={LABEL}>
                    Email
                  </FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={INPUT}
                  />
                </Field>

                <Field className="gap-1.5">
                  <div className="flex items-center">
                    <FieldLabel htmlFor="password" className={LABEL}>
                      Password
                    </FieldLabel>
                    {mode === "signin" && (
                      <button
                        type="button"
                        onClick={forgot}
                        disabled={!!pending}
                        className="ml-auto text-[11px] tracking-[0.04em] text-soft underline-offset-4 hover:text-ink hover:underline"
                      >
                        {pending === "reset" ? <Label busy text="" busyText="Sending" /> : "Forgot?"}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${INPUT} pr-16`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((shown) => !shown)}
                      aria-pressed={showPassword}
                      className="absolute inset-y-0 right-0 px-3 text-[10.5px] tracking-[0.06em] text-faint uppercase hover:text-ink"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  {mode === "signup" && <PasswordRules check={check} />}
                </Field>

                <Field className="mt-1">
                  <Button type="submit" className={BUTTON} disabled={!!pending}>
                    <Label busy={pending === "email"} text={copy.submit} busyText={copy.busy} />
                    {pending !== "email" && <MIcon name="right" className="size-3.5" />}
                  </Button>
                </Field>

                {(error || notice) && (
                  <m.p
                    role={error ? "alert" : "status"}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease }}
                    className={`border-l-2 bg-panel px-3 py-2.5 text-[12.5px] leading-[1.6] ${error ? "border-accent text-accent-ink" : "border-ink text-soft"}`}
                  >
                    {error ?? notice}
                  </m.p>
                )}

                <p className="text-center text-[12px] text-soft">
                  {mode === "signin" ? "New to Dittle? " : "Already have an account? "}
                  <NavLink nav={mode === "signin" ? links.signup : links.signin} className="text-ink underline underline-offset-4 hover:text-accent-ink">
                    {mode === "signin" ? "Create an account" : "Sign in"}
                  </NavLink>
                </p>
              </FieldGroup>
            </form>

            {!isGuest && (
              <div className="mt-9 border-t border-line pt-6">
                <button
                  type="button"
                  onClick={() => void run("guest", actions.guest)}
                  disabled={!!pending}
                  className="group flex w-full items-center justify-between text-left text-[12px] tracking-[0.05em] uppercase disabled:opacity-60"
                >
                  <Label busy={pending === "guest"} text="Continue without an account" busyText="Opening Dittle" />
                  <MIcon name="right" className="size-3.5 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                </button>
                <p className="mt-1.5 text-[11.5px] leading-[1.6] text-faint">Your notes are kept in this browser until you create an account.</p>
              </div>
            )}
          </m.div>
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-2 text-[10.5px] tracking-[0.06em] text-faint uppercase">
          <span>Built for #BuildHybridAI 2026</span>
          <span>Apache 2.0</span>
        </footer>
      </div>

      <AuthVisual />
    </div>
  );
}

const LABEL = "text-[11px] tracking-[0.06em] text-soft uppercase";
const INPUT = "h-10 bg-card px-3 text-[13px] md:text-[13px] placeholder:text-faint focus-visible:border-accent focus-visible:ring-0 focus-visible:outline-none";
const BUTTON = "h-10 gap-2 text-[11.5px] tracking-[0.06em] uppercase";

function usePasswordCheck(password: string, checkPassword: AuthActions["checkPassword"]): PasswordCheck | undefined {
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

function PasswordRules({ check }: { check?: PasswordCheck }) {
  if (!check) return <FieldDescription className="text-[11px] text-faint">Checked against your project's password rules as you type.</FieldDescription>;
  return (
    <ul aria-live="polite" className="flex flex-wrap gap-1.5 pt-0.5">
      {check.rules.map((rule) => (
        <li
          key={rule.label}
          className={`flex items-center gap-1 px-1.5 py-0.5 text-[10.5px] tracking-[0.04em] uppercase transition-colors ${rule.met ? "bg-chip text-soft" : "bg-accent-tint text-accent-ink"}`}
        >
          {rule.met && <MIcon name="check" className="size-3" />}
          {rule.label}
        </li>
      ))}
    </ul>
  );
}

function Label({ busy, text, busyText }: { busy: boolean; text: string; busyText: string }) {
  if (!busy) return <span>{text}</span>;
  return (
    <span className="t-shimmer-text" data-text={busyText}>
      {busyText}
    </span>
  );
}

function NavLink({ nav, className, children }: { nav: Nav; className?: string; children: ReactNode }) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    nav.go();
  };
  return (
    <a href={nav.href} onClick={onClick} className={className}>
      {children}
    </a>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path
        fill="currentColor"
        d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.66 4.1-5.35 4.1-3.22 0-5.85-2.67-5.85-5.96S8.78 6.26 12 6.26c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.68 3.72 14.55 2.8 12 2.8 6.92 2.8 2.8 6.92 2.8 12s4.12 9.2 9.2 9.2c5.31 0 8.83-3.73 8.83-8.99 0-.6-.07-1.06-.15-1.51z"
      />
    </svg>
  );
}

const CYCLE = [80, 95, 120] as const;
const money = (n: number) => `£${n.toLocaleString("en-GB")}`;

function AuthVisual() {
  const reduce = useReducedMotion();
  const [found, setFound] = useState(false);
  const [count, setCount] = useState(0);
  const [synced, setSynced] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setFound(true), 700);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (reduce) return;
    let settle = 0;
    const tick = window.setInterval(() => {
      setCount((current) => current + 1);
      setSynced(false);
      settle = window.setTimeout(() => setSynced(true), 1500);
    }, 4600);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(settle);
    };
  }, [reduce]);

  const guests = CYCLE[count % CYCLE.length]!;
  const before = CYCLE[(count + CYCLE.length - 1) % CYCLE.length]!;
  const shown = synced ? guests : before;

  const rows: { title: string; body: ReactNode }[] = [
    { title: "Budget", body: <>Food: {value(shown)} × £38 = <Reprint value={money(shown * 38)} /></> },
    { title: "Chair hire", body: <>{value(shown)} chairs, plus 4 spare</> },
    { title: "Email to Sam", body: <>We're expecting {value(shown)} people</> },
  ];

  function value(n: number) {
    return (
      <span className="token text-ink" data-found={found} data-state={synced ? "idle" : "stale"}>
        <Reprint value={String(n)} />
      </span>
    );
  }

  return (
    <aside aria-hidden className="theme-dark relative hidden overflow-hidden border-l border-line bg-page text-ink lg:flex lg:flex-col">
      <div className="hatch absolute inset-x-0 top-0 h-14 border-b border-line" />
      <div className="relative flex h-14 items-center justify-between px-10 text-[11px] tracking-[0.06em] text-faint uppercase">
        <span>Fig. 01 — One change, every note</span>
        <span className="flex items-center gap-2 bg-page px-2 py-1">
          <span className="size-1.5 animate-pulse bg-accent" />
          Gemini Nano · on device
        </span>
      </div>

      <div className="flex flex-1 items-center justify-center px-10 py-12">
        <div className="brackets w-full max-w-[520px] [--bracket-inset:-9px] [--bracket-size:14px]">
          <div className="border border-line-strong bg-card">
            <Bar left="Catering quote" right={found ? "4 values · on device" : "Reading"} />
            <p className="px-6 pt-2 pb-6 text-[15px] leading-[2]">
              Rosa's Kitchen can do a buffet for{" "}
              <span className="token" data-found={found} data-state={synced ? "idle" : "changed"}>
                <Reprint value={String(guests)} />
              </span>{" "}
              guests at{" "}
              <span className="token" data-found={found}>
                £38
              </span>{" "}
              a head.
            </p>
            <div className="divide-y divide-line-strong border-t border-line-strong bg-panel">
              {rows.map((row, index) => (
                <div key={row.title} className="relative">
                  <span
                    className={`absolute inset-y-0 left-0 w-[2px] transition-colors duration-300 ${synced ? "bg-transparent" : "bg-accent"}`}
                    style={{ transitionDelay: synced ? `${index * 160}ms` : "0ms" }}
                  />
                  <Bar
                    left={row.title}
                    right={synced ? <Scramble key={`${count}-${index}`} text={count === 0 ? "In step" : "Updated · 190 ms"} /> : <span className="text-accent-ink">Says {before}</span>}
                  />
                  <p className="px-6 pt-0.5 pb-4 text-[13px] leading-[1.9] text-soft">{row.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-line px-10 py-9">
        <p className="text-[30px] leading-[1.1] font-medium tracking-[-0.05em]">Change it once.</p>
        <p className="mt-3 max-w-[46ch] text-[13px] leading-[1.7] text-soft">
          Dittle spots the counts, dates and prices your notes share, and keeps every copy in step. It runs on your device.
        </p>
      </div>
    </aside>
  );
}

function Bar({ left, right }: { left: string; right: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-6 pt-4 pb-1.5 text-[11px] tracking-[0.05em] uppercase">
      <span className="flex items-center gap-2 font-medium">
        <MIcon name="file" className="size-3.5 text-soft" />
        {left}
      </span>
      <span className="text-faint">{right}</span>
    </div>
  );
}
