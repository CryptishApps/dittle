import { m } from "motion/react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { PasswordCheck } from "@/lib/auth";
import { authMessage, isCancelled } from "@/lib/auth-errors";
import { ease, MIcon, Scramble } from "@/ui/kit";
import { AuthShell, BUTTON, BusyLabel, GoogleMark, INPUT, LABEL, NavLink, PasswordInput, PasswordRules, usePasswordCheck, type Nav } from "./parts";

export type AuthMode = "signin" | "signup";

export type AuthActions = {
  google: () => Promise<void>;
  email: (input: { name: string; email: string; password: string }) => Promise<void>;
  reset: (email: string) => Promise<void>;
  checkPassword: (password: string) => Promise<PasswordCheck>;
};

type Pending = "google" | "email" | "reset";

type AuthPageProps = {
  mode: AuthMode;
  actions: AuthActions;
  links: { home: Nav; signin: Nav; signup: Nav };
};

const COPY = {
  signin: { title: "Welcome back.", submit: "Sign in", busy: "Signing in" },
  signup: { title: "Start writing.", submit: "Create account", busy: "Creating account" },
} as const;

export function AuthPage({ mode, actions, links }: AuthPageProps) {
  const copy = COPY[mode];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  const sub = mode === "signin" ? "Pick up your notes on any device." : "Free, private, and your notes work offline.";

  return (
    <AuthShell home={links.home}>
          <m.div
            key={mode}
            initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.5, ease }}
            className="w-full max-w-[360px]"
          >
            <h1 className="text-[34px] leading-[1.05] font-medium tracking-[-0.05em]">
              <Scramble key={mode} text={copy.title} duration={520} />
            </h1>
            <p className="mt-3 text-[13px] leading-[1.7] text-soft">{sub}</p>

            <form onSubmit={submit} className="mt-9" noValidate>
              <FieldGroup className="gap-4">
                <Field>
                  <Button type="button" variant="outline" className={`${BUTTON} bg-card`} disabled={!!pending} onClick={() => void run("google", actions.google)}>
                    <GoogleMark />
                    <BusyLabel busy={pending === "google"} text="Continue with Google" busyText="Opening Google" />
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
                        {pending === "reset" ? <BusyLabel busy text="" busyText="Sending" /> : "Forgot?"}
                      </button>
                    )}
                  </div>
                  <PasswordInput id="password" value={password} onChange={setPassword} autoComplete={mode === "signin" ? "current-password" : "new-password"} />
                  {mode === "signup" && <PasswordRules check={check} />}
                </Field>

                <Field className="mt-1">
                  <Button type="submit" className={BUTTON} disabled={!!pending}>
                    <BusyLabel busy={pending === "email"} text={copy.submit} busyText={copy.busy} />
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

          </m.div>
    </AuthShell>
  );
}
