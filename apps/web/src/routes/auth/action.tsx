import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { ActionPage, type ActionMode, type EmailActions } from "@/features/auth/ActionPage";
import { sameOriginPath } from "@/lib/redirect";
import { loadAuth } from "@/lib/session";

const MODES: ActionMode[] = ["verifyEmail", "verifyAndChangeEmail", "resetPassword", "recoverEmail"];

type Search = { mode?: ActionMode; oobCode?: string; continueUrl?: string };

export const Route = createFileRoute("/auth/action")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    mode: MODES.find((mode) => mode === search.mode),
    oobCode: typeof search.oobCode === "string" ? search.oobCode : undefined,
    continueUrl: typeof search.continueUrl === "string" ? search.continueUrl : undefined,
  }),
  component: EmailActionRoute,
});

const actions: EmailActions = {
  verifyEmail: async (code) => (await loadAuth()).verifyEmail(code),
  emailForPasswordReset: async (code) => (await loadAuth()).emailForPasswordReset(code),
  resetPassword: async (code, email, password) => (await loadAuth()).resetPassword(code, email, password),
  recoverEmail: async (code) => (await loadAuth()).recoverEmail(code),
  sendPasswordReset: async (email) => (await loadAuth()).sendPasswordReset(email),
  checkPassword: async (password) => (await loadAuth()).checkPassword(password),
};

function EmailActionRoute() {
  const { mode, oobCode, continueUrl } = Route.useSearch();
  const navigate = useNavigate();
  const router = useRouter();
  const next = sameOriginPath(continueUrl) ?? "/notes";
  return (
    <ActionPage
      mode={mode}
      code={oobCode}
      actions={actions}
      links={{
        home: { href: "/", go: () => void navigate({ to: "/" }) },
        signin: { href: "/signin", go: () => void navigate({ to: "/signin" }) },
        next: { href: next, go: () => router.history.push(next) },
      }}
    />
  );
}
