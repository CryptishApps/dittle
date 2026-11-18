import { useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, useNavigate, useRouter } from "@tanstack/react-router";
import { AnimatePresence, m } from "motion/react";
import { DropdownMenu } from "radix-ui";
import { lazy, Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { useDeviceModel, type DeviceModelStatus } from "@/features/ai/device-model";
import { loadAuth, type Account } from "@/lib/session";
import { ease, Kbd, MIcon } from "@/ui/kit";
import { Wordmark } from "@/ui/Wordmark";
import { startNote } from "./api";
import { MENU_CONTENT, MENU_ROW, MenuItem } from "./NoteTree";
import { OpenTabs } from "./OpenTabs";
import { SearchDialog, useSearchShortcut } from "./Search";
import { dismissToast, holdToast, useToast } from "./toast";

const DeleteAccountDialog = lazy(() => import("./DeleteAccount").then((module) => ({ default: module.DeleteAccountDialog })));

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

export function NotesShell({ account }: { account: Account }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const online = useOnline();
  const toast = useToast();
  const [leaving, setLeaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [deleteAccount, setDeleteAccount] = useState<"unopened" | "open" | "closed">("unopened");
  const accountButton = useRef<HTMLButtonElement>(null);
  const openSearch = useCallback(() => setSearching(true), []);
  useSearchShortcut(openSearch);

  const router = useRouter();
  useEffect(() => {
    const id = window.requestIdleCallback?.(() => {
      void router.loadRouteChunk(router.routesById["/_app/notes/$noteId"]);
      void router.loadRouteChunk(router.routesById["/_app/notes/collections/$collectionId"]);
    });
    return () => window.cancelIdleCallback?.(id);
  }, [router]);

  const newNote = () => void navigate({ to: "/notes/$noteId", params: { noteId: startNote(queryClient, account.uid) } });

  const signOut = async () => {
    setLeaving(true);
    await (await loadAuth()).signOut();
  };

  return (
    <div className="flex h-dvh flex-col bg-page">
      <header className="flex h-14 shrink-0 items-stretch gap-2 border-b border-line pr-3 pl-4 sm:gap-3 sm:pr-5 sm:pl-5">
        <Link to="/notes" aria-label="Dittle home" className="flex shrink-0 items-center rounded-lg">
          <Wordmark className="text-[18px] max-sm:[&>svg]:size-[22px] max-sm:text-[0px]" />
        </Link>
        <OpenTabs uid={account.uid} onNewNote={newNote} />
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {!online && (
            <span className="hidden h-8 items-center gap-2 rounded-lg border border-line px-3 text-[13px] text-soft lg:flex">
              <span aria-hidden className="size-1.5 rounded-full bg-faint" />
              Offline · saved on this device
            </span>
          )}
          <button
            type="button"
            onClick={openSearch}
            aria-label="Search"
            title="Search (Ctrl K or ⌘K)"
            className="flex h-9 items-center gap-2 rounded-[9px] px-2.5 text-[14px] text-soft transition-colors hover:bg-chip hover:text-ink max-sm:w-9 max-sm:justify-center sm:w-[200px] sm:border sm:border-line sm:px-3"
          >
            <MIcon name="search" className="size-4 shrink-0" />
            <span className="hidden sm:inline">Search</span>
            <span className="ml-auto hidden sm:inline-flex">
              <Kbd>⌘K</Kbd>
            </span>
          </button>
          <AccountMenu
            account={account}
            online={online}
            leaving={leaving}
            trigger={accountButton}
            onSignOut={() => void signOut()}
            onDeleteAccount={() => setDeleteAccount("open")}
          />
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-page">
        <Outlet />
      </main>

      <SearchDialog uid={account.uid} open={searching} onOpenChange={setSearching} />
      {deleteAccount !== "unopened" && (
        <Suspense>
          <DeleteAccountDialog
            uid={account.uid}
            online={online}
            open={deleteAccount === "open"}
            onOpenChange={(open) => setDeleteAccount(open ? "open" : "closed")}
            returnFocus={() => accountButton.current?.focus()}
          />
        </Suspense>
      )}

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
            className="fixed bottom-5 left-5 z-50 flex max-w-[calc(100vw-2.5rem)] flex-wrap items-center justify-end gap-x-2 gap-y-1 rounded-xl bg-card py-1.5 pr-1.5 pl-4 text-[14px] text-ink shadow-pop"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              {!toast.actions.some((action) => action.primary) && <MIcon name="check" className="size-4 shrink-0 text-soft" />}
              <span className="line-clamp-3 min-w-0 py-1.5 pr-1">{toast.text}</span>
            </span>
            {toast.actions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => {
                  dismissToast();
                  action.run?.();
                }}
                className={`h-8 shrink-0 rounded-lg px-3 text-[13px] font-semibold transition-colors ${action.primary ? "bg-ink text-page hover:opacity-85" : "text-ink hover:bg-chip"}`}
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
  account: Account;
  online: boolean;
  leaving: boolean;
  trigger: RefObject<HTMLButtonElement | null>;
  onSignOut: () => void;
  onDeleteAccount: () => void;
};

function AccountMenu({ account, online, leaving, trigger, onSignOut, onDeleteAccount }: AccountMenuProps) {
  const name = account.name || "Account";
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        ref={trigger}
        aria-label="Account and status"
        className="relative grid size-8 place-items-center rounded-full border border-line-strong bg-panel text-[13px] font-semibold text-soft uppercase transition-colors hover:bg-chip-hover hover:text-ink data-[state=open]:bg-chip-hover data-[state=open]:text-ink"
      >
        {name.charAt(0)}
        {!online && <span aria-hidden className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-page bg-faint" />}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className={`${MENU_CONTENT} w-[280px]`}>
          <DropdownMenu.Label className="truncate px-3 pt-2 pb-2 text-label text-soft">{name}</DropdownMenu.Label>
          <DropdownMenu.Separator className="mx-1 my-1 h-px bg-line" />
          <DropdownMenu.Item asChild>
            <Link to="/ai" className={MENU_ROW}>
              <DeviceModelStatus />
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Label className="flex items-center gap-2.5 px-3 py-2 text-soft">
            <span aria-hidden className={`size-1.5 rounded-full ${online ? "bg-ink" : "bg-faint"}`} />
            {online ? "Online · synced" : "Offline · saved on this device"}
          </DropdownMenu.Label>
          <DropdownMenu.Separator className="mx-1 my-1 h-px bg-line" />
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
  const dot = model.status === "available" ? "bg-ink" : "bg-faint";
  const percent = model.status === "downloading" && model.progress !== undefined ? ` ${Math.round(model.progress * 100)}%` : "";
  return (
    <>
      <span aria-hidden className={`size-1.5 rounded-full ${dot}`} />
      <span>
        Gemini Nano · {MODEL_LABEL[model.status]}
        {percent}
      </span>
      <MIcon name="right" className="ml-auto size-3.5" />
    </>
  );
}
