import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthRoute } from "@/features/auth/AuthRoute";
import { safeRedirect } from "@/lib/redirect";

export const Route = createFileRoute("/signup")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({ redirect: safeRedirect(search.redirect) }),
  beforeLoad: async ({ context, search }) => {
    if (context.session.hint() === "signedOut") return;
    const session = await context.session.read();
    if (session.kind === "signedIn") throw redirect({ href: search.redirect ?? "/notes" });
  },
  component: function Page() {
    return <AuthRoute mode="signup" redirectTo={Route.useSearch().redirect} />;
  },
});
