import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { createSyncedValueStore } from "@/features/editor/values";
import { writes } from "@/features/notes/api";
import { btnClass, Kbd, MIcon } from "@/ui/kit";
import { capture, type CaptureContext, type Destination, type Detail } from "./apply";
import { CaptureIcon } from "./icons";
import { ImageDropZone, MicButton } from "./media-input";
import { finishReceipt, startReceipt, undoReceipt, useReceipts, type Receipt } from "./receipts";
import { sampleText, type Sample } from "./sample-clips";
import { Samples } from "./Samples";
import { PasteView, type Paste } from "./PasteView";

export function CaptureBox({ uid, onStartNote }: { uid: string; onStartNote: (title: string) => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const store = useMemo(() => createSyncedValueStore(queryClient, uid, writes), [queryClient, uid]);
  const context: CaptureContext = useMemo(() => ({ queryClient, uid, store }), [queryClient, uid, store]);
  const [paste, setPaste] = useState<Paste | null>(null);
  const [text, setText] = useState("");
  const receipts = useReceipts();

  const openNote = (noteId: string) => void navigate({ to: "/notes/$noteId", params: { noteId } });

  const take = (raw: string) => {
    const text = raw.trim();
    if (!text) return onStartNote("");
    if (text.includes("\n")) return setPaste({ text });
    const id = startReceipt(text);
    void capture(context, text).then(
      (outcome) => {
        finishReceipt(id, outcome);
        if (outcome.open) openNote(outcome.open);
      },
      (error: unknown) => console.error("Dittle could not save a capture", error),
    );
  };

  const trySample = (sample: Sample) => setPaste({ text: sampleText(sample), sample });

  if (paste) {
    return (
      <PasteView
        key={paste.text}
        paste={paste}
        context={context}
        onSample={trySample}
        onClose={() => setPaste(null)}
        onSaved={(said, outcome, edit) => {
          setPaste(null);
          finishReceipt(startReceipt(said), outcome);
          if (edit) openNote(outcome.noteId);
        }}
      />
    );
  }

  return (
    <section aria-label="Capture" className="group/capture mx-auto w-full max-w-[700px]">
      <ImageDropZone onText={take}>
        <CaptureInput text={text} onText={setText} onSubmit={take} onPasteLines={(lines) => setPaste({ text: lines })} mic={<MicButton onText={take} />} />
      </ImageDropZone>
      <div className="@container mt-2.5 min-h-5">
        {!text && <CaptureHints onSample={trySample} />}
      </div>
      {receipts.length > 0 && <Receipts receipts={receipts} />}
    </section>
  );
}

const SHOW_ON_FOCUS =
  "invisible opacity-0 group-focus-within/capture:visible group-focus-within/capture:opacity-100 group-has-[[data-mic-busy]]/capture:invisible group-has-[[data-mic-busy]]/capture:opacity-0 motion-safe:transition-[opacity,visibility] motion-safe:duration-200 [@media(hover:hover)]:group-hover/capture:visible [@media(hover:hover)]:group-hover/capture:opacity-100";

function CaptureHints({ onSample }: { onSample: (sample: Sample) => void }) {
  return (
    <div className={`flex items-baseline justify-between gap-x-6 px-1 text-[13px] text-faint ${SHOW_ON_FOCUS}`}>
      <p className="hidden items-baseline gap-x-1.5 whitespace-nowrap @min-[600px]:flex [@media(pointer:coarse)]:hidden">
        <span>Paste a chat or list</span>
        <span aria-hidden>·</span>
        <span>drop a screenshot</span>
        <span aria-hidden>·</span>
        <span>
          hold <kbd className="rounded-[5px] px-1.5 font-sans text-[12px] shadow-[inset_0_0_0_1px_var(--line-strong)]">M</kbd> to talk
        </span>
      </p>
      <Samples onSample={onSample} lead="Try" className="text-[13px] whitespace-nowrap" />
    </div>
  );
}

function CaptureInput({
  text,
  onText,
  onSubmit,
  onPasteLines,
  mic,
}: {
  text: string;
  onText: (text: string) => void;
  onSubmit: (text: string) => void;
  onPasteLines: (text: string) => void;
  mic: ReactNode;
}) {
  const filing = text.trim().length > 0;
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(text);
        onText("");
      }}
      className="group/box mt-3.5 flex h-14 items-center gap-1 rounded-2xl bg-card pr-2 pl-4 shadow-[inset_0_0_0_1px_var(--line-strong),0_1px_2px_rgb(18_20_24/0.04),0_10px_24px_-18px_rgb(18_20_24/0.25)] focus-within:shadow-[inset_0_0_0_1.5px_var(--ink),0_0_0_4px_var(--chip)] motion-safe:transition-shadow motion-safe:duration-200"
    >
      <CaptureIcon name="pen" className="size-[18px] shrink-0 text-faint max-sm:hidden group-focus-within/box:text-ink motion-safe:transition-colors" />
      <input
        value={text}
        onChange={(event) => onText(event.target.value)}
        onPaste={(event) => {
          const pasted = event.clipboardData.getData("text/plain");
          if (!pasted.trim().includes("\n")) return;
          event.preventDefault();
          onPasteLines(`${text}${pasted}`.trim());
          onText("");
        }}
        placeholder="New note, or jot something down"
        aria-label="New note, or jot something down"
        className="h-full min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-faint sm:pl-2.5 sm:text-[16.5px]"
        style={{ outline: "none" }}
      />
      {mic}
      <button
        type="submit"
        className={`flex h-9 shrink-0 items-center gap-2 rounded-[10px] max-sm:w-9 max-sm:justify-center sm:pr-2 sm:pl-3 text-[13.5px] font-medium motion-safe:transition-colors ${filing ? "bg-ink text-page hover:opacity-90" : "text-soft hover:bg-chip hover:text-ink"}`}
      >
        <span className="max-sm:sr-only">{filing ? "File" : "New note"}</span>
        <kbd aria-hidden className={`grid h-5 min-w-5 place-items-center rounded-[5px] font-sans shadow-[inset_0_0_0_1px_currentColor] max-sm:hidden [@media(pointer:coarse)]:hidden ${filing ? "opacity-60" : "text-faint opacity-70"}`}>
          <CaptureIcon name="enter" className="size-3" />
        </kbd>
        {filing ? <CaptureIcon name="arrow" className="size-[18px] sm:hidden" /> : <MIcon name="plus" className="size-[18px] sm:hidden" />}
      </button>
    </form>
  );
}

function Receipts({ receipts }: { receipts: Receipt[] }) {
  return (
    <div className="mt-6">
      <h2 className="text-[13px] font-semibold tracking-[0.01em] text-faint">Just now</h2>
      <ul className="mt-1">
        {receipts.map((receipt) => (
          <ReceiptRow key={receipt.id} receipt={receipt} />
        ))}
      </ul>
    </div>
  );
}

const WORKING = "Working out where this goes…";

function ReceiptRow({ receipt }: { receipt: Receipt }) {
  const { outcome, state } = receipt;
  return (
    <li className="flex items-start gap-3.5 border-b border-line px-1 py-3.5 last:border-b-0" aria-busy={state === "working"}>
      <span className="grid size-[30px] shrink-0 place-items-center rounded-lg bg-chip text-soft">
        {outcome ? <CaptureIcon name={outcome.icon} className="size-[18px]" /> : <span className="size-1.5 animate-pulse rounded-full bg-faint" />}
      </span>
      <div className={`min-w-0 flex-1 ${state === "undone" ? "opacity-50" : ""}`}>
        <p className="text-[15px] break-words text-ink">“{receipt.said}”</p>
        {outcome ? (
          <p className="mt-0.5 text-[14px] leading-relaxed text-faint">
            {state === "undone" ? "Undone · " : ""}
            {outcome.lead} <PlaceLink to={outcome.to}>{outcome.place}</PlaceLink>
            {outcome.details.map((detail, index) => (
              <span key={index}>
                {" · "}
                <DetailText detail={detail} />
              </span>
            ))}
          </p>
        ) : (
          <p className="mt-0.5 text-[14px]">
            <span className="t-shimmer-text" data-text={WORKING}>
              {WORKING}
            </span>
          </p>
        )}
      </div>
      {state === "done" && (
        <button type="button" onClick={() => undoReceipt(receipt.id)} className="shrink-0 rounded-md px-1.5 pt-1 text-[13.5px] font-medium text-soft transition-colors hover:text-ink">
          Undo
        </button>
      )}
    </li>
  );
}

function PlaceLink({ to, children }: { to?: Destination; children: ReactNode }) {
  const className = "font-medium text-soft transition-colors hover:text-ink";
  if (!to) return <span className={className}>{children}</span>;
  if ("note" in to) {
    return (
      <Link to="/notes/$noteId" params={{ noteId: to.note }} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <Link to="/notes/collections/$collectionId" params={{ collectionId: to.collection }} className={className}>
      {children}
    </Link>
  );
}

function DetailText({ detail }: { detail: Detail }) {
  return (
    <>
      {detail.label && `${detail.label} `}
      {detail.was !== undefined && (
        <>
          <s className="text-faint decoration-line-strong">{detail.was}</s>{" "}
        </>
      )}
      {detail.was !== undefined ? (
        <span className="font-semibold text-accent-ink">{detail.text}</span>
      ) : detail.value ? (
        <span className="rounded-[5px] bg-accent-tint px-1 py-px font-medium text-accent-ink">{detail.text}</span>
      ) : (
        detail.text
      )}
    </>
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
