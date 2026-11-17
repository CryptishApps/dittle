import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import type { User } from "firebase/auth";
import { Dialog } from "radix-ui";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { GoogleMark, PasswordInput } from "@/features/auth/parts";
import { authMessage, isCancelled } from "@/lib/auth-errors";
import { confirmMethod, loadAuth } from "@/lib/session";
import { collectionsQuery, loadStore, notesQuery } from "./api";

const LIST = new Intl.ListFormat("en-GB", { type: "conjunction" });

type Props = { user: User; online: boolean; open: boolean; onOpenChange: (open: boolean) => void; returnFocus: () => void };

export function DeleteAccountDialog({ user, online, open, onOpenChange, returnFocus }: Props) {
  const [busy, setBusy] = useState(false);
  const holdWhileBusy = (event: Event) => busy && event.preventDefault();
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-page/70 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          onEscapeKeyDown={holdWhileBusy}
          onPointerDownOutside={holdWhileBusy}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocus();
          }}
          className="fixed top-1/2 left-1/2 z-50 w-[min(440px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 border border-line-strong bg-card p-5 shadow-pop data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:p-6"
        >
          {open && <DeleteAccountBody user={user} online={online} busy={busy} setBusy={setBusy} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type BodyProps = { user: User; online: boolean; busy: boolean; setBusy: (busy: boolean) => void };

function DeleteAccountBody({ user, online, busy, setBusy }: BodyProps) {
  const queryClient = useQueryClient();
  const { data: notes } = useSuspenseQuery(notesQuery(user.uid));
  const { data: collections } = useSuspenseQuery(collectionsQuery(user.uid));
  const [confirming, setConfirming] = useState(false);
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
      if ((await auth.deleteSignedInUser(user)) === "confirm-identity") {
        setConfirming(true);
        setBusy(false);
        return;
      }
      queryClient.clear();
      await store.forgetThisDevice();
      window.location.assign("/");
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
      <Dialog.Title className="text-[16px] font-medium tracking-[-0.01em] text-ink">{confirming ? "Confirm it's you" : "Delete your account?"}</Dialog.Title>
      <Dialog.Description className="mt-2 text-[12.5px] leading-relaxed text-soft">
        {confirming
          ? method === "password"
            ? "Your notes and values are deleted. For security, enter your password to finish deleting your sign-in."
            : "Your notes and values are deleted. For security, continue with Google to finish deleting your sign-in."
          : `This permanently deletes ${deleted} from every device. It can't be undone.`}
      </Dialog.Description>

      {confirming && method === "password" && (
        <div className="mt-4 grid gap-1.5">
          <label htmlFor="delete-account-password" className="text-[11px] tracking-[0.06em] text-soft uppercase">
            Password
          </label>
          <PasswordInput id="delete-account-password" value={password} onChange={setPassword} autoComplete="current-password" />
        </div>
      )}

      <p role="alert" className="mt-3 min-h-[1lh] text-[12px] text-accent-ink empty:hidden">
        {error ?? (!online ? "You're offline. Connect to the internet to delete your account." : "")}
      </p>

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Dialog.Close
          type="button"
          disabled={busy}
          className="inline-flex h-9 items-center border border-line-strong bg-card px-3.5 text-[11px] font-medium tracking-[0.04em] text-ink uppercase hover:border-ink disabled:opacity-50"
        >
          Cancel
        </Dialog.Close>
        <button
          type="submit"
          disabled={busy || !online || (confirming && method === "password" && !password)}
          aria-busy={busy}
          className="inline-flex h-9 items-center gap-2 border border-accent-ink bg-accent-ink px-3.5 text-[11px] font-medium tracking-[0.04em] text-page uppercase hover:opacity-90 disabled:opacity-50"
        >
          {confirming && method === "google" && !busy && <GoogleMark />}
          {busy ? "Deleting" : confirming && method === "google" ? "Continue with Google" : "Delete account"}
        </button>
      </div>
    </form>
  );
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}
