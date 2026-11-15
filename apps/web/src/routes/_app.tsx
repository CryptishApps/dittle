import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { readSession } from "../lib/auth";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const session = await readSession();
    if (session.kind === "signedOut") throw redirect({ to: "/" });
  },
  component: Outlet,
});
