import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AuthPage, type AuthMode } from "@/features/auth/AuthPage";

export const Route = createFileRoute("/dev/designs/signin")({
  component: SignInPreview,
});

const wait = () => new Promise<void>((resolve) => window.setTimeout(resolve, 1200));

function SignInPreview() {
  const [mode, setMode] = useState<AuthMode>("signin");
  return (
    <AuthPage
      mode={mode}
      actions={{ google: wait, email: wait, guest: wait, reset: wait }}
      links={{
        home: { href: "/dev/designs/welcome", go: () => undefined },
        signin: { href: "#signin", go: () => setMode("signin") },
        signup: { href: "#signup", go: () => setMode("signup") },
      }}
    />
  );
}
