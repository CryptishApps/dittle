import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { loadAuth, useSession } from "@/lib/session";
import { Wordmark } from "../../ui/Wordmark";

export const Route = createFileRoute("/_app/notes")({
  component: NotesRoute,
});

function NotesRoute() {
  const session = useSession();
  const navigate = useNavigate();
  if (!session) return null;

  const leave = async () => {
    await (await loadAuth()).signOut();
    await navigate({ to: "/" });
  };

  return (
    <div className="min-h-dvh bg-page">
      <header className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-6">
        <Wordmark className="text-[15px]" />
        <div className="flex items-center gap-2 text-[12px]">
          {session.kind === "signedIn" && <span className="text-soft">{session.user.displayName ?? session.user.email}</span>}
          <button type="button" onClick={leave} className="h-8 border border-line-strong px-3 tracking-[0.04em] text-ink uppercase hover:border-ink">
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-[24px] font-medium tracking-[-0.02em]">Your first note goes here</h1>
        <p className="mt-2 text-[13px] text-soft">The editor is next on the build list.</p>
      </main>
    </div>
  );
}
