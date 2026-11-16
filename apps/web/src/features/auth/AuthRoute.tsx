import { useNavigate } from "@tanstack/react-router";
import { continueWithGoogle, sendPasswordReset, signInWithEmail, signUpWithEmail, startAsGuest, useSession } from "@/lib/auth";
import { AuthPage, type AuthActions, type AuthMode } from "./AuthPage";

export function AuthRoute({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate();
  const session = useSession();
  const isGuest = session.kind === "guest";
  const toNotes = () => navigate({ to: "/notes" });

  const actions: AuthActions = {
    google: async () => {
      await continueWithGoogle();
      await toNotes();
    },
    email: async ({ name, email, password }) => {
      if (mode === "signin") await signInWithEmail(email, password);
      else await signUpWithEmail(name, email, password);
      await toNotes();
    },
    guest: async () => {
      await startAsGuest();
      await toNotes();
    },
    reset: sendPasswordReset,
  };

  return (
    <AuthPage
      mode={mode}
      actions={actions}
      isGuest={isGuest}
      links={{
        home: isGuest ? { href: "/notes", go: () => void toNotes() } : { href: "/", go: () => void navigate({ to: "/" }) },
        signin: { href: "/signin", go: () => void navigate({ to: "/signin" }) },
        signup: { href: "/signup", go: () => void navigate({ to: "/signup" }) },
      }}
    />
  );
}
