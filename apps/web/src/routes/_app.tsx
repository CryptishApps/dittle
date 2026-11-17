import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { keepAppOffline } from "@/lib/offline";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context, location }) => {
    const session = await context.session.read();
    if (session.kind === "signedOut") throw redirect({ to: "/signin", search: { redirect: location.href } });
    keepAppOffline();
    return { user: session.user };
  },
  component: Outlet,
});
