import { useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { loadAuth } from "@/lib/session";
import { AuthPage, type AuthActions, type AuthMode } from "./AuthPage";

const checkPassword = async (password: string) => (await loadAuth()).checkPassword(password);

export function AuthRoute({ mode, redirectTo }: { mode: AuthMode; redirectTo?: string }) {
  const router = useRouter();
  const navigate = useNavigate();
  useEffect(() => void loadAuth().catch(() => undefined), []);

  const done = () => router.history.push(redirectTo ?? "/notes");
  const search = redirectTo ? { redirect: redirectTo } : {};

  const actions: AuthActions = {
    google: async () => {
      await (await loadAuth()).continueWithGoogle();
      done();
    },
    email: async ({ name, email, password }) => {
      const auth = await loadAuth();
      if (mode === "signin") await auth.signInWithEmail(email, password);
      else await auth.signUpWithEmail(name, email, password);
      done();
    },
    reset: async (email) => (await loadAuth()).sendPasswordReset(email),
    checkPassword,
  };

  return (
    <AuthPage
      mode={mode}
      actions={actions}
      links={{
        home: { href: "/", go: () => void navigate({ to: "/" }) },
        signin: { href: "/signin", go: () => void navigate({ to: "/signin", search }) },
        signup: { href: "/signup", go: () => void navigate({ to: "/signup", search }) },
      }}
    />
  );
}
