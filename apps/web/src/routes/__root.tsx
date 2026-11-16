import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Link, Outlet, type ErrorComponentProps } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { FirebaseNotConfigured } from "@/lib/firebase-config";
import type { Session, SessionKind } from "@/lib/session";
import { Wordmark } from "@/ui/Wordmark";

export type RouterContext = {
  session: { hint: () => SessionKind; read: () => Promise<Session> };
  queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
  errorComponent: RootError,
  notFoundComponent: NotFound,
});

function RootError({ error, reset }: ErrorComponentProps) {
  const setup = error instanceof FirebaseNotConfigured;
  return (
    <Centered>
      <h1 className="text-[24px] font-medium tracking-[-0.02em]">{setup ? "Firebase isn't set up yet" : "Something went wrong"}</h1>
      <p className="mt-3 text-[13px] leading-relaxed text-soft">{error instanceof Error ? error.message : String(error)}</p>
      {!setup && (
        <button type="button" onClick={reset} className="mt-6 inline-flex h-9 items-center bg-ink px-4 text-[12px] tracking-[0.04em] text-page uppercase">
          Try again
        </button>
      )}
    </Centered>
  );
}

function NotFound() {
  return (
    <Centered>
      <h1 className="text-[24px] font-medium tracking-[-0.02em]">There's no page here</h1>
      <Link to="/" className="mt-6 inline-flex h-9 items-center bg-ink px-4 text-[12px] tracking-[0.04em] text-page uppercase">
        Go to your notes
      </Link>
    </Centered>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-page px-4">
      <div className="max-w-md text-center">
        <Wordmark className="mb-8 text-[16px]" />
        {children}
      </div>
    </div>
  );
}
