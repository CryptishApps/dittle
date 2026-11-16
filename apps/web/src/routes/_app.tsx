import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context, location }) => {
    const session = await context.session.read();
    if (session.kind === "signedOut") throw redirect({ to: "/signin", search: { redirect: location.href } });
    return { user: session.user };
  },
  component: Outlet,
});
