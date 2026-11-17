import { useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, useNavigate, useRouter } from "@tanstack/react-router";
import type { User } from "firebase/auth";
import { AnimatePresence, m } from "motion/react";
import { DropdownMenu } from "radix-ui";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useDeviceModel, type DeviceModelStatus } from "@/features/ai/device-model";
import { loadAuth } from "@/lib/session";
import { Btn, ease, MIcon } from "@/ui/kit";
import { Wordmark } from "@/ui/Wordmark";
import { loadStore, startNote } from "./api";
import { MENU_CONTENT, MenuItem } from "./NoteTree";
import { dismissToast, useToast } from "./toast";

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
          <Btn primary onClick={newNote}>
            <MIcon name="plus" className="size-3.5" />
            New note
          </Btn>
          <AccountMenu user={user} online={online} leaving={leaving} onSignOut={() => void signOut()} />
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </main>

      <AnimatePresence>
        {toast && (
          <m.div
            key={toast.id}
            role="status"
            initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 6, transition: { duration: 0.15 } }}
            transition={{ duration: 0.3, ease }}
            className="fixed bottom-4 left-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-4 bg-ink py-2.5 pr-2.5 pl-4 text-[12.5px] text-page shadow-pop"
          >
            <span className="truncate">{toast.text}</span>
            {toast.undo && (
              <button
                type="button"
                onClick={() => {
                  toast.undo?.();
                  dismissToast();
                }}
                className="shrink-0 px-2 py-1 text-[11px] tracking-[0.06em] uppercase hover:bg-page/15"
              >
                Undo
              </button>
            )}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AccountMenu({ user, online, leaving, onSignOut }: { user: User; online: boolean; leaving: boolean; onSignOut: () => void }) {
  const name = user.displayName ?? user.email ?? "Account";
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-label="Account and status"
        className="relative grid size-7 place-items-center border border-line-strong bg-card text-[11px] font-medium text-ink uppercase hover:border-ink data-[state=open]:border-ink"
      >
        {name.charAt(0)}
        {!online && <span aria-hidden className="absolute -top-0.5 -right-0.5 size-1.5 bg-accent" />}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className={`${MENU_CONTENT} w-[260px] text-[12px]`}>
          <p className="truncate px-2.5 pt-1.5 pb-2 text-faint">{name}</p>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item asChild>
            <Link to="/ai" className="flex items-center gap-2 px-2.5 py-1.5 text-soft outline-none data-[highlighted]:bg-panel data-[highlighted]:text-ink">
              <DeviceModelStatus />
            </Link>
          </DropdownMenu.Item>
          <p className="flex items-center gap-2 px-2.5 py-1.5 text-soft">
            <span aria-hidden className={`size-1.5 ${online ? "bg-ink" : "bg-accent"}`} />
            {online ? "Online · synced" : "Offline · saved on this device"}
          </p>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <MenuItem onSelect={onSignOut}>{leaving ? "Signing out" : "Sign out"}</MenuItem>
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
