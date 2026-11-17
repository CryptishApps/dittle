import { m } from "motion/react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import type { PasswordCheck } from "@/lib/auth";
import { authMessage } from "@/lib/auth-errors";
import { ease, MIcon, TypeOn } from "@/ui/kit";
import { AuthShell, BUTTON, BusyLabel, LABEL, PasswordInput, PasswordRules, usePasswordCheck, type Nav } from "./parts";

export type ActionMode = "verifyEmail" | "verifyAndChangeEmail" | "resetPassword" | "recoverEmail";

export type EmailActions = {
  verifyEmail: (code: string) => Promise<void>;
  emailForPasswordReset: (code: string) => Promise<string>;
  resetPassword: (code: string, email: string, password: string) => Promise<void>;
  recoverEmail: (code: string) => Promise<string | undefined>;
  sendPasswordReset: (email: string) => Promise<void>;
  checkPassword: (password: string) => Promise<PasswordCheck>;
};

type ActionPageProps = {
  mode?: ActionMode;
  code?: string;
  actions: EmailActions;
  links: { home: Nav; signin: Nav; next: Nav };
};

type State =
  | { step: "checking" }
  | { step: "failed"; message: string }
  | { step: "verified"; changed: boolean }
  | { step: "choosePassword"; email: string }
  | { step: "recovered"; email?: string };

export function ActionPage({ mode, code, actions, links }: ActionPageProps) {
  const [state, setState] = useState<State>({ step: "checking" });

  useEffect(() => {
    if (!mode || !code) {
      setState({ step: "failed", message: "This link is missing a part. Open it again from the email." });
      return;
    }
    let live = true;
    const settle = (next: State) => live && setState(next);
    attempt(mode, code, actions).then(settle, (error: unknown) => settle({ step: "failed", message: authMessage(error) }));
    return () => {
      live = false;
    };
  }, [mode, code, actions]);

  return (
    <AuthShell home={links.home}>
      <m.div
        key={state.step}
        initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.5, ease }}
        className="w-full max-w-[360px]"
      >
        {state.step === "checking" && (
          <Heading title="Checking your link" sub="This takes a moment.">
            <p className="t-shimmer-text mt-8 text-[14px] font-medium" data-text="Talking to Firebase">
              Talking to Firebase
            </p>
          </Heading>
        )}

        {state.step === "failed" && (
          <Heading title="That link didn't work." sub={state.message}>
            <Next nav={links.signin} label="Back to sign in" />
          </Heading>
        )}

        {state.step === "verified" && (
          <Heading
            title={state.changed ? "Email updated." : "Email verified."}
            sub={state.changed ? "Use your new address next time you sign in." : "Thanks. Your account is all set."}
          >
            <Next nav={links.next} label="Open Dittle" />
          </Heading>
        )}

        {state.step === "recovered" && <Recovered email={state.email} actions={actions} next={links.next} />}

        {state.step === "choosePassword" && code && <ChoosePassword code={code} email={state.email} actions={actions} next={links.next} />}
      </m.div>
    </AuthShell>
  );
}

const attempts = new Map<string, Promise<State>>();

function attempt(mode: ActionMode, code: string, actions: EmailActions): Promise<State> {
  let work = attempts.get(code);
  if (!work) {
    work =
      mode === "resetPassword"
        ? actions.emailForPasswordReset(code).then((email) => ({ step: "choosePassword", email }))
        : mode === "recoverEmail"
          ? actions.recoverEmail(code).then((email) => ({ step: "recovered", email }))
          : actions.verifyEmail(code).then(() => ({ step: "verified", changed: mode === "verifyAndChangeEmail" }));
    attempts.set(code, work);
  }
  return work;
}

function Heading({ title, sub, children }: { title: string; sub: string; children?: ReactNode }) {
  return (
    <>
      <h1 className="font-heading text-[44px] leading-[1.02] font-semibold tracking-[-0.045em]">
        <TypeOn key={title} text={title} duration={520} />
      </h1>
      <p className="mt-3 text-[16px] leading-[1.6] text-soft">{sub}</p>
      {children}
    </>
  );
}

function Next({ nav, label }: { nav: Nav; label: string }) {
  return (
    <Button asChild className={`${BUTTON} mt-9 w-full`}>
      <a
        href={nav.href}
        onClick={(event) => {
          event.preventDefault();
          nav.go();
        }}
      >
        {label}
        <MIcon name="right" className="size-3.5" />
      </a>
    </Button>
  );
}

function ChoosePassword({ code, email, actions, next }: { code: string; email: string; actions: EmailActions; next: Nav }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const check = usePasswordCheck(password, actions.checkPassword);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (check && !check.valid) {
      setError("That password doesn't meet the rules under the box.");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await actions.resetPassword(code, email, password);
      next.go();
    } catch (caught) {
      setError(authMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Heading title="Choose a new password." sub={`For ${email}. You'll be signed in straight after.`}>
      <form onSubmit={(event) => void submit(event)} className="mt-9" noValidate>
        <FieldGroup className="gap-4">
          <input type="email" autoComplete="username" value={email} readOnly hidden />
          <Field className="gap-1.5">
            <FieldLabel htmlFor="new-password" className={LABEL}>
              New password
            </FieldLabel>
            <PasswordInput id="new-password" value={password} onChange={setPassword} autoComplete="new-password" />
            <PasswordRules check={check} />
          </Field>
          <Field className="mt-1">
            <Button type="submit" className={BUTTON} disabled={busy || !password}>
              <BusyLabel state={busy ? "busy" : "idle"} text="Save and sign in" busyText="Saving" />
              {!busy && <MIcon name="right" className="size-3.5" />}
            </Button>
          </Field>
          {error && <Alert tone="error">{error}</Alert>}
        </FieldGroup>
      </form>
    </Heading>
  );
}

function Recovered({ email, actions, next }: { email?: string; actions: EmailActions; next: Nav }) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();
  const send = async () => {
    if (!email) return;
    setError(undefined);
    try {
      await actions.sendPasswordReset(email);
      setSent(true);
    } catch (caught) {
      setError(authMessage(caught));
    }
  };
  return (
    <Heading
      title="Email change undone."
      sub={`Your sign-in email is back to ${email ?? "what it was"}. If you didn't ask for the change, reset your password as well.`}
    >
      {email && (
        <Button type="button" variant="outline" className={`${BUTTON} mt-9 w-full bg-card`} disabled={sent} onClick={() => void send()}>
          {sent ? "Reset link sent" : "Send a password reset link"}
        </Button>
      )}
      {error && <Alert tone="error">{error}</Alert>}
      <Next nav={next} label="Open Dittle" />
    </Heading>
  );
}

function Alert({ tone, children }: { tone: "error" | "info"; children: ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`mt-4 rounded-xl px-4 py-3 text-[14px] leading-[1.55] ${tone === "error" ? "bg-danger-tint text-danger" : "bg-accent-tint text-accent-ink"}`}
    >
      {children}
    </p>
  );
}
