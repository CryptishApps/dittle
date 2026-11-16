import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { authMessage, readSession, startAsGuest } from "../lib/auth";
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

  const start = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await startAsGuest();
      await navigate({ to: "/notes" });
    } catch (caught) {
      setError(authMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return <Welcome onStart={start} onSignIn={() => void navigate({ to: "/signin" })} busy={busy} error={error} />;
}
