import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authMessage } from "@/lib/auth-errors";
import { loadAuth, preloadAuthWhenIdle } from "@/lib/session";
import { Welcome } from "@/features/welcome/Welcome";

export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    if (context.session.hint() === "signedOut") return;
    const session = await context.session.read();
    if (session.kind !== "signedOut") throw redirect({ to: "/notes" });
  },
  component: WelcomeRoute,
});

function WelcomeRoute() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  useEffect(preloadAuthWhenIdle, []);

  const start = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await (await loadAuth()).startAsGuest();
      await navigate({ to: "/notes" });
    } catch (caught) {
      setError(authMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return <Welcome onStart={start} onSignIn={() => void navigate({ to: "/signin" })} busy={busy} error={error} />;
}
