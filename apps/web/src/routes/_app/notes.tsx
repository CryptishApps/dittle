import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { continueWithGoogle, signOut, useSession } from "../../lib/auth";
import { Wordmark } from "../../ui/Wordmark";

export const Route = createFileRoute("/_app/notes")({
  component: NotesRoute,
});

function NotesRoute() {
  const session = useSession();
  const navigate = useNavigate();
  const [error, setError] = useState<string>();

  const upgrade = async () => {
    setError(undefined);
    try {
      await continueWithGoogle();
    } catch {
      setError("Couldn't connect your Google account. Try again.");
    }
  };

  const leave = async () => {
    await signOut();
    await navigate({ to: "/" });
  };

  return (
    <div className="min-h-dvh bg-paper">
      <header className="flex items-center justify-between border-b border-rule px-4 py-3 sm:px-6">
        <Wordmark className="text-[22px]" />
        <div className="flex items-center gap-2 text-[14px]">
          {session.kind === "guest" && (
            <button type="button" onClick={upgrade} className="rounded-full bg-ditto px-3 py-1.5 font-medium text-white">
              Keep notes with Google
            </button>
          )}
          {session.kind === "member" && <span className="text-ink-soft">{session.user.email}</span>}
          {session.kind !== "guest" && (
            <button type="button" onClick={leave} className="rounded-full px-3 py-1.5 text-ink-soft hover:bg-paper-sunk">
              Sign out
            </button>
          )}
        </div>
      </header>
      {error && <p role="alert" className="px-6 pt-3 text-caution">{error}</p>}
      <main className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-note text-[28px] font-medium">Your first note goes here</h1>
        <p className="mt-2 text-ink-soft">The editor is next on the build list.</p>
      </main>
    </div>
  );
}
