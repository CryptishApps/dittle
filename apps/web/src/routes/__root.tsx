import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Link, Outlet, type ErrorComponentProps } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { FirebaseNotConfigured } from "@/lib/firebase-config";
import type { Session, SessionHint } from "@/lib/session";
import { btnClass } from "@/ui/kit";
import { Wordmark } from "@/ui/Wordmark";

export type RouterContext = {
  session: { hint: () => SessionHint; read: () => Promise<Session> };
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
      <h1 className="font-heading text-[32px] leading-tight font-semibold tracking-[-0.025em]">{setup ? "Firebase isn't set up yet" : "Something went wrong"}</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-soft">{error instanceof Error ? error.message : String(error)}</p>
      {!setup && (
        <button type="button" onClick={reset} className={`${btnClass({ variant: "primary", size: "md" })} mt-6`}>
          Try again
        </button>
      )}
    </Centered>
  );
}

function NotFound() {
  return (
    <Centered>
      <h1 className="font-heading text-[32px] leading-tight font-semibold tracking-[-0.025em]">There's no page here</h1>
      <Link to="/" className={`${btnClass({ variant: "primary", size: "md" })} mt-6`}>
        Go to your notes
      </Link>
    </Centered>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-page px-4">
      <div className="max-w-md text-center">
        <Wordmark className="mb-8 text-[22px]" />
        {children}
      </div>
    </div>
  );
}
