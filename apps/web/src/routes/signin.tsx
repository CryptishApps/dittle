import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthRoute } from "@/features/auth/AuthRoute";
import { readSession } from "@/lib/auth";

export const Route = createFileRoute("/signin")({
  beforeLoad: async () => {
    const session = await readSession();
    if (session.kind === "member") throw redirect({ to: "/notes" });
  },
  component: () => <AuthRoute mode="signin" />,
});
