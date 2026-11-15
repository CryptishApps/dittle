import { createRootRoute, Link, Outlet, type ErrorComponentProps } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { FirebaseNotConfigured } from "../lib/firebase";
import { Wordmark } from "../ui/Wordmark";

export const Route = createRootRoute({
  component: Outlet,
  errorComponent: RootError,
  notFoundComponent: NotFound,
});

function RootError({ error, reset }: ErrorComponentProps) {
  const setup = error instanceof FirebaseNotConfigured;
  return (
    <Centered>
      <h1 className="font-note text-[28px] font-medium">{setup ? "Firebase isn't set up yet" : "Something went wrong"}</h1>
      <p className="mt-3 text-ink-soft">{error instanceof Error ? error.message : String(error)}</p>
      {!setup && (
        <button type="button" onClick={reset} className="mt-6 rounded-full bg-ink px-4 py-2 text-paper">
          Try again
        </button>
      )}
    </Centered>
  );
}

function NotFound() {
  return (
    <Centered>
      <h1 className="font-note text-[28px] font-medium">There's no page here</h1>
      <Link to="/" className="mt-6 inline-block rounded-full bg-ink px-4 py-2 text-paper">
        Go to your notes
      </Link>
    </Centered>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-paper px-4">
      <div className="max-w-md text-center">
        <Wordmark className="mb-8 text-[22px]" />
        {children}
      </div>
    </div>
  );
}
