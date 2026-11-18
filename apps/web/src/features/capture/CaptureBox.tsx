import { useState, type ReactNode } from "react";
import { btnClass, Kbd, MIcon } from "@/ui/kit";
import { ImageDropZone, MicButton } from "./media-input";

export function CaptureBox({ onStartNote }: { uid: string; onStartNote: (title: string) => void }) {
  return (
    <ImageDropZone onText={onStartNote}>
      <StartNote onStart={onStartNote} mic={<MicButton onText={onStartNote} />} />
    </ImageDropZone>
  );
}

export function StartNote({ onStart, autoFocus = false, mic }: { onStart: (title: string) => void; autoFocus?: boolean; mic?: ReactNode }) {
  const [title, setTitle] = useState("");
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onStart(title.trim());
      }}
      className="flex h-16 items-center gap-3 rounded-[20px] bg-card pr-2.5 pl-6 shadow-[0_0_0_1px_var(--line),0_20px_30px_-24px_rgb(18_20_24/0.3)] transition-shadow focus-within:shadow-[0_0_0_2px_var(--accent),0_0_0_6px_var(--accent-tint)]"
    >
      <input
        autoFocus={autoFocus}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Start a note"
        aria-label="Start a note with this title"
        className="h-full min-w-0 flex-1 bg-transparent text-[18px] text-ink outline-none placeholder:text-faint"
        style={{ outline: "none" }}
      />
      {mic}
      <span className="hidden sm:inline-flex">
        <Kbd>Enter</Kbd>
      </span>
      <button type="submit" className={btnClass({ variant: "primary", size: "md" })}>
        <MIcon name="plus" className="size-4" />
        <span className="max-sm:sr-only">New note</span>
      </button>
    </form>
  );
}

