import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { preloadAuthWhenIdle } from "@/lib/session";
import { Welcome } from "@/features/welcome/Welcome";

export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    if (context.session.hint() === "signedOut") return;
    const session = await context.session.read();
    if (session.kind === "signedIn") throw redirect({ to: "/notes" });
  },
  component: WelcomeRoute,
});

function WelcomeRoute() {
  const navigate = useNavigate();
  useEffect(preloadAuthWhenIdle, []);
  return <Welcome onStart={() => void navigate({ to: "/signup" })} onSignIn={() => void navigate({ to: "/signin" })} />;
}
