import { Link } from "@tanstack/react-router";
import { lazy, Suspense, useRef, useState, type ReactNode } from "react";
import { useDeviceModel } from "@/features/ai/device-model";
import { confirmMethod, loadAuth, useSession, type Account } from "@/lib/session";
import { btnClass, MIcon } from "@/ui/kit";
import { MODEL_LABEL, useOnline } from "./NotesShell";

const DeleteAccountDialog = lazy(() => import("./DeleteAccount").then((module) => ({ default: module.DeleteAccountDialog })));

const METHOD_LABEL = { password: "Email and password", google: "Google" } as const;

export function AccountPage({ account }: { account: Account }) {
  const session = useSession();
  const user = session?.kind === "signedIn" && session.user.uid === account.uid ? session.user : undefined;
  const online = useOnline();
  const model = useDeviceModel();
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState<"unopened" | "open" | "closed">("unopened");
  const deleteButton = useRef<HTMLButtonElement>(null);

  const signOut = async () => {
    setLeaving(true);
    await (await loadAuth()).signOut();
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[760px] px-4 pt-10 pb-24 sm:px-8 sm:pt-14">
        <h1 className="text-[30px] leading-[1.15] font-semibold tracking-[-0.03em] text-ink">Account</h1>

        <dl className="mt-8 border-t border-line">
          <Row label="Name">{account.name || "Not set"}</Row>
          <Row label="Email">{user?.email ?? "…"}</Row>
          <Row label="Signs in with">{user ? METHOD_LABEL[confirmMethod(user)] : "…"}</Row>
          <Row label="Sync">
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className={`size-1.5 rounded-full ${online ? "bg-ink" : "bg-faint"}`} />
              {online ? "Online · synced" : "Offline · saved on this device"}
            </span>
          </Row>
          <Row label="Gemini Nano">
            <Link to="/ai" className="inline-flex items-center gap-1.5 underline decoration-line-strong underline-offset-4 hover:decoration-ink">
              {MODEL_LABEL[model.status]}
              <MIcon name="right" className="size-3.5" />
            </Link>
          </Row>
        </dl>

        <button type="button" onClick={() => void signOut()} disabled={leaving} className={`${btnClass({ variant: "secondary", size: "md" })} mt-8`}>
          {leaving ? "Signing out" : "Sign out"}
        </button>

        <section aria-labelledby="delete-heading" className="mt-16 border-t border-line pt-8">
          <h2 id="delete-heading" className="text-[15px] font-semibold text-ink">
            Delete account
          </h2>
          <p className="mt-1.5 max-w-[520px] text-[14.5px] leading-[1.6] text-soft">Deletes your notes, values, collections and sign-in from every device. This can't be undone.</p>
          <button ref={deleteButton} type="button" onClick={() => setDeleting("open")} className={`${btnClass({ variant: "secondary", size: "md" })} mt-4 text-danger!`}>
            Delete account…
          </button>
        </section>
      </div>

      {deleting !== "unopened" && (
        <Suspense>
          <DeleteAccountDialog
            uid={account.uid}
            online={online}
            open={deleting === "open"}
            onOpenChange={(open) => setDeleting(open ? "open" : "closed")}
            returnFocus={() => deleteButton.current?.focus()}
          />
        </Suspense>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-4 border-b border-line py-3.5 text-[15px]">
      <dt className="w-28 shrink-0 text-faint sm:w-36">{label}</dt>
      <dd className="min-w-0 flex-1 truncate text-ink">{children}</dd>
    </div>
  );
}
