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

const TODAY = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" });

export function CaptureBox({ uid, onStartNote }: { uid: string; onStartNote: (title: string) => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const store = useMemo(() => createSyncedValueStore(queryClient, uid, writes), [queryClient, uid]);
  const context: CaptureContext = useMemo(() => ({ queryClient, uid, store }), [queryClient, uid, store]);
  const [paste, setPaste] = useState<Paste | null>(null);
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
    <section aria-label="Capture" className="mx-auto w-full max-w-[700px]">
      <p className="text-[14px] text-faint">{TODAY.format(new Date())}</p>
      <ImageDropZone onText={take}>
        <CaptureInput onSubmit={take} onPasteLines={(text) => setPaste({ text })} mic={<MicButton onText={take} />} />
      </ImageDropZone>
      <p className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-faint">
        <span>Type anything</span>
        <span>⌘V paste a chat or list</span>
        <span>Drop a screenshot</span>
        <span>
          Hold <span className="rounded-[5px] border border-line-strong px-1.5 text-[12px]">M</span> to talk
        </span>
      </p>
      {receipts.length > 0 ? <Receipts receipts={receipts} /> : <Samples onSample={trySample} className="mt-4" />}
    </section>
  );
}

function CaptureInput({ onSubmit, onPasteLines, mic }: { onSubmit: (text: string) => void; onPasteLines: (text: string) => void; mic: ReactNode }) {
  const [text, setText] = useState("");
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(text);
        setText("");
      }}
      className="mt-3.5 flex h-[52px] items-center gap-2.5 rounded-xl bg-card pr-2 pl-[18px] shadow-[inset_0_0_0_1px_var(--line-strong)] transition-shadow focus-within:shadow-[inset_0_0_0_1.5px_var(--ink)]"
    >
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        onPaste={(event) => {
          const pasted = event.clipboardData.getData("text/plain");
          if (!pasted.trim().includes("\n")) return;
          event.preventDefault();
          onPasteLines(`${text}${pasted}`.trim());
          setText("");
        }}
        placeholder="New note, or jot something down"
        aria-label="New note, or jot something down"
        className="h-full min-w-0 flex-1 bg-transparent text-[16.5px] text-ink outline-none placeholder:text-faint"
        style={{ outline: "none" }}
      />
      {mic}
      <button type="submit" className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-faint transition-colors hover:bg-chip hover:text-ink">
        <CaptureIcon name="enter" className="size-3.5" />
        {text.trim() ? "File" : "New note"}
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
