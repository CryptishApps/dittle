import { Link } from "@tanstack/react-router";
import { AnimatePresence, m } from "motion/react";
import { DropdownMenu } from "radix-ui";
import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { ease, MIcon } from "@/ui/kit";
import { writes } from "./api";
import type { Folder, NoteSummary } from "./store";

const NOTE_DRAG_TYPE = "application/x-dittle-note";
const COLLAPSED_KEY = "dittle.collapsedFolders";

const ago = new Intl.RelativeTimeFormat("en", { numeric: "auto", style: "narrow" });
const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

function edited(at: number): string {
  const minutes = Math.round((Date.now() - at) / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return ago.format(-minutes, "minute");
  if (minutes < 24 * 60) return ago.format(-Math.round(minutes / 60), "hour");
  return day.format(at);
}

function readCollapsed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function saveCollapsed(ids: Set<string>) {
  try {
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...ids]));
  } catch {}
}

type NoteTreeProps = {
  uid: string;
  notes: NoteSummary[];
  folders: Folder[];
  creatingFolder: boolean;
  onFolderCreated: () => void;
  onNewNote: (folderId: string | null) => void;
  onDeleteNote: (note: NoteSummary) => void;
  onDeleteFolder: (folder: Folder) => void;
};

export function NoteTree({ uid, notes, folders, creatingFolder, onFolderCreated, onNewNote, onDeleteNote, onDeleteFolder }: NoteTreeProps) {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [dropTarget, setDropTarget] = useState<string | null>();
  const known = new Set(folders.map((folder) => folder.id));
  const loose = notes.filter((note) => !note.folderId || !known.has(note.folderId));

  const toggle = (id: string) => {
    const next = new Set(collapsed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCollapsed(next);
    saveCollapsed(next);
  };

  const dropProps = (folderId: string | null) => ({
    onDragOver: (event: DragEvent) => {
      if (!event.dataTransfer.types.includes(NOTE_DRAG_TYPE)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setDropTarget(folderId);
    },
    onDragLeave: () => setDropTarget(undefined),
    onDrop: (event: DragEvent) => {
      const noteId = event.dataTransfer.getData(NOTE_DRAG_TYPE);
      setDropTarget(undefined);
      if (noteId) writes.moveNote(uid, noteId, folderId);
    },
  });

  const card = (note: NoteSummary) => (
    <NoteCard key={note.id} note={note} folders={folders} onMove={(folderId) => writes.moveNote(uid, note.id, folderId)} onDelete={() => onDeleteNote(note)} />
  );

  if (notes.length === 0 && folders.length === 0 && !creatingFolder) {
    return <p className="tile px-6 py-5 text-[15px] leading-[1.7] text-soft">No notes yet. Start one and it saves as you type, even offline.</p>;
  }

  return (
    <ul className="space-y-8">
      {creatingFolder && (
        <li className="folder p-4">
          <FolderNameInput
            initial=""
            onDone={(name) => {
              if (name) writes.createFolder(uid, name);
              onFolderCreated();
            }}
          />
        </li>
      )}
      <AnimatePresence initial={false}>
        {folders.map((folder) => {
          const inside = notes.filter((note) => note.folderId === folder.id);
          const open = !collapsed.has(folder.id);
          return (
            <m.li
              key={folder.id}
              layout="position"
              transition={{ duration: 0.25, ease }}
              {...dropProps(folder.id)}
              className={`folder px-3 pt-2 pb-3 transition-shadow sm:px-4 sm:pb-4 ${dropTarget === folder.id ? "shadow-[0_0_0_2px_var(--accent)]" : ""}`}
            >
              <FolderRow
                folder={folder}
                count={inside.length}
                open={open}
                dropping={dropTarget === folder.id}
                onToggle={() => toggle(folder.id)}
                onNewNote={() => onNewNote(folder.id)}
                onRename={(name) => writes.renameFolder(uid, folder.id, name)}
                onDelete={() => onDeleteFolder(folder)}
              />
              <AnimatePresence initial={false}>
                {open && (
                  <m.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease }}
                    className="grid gap-3 overflow-hidden p-0.5 pt-1 sm:grid-cols-2 lg:grid-cols-3"
                  >
                    <AnimatePresence initial={false}>{inside.map(card)}</AnimatePresence>
                    {inside.length === 0 && <li className="rounded-[18px] border border-dashed border-line-strong px-4 py-5 text-[14px] text-faint">Empty. Drag a note here.</li>}
                  </m.ul>
                )}
              </AnimatePresence>
              {!open && inside[0] && (
                <div aria-hidden className="relative mx-1 mt-1 h-14">
                  <span className="absolute inset-x-6 top-0 h-11 rotate-[-1.5deg] rounded-xl bg-card/70 shadow-[0_0_0_1px_var(--line)]" />
                  <span className="absolute inset-x-2 top-2 flex h-11 items-center truncate rounded-xl bg-card px-4 text-[14px] text-soft shadow-[0_0_0_1px_var(--line)]">{inside[0].title || "Untitled"}</span>
                </div>
              )}
            </m.li>
          );
        })}
      </AnimatePresence>
      {(folders.length > 0 || creatingFolder) && (
        <li {...dropProps(null)} className={`-mb-3 rounded-xl px-1 py-1 text-[15px] font-semibold text-soft transition-colors ${dropTarget === null ? "bg-accent-tint text-accent-ink" : ""}`}>
          Not in a folder
        </li>
      )}
      {loose.length > 0 && (
        <li>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence initial={false}>{loose.map(card)}</AnimatePresence>
          </ul>
        </li>
      )}
    </ul>
  );
}

function FolderNameInput({ initial, onDone }: { initial: string; onDone: (name: string) => void }) {
  const [name, setName] = useState(initial);
  const finished = useRef(false);
  const finish = (value: string) => {
    if (finished.current) return;
    finished.current = true;
    onDone(value.trim());
  };
  return (
    <input
      autoFocus
      value={name}
      placeholder="Folder name"
      aria-label="Folder name"
      onChange={(event) => setName(event.target.value)}
      onBlur={() => finish(name)}
      onKeyDown={(event) => {
        if (event.key === "Enter") finish(name);
        if (event.key === "Escape") finish(initial);
      }}
      className="h-10 w-full rounded-xl border border-accent bg-card px-3 text-[14.5px] ring-[3px] ring-accent-tint outline-none placeholder:text-faint"
    />
  );
}

function FolderRow({
  folder,
  count,
  open,
  dropping,
  onToggle,
  onNewNote,
  onRename,
  onDelete,
}: {
  folder: Folder;
  count: number;
  open: boolean;
  dropping: boolean;
  onToggle: () => void;
  onNewNote: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [renaming, setRenaming] = useState(false);

  if (renaming) {
    return (
      <div className="py-1.5">
        <FolderNameInput
          initial={folder.name}
          onDone={(name) => {
            if (name && name !== folder.name) onRename(name);
            setRenaming(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className={`group relative flex items-center rounded-xl transition-colors ${dropping ? "text-accent-ink" : ""}`}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl py-2.5 pr-20 pl-1.5 text-left">
        <MIcon name="chevron" className={`size-4 shrink-0 text-faint transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
        <span className="truncate text-[19px] font-semibold tracking-[-0.02em] text-ink">{folder.name}</span>
        <span className="shrink-0 text-[14px] text-soft tabular-nums">
          {count} {count === 1 ? "note" : "notes"}
        </span>
      </button>
      <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100">
        <button type="button" onClick={onNewNote} aria-label={`New note in ${folder.name}`} className="grid size-8 place-items-center rounded-lg text-soft hover:bg-chip-hover hover:text-ink">
          <MIcon name="plus" className="size-4" />
        </button>
        <RowMenu label={`More actions for ${folder.name}`}>
          <MenuItem onSelect={onNewNote}>New note here</MenuItem>
          <MenuItem onSelect={() => setRenaming(true)}>Rename</MenuItem>
          <MenuItem onSelect={onDelete} danger>
            Delete folder
          </MenuItem>
        </RowMenu>
      </div>
    </div>
  );
}

function NoteCard({ note, folders, onMove, onDelete }: { note: NoteSummary; folders: Folder[]; onMove: (folderId: string | null) => void; onDelete: () => void }) {
  return (
    <m.li
      layout="position"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.24, ease }}
      className="group relative list-none"
    >
      <Link
        to="/notes/$noteId"
        params={{ noteId: note.id }}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData(NOTE_DRAG_TYPE, note.id);
          event.dataTransfer.effectAllowed = "move";
        }}
        className="flex h-full min-h-[132px] flex-col rounded-[18px] bg-card px-5 pt-4 pb-4.5 shadow-[0_0_0_1px_var(--line),0_1px_2px_rgb(18_20_24/0.04)] transition-shadow hover:shadow-tile [&.active]:shadow-[0_0_0_2px_var(--accent)]"
      >
        <span className="flex items-baseline justify-between gap-3 pr-7">
          <span className={`truncate text-[16.5px] font-semibold tracking-[-0.01em] ${note.title ? "text-ink" : "text-faint"}`}>{note.title || "Untitled"}</span>
          <span className="shrink-0 text-[13px] text-faint">{edited(note.updatedAt)}</span>
        </span>
        {note.preview && <span className="mt-1.5 line-clamp-3 text-[14.5px] leading-[1.65] text-soft">{note.preview}</span>}
      </Link>
      <div className="absolute top-2.5 right-2.5 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100">
        <RowMenu label={`More actions for ${note.title || "Untitled"}`}>
          {folders.length > 0 && (
            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger className={`${MENU_ROW} justify-between data-[state=open]:bg-panel`}>
                Move to
                <MIcon name="right" className="size-3.5" />
              </DropdownMenu.SubTrigger>
              <DropdownMenu.Portal>
                <DropdownMenu.SubContent sideOffset={4} className={MENU_CONTENT}>
                  {folders.map((folder) => (
                    <MenuItem key={folder.id} onSelect={() => onMove(folder.id)} current={note.folderId === folder.id}>
                      {folder.name}
                    </MenuItem>
                  ))}
                  <DropdownMenu.Separator className="mx-1 my-1 h-px bg-line" />
                  <MenuItem onSelect={() => onMove(null)} current={!note.folderId}>
                    Not in a folder
                  </MenuItem>
                </DropdownMenu.SubContent>
              </DropdownMenu.Portal>
            </DropdownMenu.Sub>
          )}
          <MenuItem onSelect={onDelete} danger>
            Delete note
          </MenuItem>
        </RowMenu>
      </div>
    </m.li>
  );
}

export const MENU_CONTENT =
  "z-50 min-w-[200px] rounded-2xl bg-card p-1.5 text-[14px] shadow-pop data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95";

export const MENU_ROW = "flex cursor-pointer items-center gap-2.5 rounded-[10px] px-3 py-2 font-medium outline-none data-[highlighted]:bg-panel";

export function RowMenu({ label, children }: { label: string; children: ReactNode }) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger aria-label={label} className="grid size-8 place-items-center rounded-lg text-soft hover:bg-chip-hover hover:text-ink data-[state=open]:bg-chip-hover data-[state=open]:text-ink">
        <svg viewBox="0 0 16 16" aria-hidden className="size-4 fill-current">
          <circle cx="3" cy="8" r="1.3" />
          <circle cx="8" cy="8" r="1.3" />
          <circle cx="13" cy="8" r="1.3" />
        </svg>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className={MENU_CONTENT}>
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function MenuItem({ onSelect, danger, current, children }: { onSelect: () => void; danger?: boolean; current?: boolean; children: ReactNode }) {
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      disabled={current}
      className={`${MENU_ROW} justify-between data-[disabled]:cursor-default data-[disabled]:text-faint ${danger ? "text-danger data-[highlighted]:bg-danger-tint" : ""}`}
    >
      {children}
      {current && <MIcon name="check" className="size-4 text-accent-ink" />}
    </DropdownMenu.Item>
  );
}
