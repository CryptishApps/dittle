import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AuthPage, type AuthAside, type AuthMode } from "@/features/auth/AuthPage";

export const Route = createFileRoute("/dev/designs/signin")({
  validateSearch: (search: Record<string, unknown>): { aside?: AuthAside } => ({ aside: search.aside === "note" ? "note" : undefined }),
  component: SignInPreview,
});

const wait = () => new Promise<void>((resolve) => window.setTimeout(resolve, 1200));

async function checkPassword(password: string) {
  const rules = [
    { label: "8+ characters", met: password.length >= 8 },
    { label: "Number", met: /\d/.test(password) },
  ];
  return { valid: rules.every((rule) => rule.met), rules };
}

function SignInPreview() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const aside = Route.useSearch().aside ?? "peek";
  const navigate = Route.useNavigate();
  const tab = (value: AuthAside) => `px-2.5 py-1 ${aside === value ? "bg-ink text-page" : "hover:text-ink"}`;
  return (
    <>
      <div className="fixed bottom-24 right-3 z-[60] flex items-center gap-1 border border-line-strong bg-card p-1 text-[11px] tracking-[0.04em] text-soft uppercase shadow-pop">
        <span className="px-2 text-faint">Right side</span>
        <button type="button" className={tab("peek")} onClick={() => void navigate({ search: {} })}>
          A · App peek
        </button>
        <button type="button" className={tab("note")} onClick={() => void navigate({ search: { aside: "note" } })}>
          B · Quiet note
        </button>
      </div>
      <AuthPage
        mode={mode}
        aside={aside}
        actions={{ google: wait, email: wait, guest: wait, reset: wait, checkPassword }}
        links={{
          home: { href: "/dev/designs/welcome", go: () => undefined },
          signin: { href: "#signin", go: () => setMode("signin") },
          signup: { href: "#signup", go: () => setMode("signup") },
        }}
      />
    </>
  );
}
