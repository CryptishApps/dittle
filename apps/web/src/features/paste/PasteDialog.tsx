import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Dialog } from "radix-ui";
import { useRef, useState, type ReactNode } from "react";
import type { UpdateResult } from "@/features/ai/update";
import { nameOf } from "@/features/editor/EditValue";
import { notesQuery, startNote, valuesQuery } from "@/features/notes/api";
import type { StoredValue } from "@/features/notes/fact";
import type { NoteDoc } from "@/features/notes/note-doc";
import { showToast } from "@/features/notes/toast";
import { Btn, MIcon } from "@/ui/kit";
import { SpinCheck } from "@/ui/SpinCheck";
import { applyPlan } from "./apply";
import { fileData, isReadable, MAX_FILE_BYTES, FILE_TYPES, type PasteInput } from "./files";
import { planUpdates, trackedOptions, type ChosenUpdate } from "./plan";

type Read = UpdateResult & { ids: string[]; from: { text: string } | { fileName: string } };
type Step = { at: "input" } | { at: "reading" } | { at: "review"; read: Read } | { at: "error"; message: string };

const LABEL = "text-[13px] text-faint";
const megabytes = (bytes: number) => `${Math.round(bytes / (1024 * 1024))} MB`;

export function PasteDialog({ uid, input, onClose }: { uid: string; input: PasteInput | undefined; onClose: () => void }) {
  return (
    <Dialog.Root open={input !== undefined} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-page/70 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-[8vh] left-1/2 z-50 flex max-h-[84vh] w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-pop data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          {input && <PasteBody uid={uid} initial={input} onClose={onClose} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PasteBody({ uid, initial, onClose }: { uid: string; initial: PasteInput; onClose: () => void }) {
  const { data: values } = useSuspenseQuery(valuesQuery(uid));
  const { data: notes } = useSuspenseQuery(notesQuery(uid));
  const [text, setText] = useState(initial.text ?? "");
  const [file, setFile] = useState<File | undefined>(initial.file);
  const [step, setStep] = useState<Step>({ at: "input" });
  const picker = useRef<HTMLInputElement>(null);
  const fileProblem = file && !isReadable(file) ? (FILE_TYPES.includes(file.type) ? `Files can be up to ${megabytes(MAX_FILE_BYTES)}.` : "Dittle reads PNG, JPEG and WebP photos and PDFs.") : undefined;
  const ready = file ? !fileProblem : text.trim().length > 0;

  const read = async () => {
    if (!ready || step.at === "reading") return;
    setStep({ at: "reading" });
    try {
      const { ids, tracked } = trackedOptions(values, notes);
      const { readFileUpdate, readPastedUpdate } = await import("@/features/ai/update");
      const result = file
        ? { ...(await readFileUpdate({ file: await fileData(file), tracked })), from: { fileName: file.name } }
        : { ...(await readPastedUpdate({ message: text.trim(), tracked })), from: { text: text.trim() } };
      setStep({ at: "review", read: { ...result, ids } });
    } catch (error) {
      setStep({ at: "error", message: error instanceof Error ? error.message : String(error) });
    }
  };

  const pick = (picked: File | undefined) => {
    if (picked) setFile(picked);
  };

  if (step.at === "review") {
    return <Review uid={uid} read={step.read} values={values} notes={notes} onBack={() => setStep({ at: "input" })} onClose={onClose} />;
  }

  return (
    <>
      <Head title="Update your plan" />
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2 text-[14px]">
        <p className="text-soft">Paste an email or message from a supplier, or upload a photo or PDF of a quote. Dittle checks it against the values you track and shows what would change.</p>
        {file ? (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
            <MIcon name="file" className="size-4 shrink-0 text-soft" />
            <span className="min-w-0 flex-1 truncate">{file.name}</span>
            <span className="text-faint tabular-nums">{Math.max(1, Math.round(file.size / 1024))} KB</span>
            <button type="button" onClick={() => setFile(undefined)} aria-label={`Remove ${file.name}`} className="grid size-6 place-items-center rounded-md text-soft hover:bg-chip hover:text-ink">
              <MIcon name="close" className="size-3.5" />
            </button>
          </div>
        ) : (
          <textarea
            autoFocus
            value={text}
            onChange={(event) => setText(event.target.value)}
            onPaste={(event) => {
              const pasted = [...event.clipboardData.files].find((item) => FILE_TYPES.includes(item.type));
              if (!pasted) return;
              event.preventDefault();
              pick(pasted);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void read();
            }}
            rows={9}
            aria-label="Message to read"
            placeholder="Hi, we can now do £42 a head, and we'd need the deposit by 30 May."
            className="mt-4 block w-full resize-y rounded-xl border border-line bg-card px-3.5 py-3 leading-[1.6] outline-none placeholder:text-faint focus:border-ink"
          />
        )}
        {fileProblem && <p className="mt-2 text-accent-ink">{fileProblem}</p>}
        <input ref={picker} type="file" accept={FILE_TYPES.join(",")} className="hidden" onChange={(event) => pick(event.target.files?.[0])} />
        {!file && (
          <button type="button" onClick={() => picker.current?.click()} className="mt-3 inline-flex items-center gap-1.5 text-[14px] text-soft hover:text-ink">
            <MIcon name="plus" className="size-3.5" />
            Upload a photo or PDF
          </button>
        )}
        <p className="mt-4 rounded-xl bg-panel px-3.5 py-3 leading-[1.6] text-soft">
          {file
            ? "The file goes to Gemini in the cloud through Firebase, with the list of values you track (their text, names and note titles). Nothing changes until you choose."
            : "The text goes to Gemini in the cloud through Firebase, with the list of values you track (their text, names and note titles). Offline, Gemini Nano reads it on this computer instead. Nothing changes until you choose."}
        </p>
        {step.at === "error" && <p className="mt-3 text-accent-ink">Dittle couldn't read it: {step.message}</p>}
      </div>
      <Foot>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn primary onClick={() => void read()} className={ready && step.at !== "reading" ? "" : "pointer-events-none opacity-50"}>
          {step.at === "reading" ? (
            <>
              <SpinCheck className="-my-1 -ml-1 size-4" />
              Reading
            </>
          ) : (
            "Check for changes"
          )}
        </Btn>
      </Foot>
    </>
  );
}

type ReviewProps = {
  uid: string;
  read: Read;
  values: StoredValue[];
  notes: { id: string; title: string; valueIds: string[] }[];
  onBack: () => void;
  onClose: () => void;
};

function Review({ uid, read, values, notes, onBack, onClose }: ReviewProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileName = "fileName" in read.from ? read.from.fileName : undefined;
  const fromFile = fileName !== undefined;
  const applicable = read.updates.filter((update) => !update.blocked);
  const [chosen, setChosen] = useState<Set<number>>(() => new Set(fromFile ? [] : applicable.map((update) => update.tracked)));
  const [saveNote, setSaveNote] = useState(read.additions.length > 0);
  const valueOf = (tracked: number) => values.find((value) => value.id === read.ids[tracked]);
  const usedIn = (id: string) => notes.filter((note) => note.valueIds.includes(id)).map((note) => note.title || "Untitled");

  const picked: ChosenUpdate[] = applicable
    .filter((update) => chosen.has(update.tracked))
    .map((update) => ({ id: read.ids[update.tracked]!, text: update.text, quantity: update.quantity, when: update.when }));
  const plan = planUpdates(values, picked);
  const follows = plan.filter((change) => !picked.some((update) => update.id === change.id));
  const noteText = "text" in read.from ? read.from.text : read.transcript;
  const canSave = noteText.trim().length > 0;

  const toggle = (tracked: number) =>
    setChosen((current) => {
      const next = new Set(current);
      if (!next.delete(tracked)) next.add(tracked);
      return next;
    });

  const willSave = saveNote && canSave;
  const confirm = () => {
    if (plan.length === 0 && !willSave) return;
    if (plan.length > 0) {
      const undo = applyPlan(queryClient, uid, plan);
      const touched = new Set(plan.flatMap((change) => notes.filter((note) => note.valueIds.includes(change.id)).map((note) => note.id)));
      const extra = follows.length > 0 ? ` and ${follows.length} that ${follows.length === 1 ? "follows" : "follow"}` : "";
      showToast(`Updated ${picked.length} ${picked.length === 1 ? "value" : "values"}${extra} in ${touched.size} ${touched.size === 1 ? "note" : "notes"}`, undo);
    }
    if (willSave) {
      const noteId = startNote(queryClient, uid, null, noteFrom(read.title || fileName || "Pasted message", noteText));
      void navigate({ to: "/notes/$noteId", params: { noteId } });
    }
    onClose();
  };

  const action = picked.length > 0 ? `Apply ${picked.length} ${picked.length === 1 ? "change" : "changes"}` : "Save as a note";
  const nothing = read.updates.length === 0;

  return (
    <>
      <Head title={read.title || "Changes in this message"} />
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3 text-[14px]">
        <p className="text-faint">
          {fileName ? `Read from ${fileName}` : "Read from the pasted text"} {read.where === "on_device" ? "on this device" : "in the cloud"} in {(read.ms / 1000).toFixed(1)} s.
          {fromFile && " Check each value against the file before you apply it."}
        </p>

        <p className={`mt-5 ${LABEL}`}>Changes to values you track</p>
        {nothing && <p className="mt-2 text-soft">Nothing in this message changes a value you track.</p>}
        <ul className="mt-1">
          {read.updates.map((update) => {
            const value = valueOf(update.tracked);
            if (!value) return null;
            const id = `paste-update-${update.tracked}`;
            const notesUsing = usedIn(value.id);
            return (
              <li key={update.tracked} className="flex gap-3 border-b border-line py-3">
                <input
                  id={id}
                  type="checkbox"
                  disabled={Boolean(update.blocked)}
                  checked={chosen.has(update.tracked) && !update.blocked}
                  onChange={() => toggle(update.tracked)}
                  className="mt-1 size-3.5 shrink-0 accent-ink disabled:opacity-40"
                />
                <div className="min-w-0 flex-1">
                  <label htmlFor={id} className="block text-soft">
                    {[nameOf(value), value.subject?.label].filter(Boolean).join(" · ")}
                  </label>
                  <p className="mt-0.5 text-[15px] font-medium tracking-[-0.01em]">
                    <span className="text-soft line-through decoration-faint">{value.text}</span>
                    <span aria-hidden className="mx-2 text-faint">
                      →
                    </span>
                    <span className="sr-only"> becomes </span>
                    {update.text}
                  </p>
                  <p className="mt-1 text-soft">
                    {update.source === "file" && <span className="mr-1.5 rounded-md bg-chip px-1.5 py-0.5 text-[14px]">Read from the file</span>}
                    <q className="italic">{update.quote}</q>
                  </p>
                  {update.blocked && (
                    <p className="mt-1 text-accent-ink">
                      This is in {update.blocked.currency} and {value.text} is in {value.unit}. Dittle doesn't convert currencies, so it won't change this one.
                    </p>
                  )}
                  {notesUsing.length > 0 && <p className="mt-1 text-faint">Used in {notesUsing.join(", ")}</p>}
                </div>
              </li>
            );
          })}
        </ul>

        {follows.length > 0 && (
          <Section label="These follow">
            {follows.map((change) => {
              const value = values.find((item) => item.id === change.id);
              return (
                <li key={change.id}>
                  {nameOf(value)}: {change.before.text} → <span className="text-ink">{change.after.text}</span>
                </li>
              );
            })}
          </Section>
        )}

        {read.confirmed.length > 0 && (
          <Section label="Unchanged">
            {read.confirmed.map((tracked) => {
              const value = valueOf(tracked);
              return value && <li key={tracked}>{`${nameOf(value)} stays ${value.text}`}</li>;
            })}
          </Section>
        )}

        {read.additions.length > 0 && (
          <Section label="New in this message">
            {read.additions.map((addition, index) => (
              <li key={index}>
                <span className="text-ink">{addition.text}</span> · {addition.name.replaceAll("_", " ")}
                {addition.source === "file" && " · read from the file"}
              </li>
            ))}
          </Section>
        )}

        {canSave && (
          <label className="mt-5 flex items-start gap-2.5 text-soft">
            <input type="checkbox" checked={saveNote} onChange={(event) => setSaveNote(event.target.checked)} className="mt-0.5 size-3.5 accent-ink" />
            <span>Save the message as a note. Dittle finds its values and links them to the ones you track, like any note you write.</span>
          </label>
        )}
      </div>
      <Foot>
        <Btn onClick={onBack}>Back</Btn>
        <Btn primary onClick={confirm} className={plan.length > 0 || willSave ? "" : "pointer-events-none opacity-50"}>
          {action}
        </Btn>
      </Foot>
    </>
  );
}

function noteFrom(title: string, text: string): NoteDoc {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return { v: 1, blocks: [{ t: "h", level: 1, c: [{ t: "text", text: title }] }, ...lines.map((line) => ({ t: "p" as const, c: [{ t: "text" as const, text: line }] }))] };
}

function Head({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
      <Dialog.Title className="truncate text-[17px] font-medium tracking-[-0.02em]">{title}</Dialog.Title>
      <Dialog.Close aria-label="Close" className="grid size-7 shrink-0 place-items-center rounded-lg text-soft hover:bg-chip hover:text-ink">
        <MIcon name="close" className="size-3.5" />
      </Dialog.Close>
    </div>
  );
}

function Foot({ children }: { children: ReactNode }) {
  return <div className="flex shrink-0 justify-end gap-2 border-t border-line px-5 py-3">{children}</div>;
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="mt-5">
      <p className={LABEL}>{label}</p>
      <ul className="mt-1.5 space-y-1 text-soft">{children}</ul>
    </section>
  );
}
