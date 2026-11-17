import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { forgetNotesOnDevice, keepNotesOnDevice } from "@/features/notes/api";
import { afterFirstPaint } from "@/lib/first-paint";
import { keepAppOffline } from "@/lib/offline";
import { accountOf, readSession, sessionEnded, useSession } from "@/lib/session";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context, location }) => {
    const hint = context.session.hint();
    if (hint.kind === "signedIn" && (await keepNotesOnDevice(context.queryClient, hint.account.uid)).restored) {
      keepAppOffline();
      return { account: hint.account };
    }
    const session = await context.session.read();
    if (session.kind === "signedOut") throw redirect({ to: "/signin", search: { redirect: location.href } });
    const account = accountOf(session.user);
    await keepNotesOnDevice(context.queryClient, account.uid);
    keepAppOffline();
    return { account };
  },
  component: SignedIn,
});

function SignedIn() {
  const { account } = Route.useRouteContext();
  const ended = sessionEnded(useSession(), account);

  useEffect(() => {
    void afterFirstPaint()
      .then(readSession)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (ended) void forgetNotesOnDevice().then(() => window.location.assign("/"));
  }, [ended]);

  return <Outlet />;
}
