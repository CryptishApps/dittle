import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthRoute } from "@/features/auth/AuthRoute";
import { safeRedirect } from "@/lib/redirect";

export const Route = createFileRoute("/signin")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({ redirect: safeRedirect(search.redirect) }),
  beforeLoad: async ({ context, search }) => {
    if (context.session.hint() !== "member") return;
    const session = await context.session.read();
    if (session.kind === "member") throw redirect({ href: search.redirect ?? "/notes" });
  },
  component: function Page() {
    return <AuthRoute mode="signin" redirectTo={Route.useSearch().redirect} />;
  },
});
