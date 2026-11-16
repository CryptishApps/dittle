import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AuthPage, type AuthMode } from "@/features/auth/AuthPage";

export const Route = createFileRoute("/dev/designs/signin")({
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
  return (
    <AuthPage
      mode={mode}
      actions={{ google: wait, email: wait, reset: wait, checkPassword }}
      links={{
        home: { href: "/dev/designs/welcome", go: () => undefined },
        signin: { href: "#signin", go: () => setMode("signin") },
        signup: { href: "#signup", go: () => setMode("signup") },
      }}
    />
  );
}
