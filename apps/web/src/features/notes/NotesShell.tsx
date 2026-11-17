import { useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, useNavigate, useRouter } from "@tanstack/react-router";
import type { User } from "firebase/auth";
import { AnimatePresence, m } from "motion/react";
import { DropdownMenu } from "radix-ui";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { useDeviceModel, type DeviceModelStatus } from "@/features/ai/device-model";
import { loadAuth } from "@/lib/session";
import { Btn, ease, MIcon } from "@/ui/kit";
import { Wordmark } from "@/ui/Wordmark";
import { loadStore, startNote } from "./api";
import { DeleteAccountDialog } from "./DeleteAccount";
import { MENU_CONTENT, MenuItem } from "./NoteTree";
import { SearchDialog, useSearchShortcut } from "./Search";
import { dismissToast, holdToast, useToast } from "./toast";

const subscribeOnline = (onChange: () => void) => {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
};

export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine);
}

export function NotesShell({ user }: { user: User }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const online = useOnline();
  const toast = useToast();
  const [leaving, setLeaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const accountButton = useRef<HTMLButtonElement>(null);
  const openSearch = useCallback(() => setSearching(true), []);
  useSearchShortcut(openSearch);

  const router = useRouter();
  useEffect(() => {
    const id = window.requestIdleCallback?.(() => void router.loadRouteChunk(router.routesById["/_app/notes/$noteId"]));
    return () => window.cancelIdleCallback?.(id);
  }, [router]);

  const newNote = () => void navigate({ to: "/notes/$noteId", params: { noteId: startNote(queryClient, user.uid) } });

  const signOut = async () => {
    setLeaving(true);
    queryClient.clear();
    await (await loadStore()).forgetThisDevice();
    await (await loadAuth()).signOut();
    window.location.assign("/");
  };

  return (
    <div className="flex h-dvh flex-col bg-page">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-4 sm:px-6">
        <Link to="/notes" aria-label="Dittle home">
          <Wordmark className="text-[14px]" />
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {!online && (
            <span className="hidden items-center gap-2 text-[11.5px] text-soft sm:flex">
              <span aria-hidden className="size-1.5 bg-accent" />
              Offline · saved on this device
            </span>
          )}
          <button
            type="button"
            onClick={openSearch}
            aria-label="Search"
            title="Search (Ctrl K or ⌘K)"
            className="inline-flex h-7 items-center gap-2 border border-line-strong bg-card px-2.5 text-[11px] font-medium tracking-[0.02em] text-soft uppercase hover:border-ink hover:text-ink"
          >
            <MIcon name="search" className="size-3.5" />
            <span className="hidden sm:inline">Search</span>
          </button>
          <Btn primary onClick={newNote}>
            <MIcon name="plus" className="size-3.5" />
            New note
          </Btn>
          <AccountMenu
            user={user}
            online={online}
            leaving={leaving}
            trigger={accountButton}
            onSignOut={() => void signOut()}
            onDeleteAccount={() => setDeletingAccount(true)}
          />
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </main>

      <SearchDialog uid={user.uid} open={searching} onOpenChange={setSearching} />
      <DeleteAccountDialog user={user} online={online} open={deletingAccount} onOpenChange={setDeletingAccount} returnFocus={() => accountButton.current?.focus()} />

      <AnimatePresence>
        {toast && (
          <m.div
            key={toast.id}
            role="status"
            initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 6, transition: { duration: 0.15 } }}
            transition={{ duration: 0.3, ease }}
            onPointerEnter={() => holdToast(true)}
            onPointerLeave={() => holdToast(false)}
            onFocus={() => holdToast(true)}
            onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && holdToast(false)}
            className="fixed bottom-4 left-4 z-50 flex max-w-[calc(100vw-2rem)] flex-wrap items-center justify-end gap-x-4 gap-y-1.5 bg-ink py-2.5 pr-2.5 pl-4 text-[12.5px] text-page shadow-pop"
          >
            <span className="line-clamp-3 min-w-0">{toast.text}</span>
            {toast.actions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => {
                  dismissToast();
                  action.run?.();
                }}
                className={`shrink-0 px-2 py-1 text-[11px] tracking-[0.06em] uppercase ${action.primary ? "bg-page text-ink hover:opacity-90" : "hover:bg-page/15"}`}
              >
                {action.label}
              </button>
            ))}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type AccountMenuProps = {
  user: User;
  online: boolean;
  leaving: boolean;
  trigger: RefObject<HTMLButtonElement | null>;
  onSignOut: () => void;
  onDeleteAccount: () => void;
};

function AccountMenu({ user, online, leaving, trigger, onSignOut, onDeleteAccount }: AccountMenuProps) {
  const name = user.displayName ?? user.email ?? "Account";
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        ref={trigger}
        aria-label="Account and status"
        className="relative grid size-7 place-items-center border border-line-strong bg-card text-[11px] font-medium text-ink uppercase hover:border-ink data-[state=open]:border-ink"
      >
        {name.charAt(0)}
        {!online && <span aria-hidden className="absolute -top-0.5 -right-0.5 size-1.5 bg-accent" />}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className={`${MENU_CONTENT} w-[260px] text-[12px]`}>
          <DropdownMenu.Label className="truncate px-2.5 pt-1.5 pb-2 text-faint">{name}</DropdownMenu.Label>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item asChild>
            <Link to="/ai" className="flex items-center gap-2 px-2.5 py-1.5 text-soft outline-none data-[highlighted]:bg-panel data-[highlighted]:text-ink">
              <DeviceModelStatus />
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Label className="flex items-center gap-2 px-2.5 py-1.5 text-soft">
            <span aria-hidden className={`size-1.5 ${online ? "bg-ink" : "bg-accent"}`} />
            {online ? "Online · synced" : "Offline · saved on this device"}
          </DropdownMenu.Label>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <MenuItem onSelect={onSignOut}>{leaving ? "Signing out" : "Sign out"}</MenuItem>
          <MenuItem onSelect={onDeleteAccount} danger>
            Delete account
          </MenuItem>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

const MODEL_LABEL: Record<DeviceModelStatus, string> = {
  checking: "Checking",
  "no-api": "Cloud only in this browser",
  unavailable: "Cloud only on this device",
  downloadable: "Not downloaded",
  downloading: "Downloading",
  available: "Ready",
};

function DeviceModelStatus() {
  const model = useDeviceModel();
  const dot = model.status === "available" ? "bg-ink" : model.status === "downloadable" ? "bg-accent" : "bg-faint";
  const percent = model.status === "downloading" && model.progress !== undefined ? ` ${Math.round(model.progress * 100)}%` : "";
  return (
    <>
      <span aria-hidden className={`size-1.5 ${dot}`} />
      <span>
        Gemini Nano · {MODEL_LABEL[model.status]}
        {percent}
      </span>
      <MIcon name="right" className="ml-auto size-3" />
    </>
  );
}
