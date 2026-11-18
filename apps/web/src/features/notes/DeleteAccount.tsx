import { useSuspenseQuery } from "@tanstack/react-query";
import type { User } from "firebase/auth";
import { Dialog } from "radix-ui";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { GoogleMark, PasswordInput } from "@/features/auth/parts";
import { authMessage, isCancelled } from "@/lib/auth-errors";
import { confirmMethod, loadAuth, signedInRecently, useSession } from "@/lib/session";
import { btnClass, POPOVER } from "@/ui/kit";
import { collectionsQuery, loadStore, notesQuery } from "./api";

const LIST = new Intl.ListFormat("en-GB", { type: "conjunction" });

type Props = { uid: string; online: boolean; open: boolean; onOpenChange: (open: boolean) => void; returnFocus: () => void };

export function DeleteAccountDialog({ uid, online, open, onOpenChange, returnFocus }: Props) {
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState<User>();
  const session = useSession();
  if (session?.kind === "signedIn" && session.user.uid === uid && session.user !== user) setUser(session.user);
  const holdWhileBusy = (event: Event) => busy && event.preventDefault();
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-scrim data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          onEscapeKeyDown={holdWhileBusy}
          onPointerDownOutside={holdWhileBusy}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocus();
          }}
          className={`${POPOVER} fixed top-1/2 left-1/2 z-50 w-[min(460px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl p-6 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:p-7`}
        >
          {open && (user ? <DeleteAccountBody user={user} online={online} busy={busy} setBusy={setBusy} /> : <CheckingSignIn />)}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type BodyProps = { user: User; online: boolean; busy: boolean; setBusy: (busy: boolean) => void };

function DeleteAccountBody({ user, online, busy, setBusy }: BodyProps) {
  const { data: notes } = useSuspenseQuery(notesQuery(user.uid));
  const { data: collections } = useSuspenseQuery(collectionsQuery(user.uid));
  const [confirming, setConfirming] = useState(() => !signedInRecently(user));
  const [dataGone, setDataGone] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const method = confirmMethod(user);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (confirming) form.current?.querySelector<HTMLElement>("input, button[type=submit]")?.focus();
  }, [confirming]);

  const run = async (event?: FormEvent) => {
    event?.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const [store, auth] = await Promise.all([loadStore(), loadAuth()]);
      if (confirming) await auth.confirmIdentity(user, password);
      await store.deleteEverything(user.uid);
      setDataGone(true);
      if ((await auth.deleteSignedInUser(user)) === "confirm-identity") {
        setConfirming(true);
        setBusy(false);
      }
    } catch (failure) {
      if (!isCancelled(failure)) setError(authMessage(failure));
      setBusy(false);
    }
  };

  const deleted = LIST.format([
    ...(notes.length > 0 ? [`your ${plural(notes.length, "note")}`] : []),
    ...(collections.length > 0 ? [plural(collections.length, "collection")] : []),
    "every tracked value",
    "your sign-in",
  ]);

  return (
    <form ref={form} onSubmit={(event) => void run(event)}>
      <Dialog.Title className="text-[20px] leading-tight font-semibold tracking-[-0.02em] text-ink">{confirming && dataGone ? "Confirm it's you" : "Delete your account?"}</Dialog.Title>
      <Dialog.Description className="mt-2.5 text-[14.5px] leading-relaxed text-soft">
        {confirming && dataGone
          ? method === "password"
            ? "Your notes and values are deleted. For security, enter your password to finish deleting your sign-in."
            : "Your notes and values are deleted. For security, continue with Google to finish deleting your sign-in."
          : `This permanently deletes ${deleted} from every device. It can't be undone.${confirming ? (method === "password" ? " Enter your password to confirm." : " Continue with Google to confirm.") : ""}`}
      </Dialog.Description>

      {confirming && method === "password" && (
        <div className="mt-5 grid gap-1.5">
          <label htmlFor="delete-account-password" className="text-label text-soft">
            Password
          </label>
          <PasswordInput id="delete-account-password" value={password} onChange={setPassword} autoComplete="current-password" />
        </div>
      )}

      <p role="alert" className="mt-3 min-h-[1lh] text-[13.5px] text-danger empty:hidden">
        {error ?? (!online ? "You're offline. Connect to the internet to delete your account." : "")}
      </p>

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Dialog.Close
          type="button"
          disabled={busy}
          className={btnClass({ variant: "secondary", size: "md" })}
        >
          Cancel
        </Dialog.Close>
        <button
          type="submit"
          disabled={busy || !online || (confirming && method === "password" && !password)}
          aria-busy={busy}
          className={btnClass({ variant: "danger", size: "md" })}
        >
          {confirming && method === "google" && !busy && <GoogleMark />}
          {busy ? "Deleting" : confirming && method === "google" ? "Continue with Google" : "Delete account"}
        </button>
      </div>
    </form>
  );
}

function CheckingSignIn() {
  useEffect(() => void loadAuth().catch(() => undefined), []);
  return (
    <>
      <Dialog.Title className="text-[20px] leading-tight font-semibold tracking-[-0.02em] text-ink">Delete your account?</Dialog.Title>
      <Dialog.Description role="status" className="mt-2.5 text-[14.5px] leading-relaxed text-soft">
        Checking your sign-in.
      </Dialog.Description>
    </>
  );
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}
