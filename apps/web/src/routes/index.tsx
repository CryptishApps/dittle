import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { continueWithGoogle, readSession, startAsGuest } from "../lib/auth";
import { Welcome } from "../features/welcome/Welcome";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const session = await readSession();
    if (session.kind !== "signedOut") throw redirect({ to: "/notes" });
  },
  component: WelcomeRoute,
});

function WelcomeRoute() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const run = (action: () => Promise<void>) => async () => {
    setBusy(true);
    setError(undefined);
    try {
      await action();
      await navigate({ to: "/notes" });
    } catch {
      setError("Couldn't sign you in. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return <Welcome onStart={run(startAsGuest)} onGoogle={run(continueWithGoogle)} busy={busy} error={error} />;
}
