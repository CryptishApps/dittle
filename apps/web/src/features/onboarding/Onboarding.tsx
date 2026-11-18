import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { CaptureBox } from "@/features/capture/CaptureBox";
import { createSyncedValueStore } from "@/features/editor/values";
import { writes } from "@/features/notes/api";
import { changeOutsideEditor } from "@/features/notes/editor-services";
import type { Glance } from "@/features/notes/fact";
import type { NoteDoc } from "@/features/notes/note-doc";
import { STARTERS } from "@/features/notes/starters";
import { ease } from "@/ui/kit";
import { Icon, type IconName } from "./icons";
import { MAX_INTERACTIVE, RECIPES, sentenceOf, type GlanceOption, type Recipe, type Sample } from "./recipes";
import { buildSeed, glanceValue, previewChange, tableOf, type ChangeLine, type PlannedChange, type Seed } from "./seed";
import { onboarding, type OnboardingView } from "./stage";

export { useOnboardingView } from "./stage";

type Props = { uid: string; view: OnboardingView; onStart: (title: string) => void; onStartFrom: (doc: NoteDoc) => void; onSample: () => void };

export function Onboarding({ uid, view, onStart, onStartFrom, onSample }: Props) {
  const sample = () => {
    onboarding.end(uid, "done");
    onSample();
  };
  if (view === "start") return <QuietStart uid={uid} onStart={onStart} onStartFrom={onStartFrom} onSample={sample} />;
  return <Flow uid={uid} onSample={sample} />;
}

type Topic = { recipe: Recipe } | { custom: string };
type Written = { recipe: Recipe; seed: Seed; glance?: GlanceOption };
type Step = { at: "pick" } | { at: "entry"; index: number } | { at: "change" };

const PRIMARY = "inline-flex h-11 items-center gap-2.5 rounded-xl bg-ink px-4.5 text-[15px] font-semibold text-page transition-opacity hover:opacity-90 disabled:opacity-40";
const enter = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 }, transition: { duration: 0.22, ease } };

const isEnter = (event: KeyboardEvent) => event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing;

function Flow({ uid, onSample }: { uid: string; onSample: () => void }) {
  const [today] = useState(() => new Date());
  const [step, setStep] = useState<Step>({ at: "pick" });
  const [topics, setTopics] = useState<Topic[]>([]);
  const [custom, setCustom] = useState<Promise<Recipe | undefined>>();
  const [written, setWritten] = useState<Written[]>([]);

  useEffect(() => onboarding.begin(uid), [uid]);

  const interactive = topics.slice(0, MAX_INTERACTIVE);
  const changeable = written.find((item) => item.seed.changes.length > 0);

  const finish = async (done: Written[]) => {
    const silent = topics.slice(MAX_INTERACTIVE);
    for (const topic of silent) {
      const recipe = "recipe" in topic ? topic.recipe : await custom?.catch(() => undefined);
      if (!recipe?.samples[0]) continue;
      if (done.some((item) => item.recipe.id === recipe.id)) continue;
      void writes.seedStarter(uid, buildSeed(recipe, [recipe.samples[0], ...recipe.extras], recipe.glances[0]?.glance, today));
    }
    onboarding.end(uid, "done");
  };

  const start = (chosen: Topic[]) => {
    setTopics(chosen);
    const topic = chosen.find((item) => "custom" in item);
    if (topic && "custom" in topic) setCustom(import("./ai").then(({ proposeRecipe }) => proposeRecipe(topic.custom, today)).catch(() => undefined));
    setStep({ at: "entry", index: 0 });
  };

  const added = (item: Written | undefined, index: number) => {
    const next = item ? [...written, item] : written;
    if (item) {
      void writes.seedStarter(uid, item.seed);
      setWritten(next);
    }
    if (index + 1 < interactive.length) setStep({ at: "entry", index: index + 1 });
    else if (next.some((entry) => entry.seed.changes.length > 0)) setStep({ at: "change" });
    else void finish(next);
  };

  const dots = ["pick", ...interactive.map((_, index) => `entry${index}`), "change"];
  const current = step.at === "entry" ? `entry${step.index}` : step.at;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-page">
      <div className="mx-auto flex max-w-[1080px] items-center justify-between px-5 pt-5 sm:px-8">
        <span className="w-16" />
        <ol aria-label="Progress" className="flex items-center gap-1.5">
          {(step.at === "pick" ? ["pick", "entry0", "change"] : dots).map((dot) => (
            <li key={dot} aria-current={dot === current ? "step" : undefined} className={`h-1.5 rounded-full transition-all duration-300 ${dot === current ? "w-5 bg-ink" : "w-1.5 bg-line-strong"}`} />
          ))}
        </ol>
        <button type="button" onClick={() => onboarding.end(uid, "skipped")} className="w-16 text-right text-[14px] text-faint transition-colors hover:text-ink">
          Skip
        </button>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {step.at === "pick" && (
          <m.div key="pick" {...enter}>
            <PickStep onContinue={start} onSample={onSample} />
          </m.div>
        )}
        {step.at === "entry" && (
          <m.div key={`entry${step.index}`} {...enter}>
            <EntryLoader
              topic={interactive[step.index]!}
              custom={custom}
              position={`${step.index + 1} of ${interactive.length}`}
              today={today}
              onAdd={(item) => added(item, step.index)}
            />
          </m.div>
        )}
        {step.at === "change" && changeable && (
          <m.div key="change" {...enter}>
            <ChangeStep uid={uid} written={changeable} today={today} onFinish={() => void finish(written)} />
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Heading({ eyebrow, title, sub }: { eyebrow: ReactNode; title: string; sub?: string }) {
  return (
    <>
      <p className="flex items-center gap-1.5 text-[13.5px] text-faint">{eyebrow}</p>
      <h1 className="mt-2 text-[34px] leading-[1.1] font-semibold tracking-[-0.03em] text-ink sm:text-[40px]">{title}</h1>
      {sub && <p className="mt-2.5 text-[16px] leading-[1.55] text-soft">{sub}</p>}
    </>
  );
}

function Pill({ selected, icon, onClick, children }: { selected: boolean; icon: IconName; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`inline-flex h-11 items-center gap-2 rounded-full border px-4 text-[15px] font-medium transition-colors ${
        selected ? "border-ink bg-ink text-page" : "border-line bg-page text-ink hover:border-line-strong"
      }`}
    >
      <Icon name={icon} className="size-[18px]" />
      {children}
    </button>
  );
}

function listOf(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
}

function PickStep({ onContinue, onSample }: { onContinue: (topics: Topic[]) => void; onSample: () => void }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [other, setOther] = useState<string>();
  const continueRef = useRef<HTMLButtonElement>(null);
  const topics: Topic[] = [
    ...picked.flatMap((id) => RECIPES.filter((recipe) => recipe.id === id).map((recipe) => ({ recipe }))),
    ...(other?.trim() ? [{ custom: other.trim() }] : []),
  ];
  const labels = topics.map((topic) => ("recipe" in topic ? topic.recipe.label : topic.custom));
  const go = () => topics.length > 0 && onContinue(topics);

  useEffect(() => continueRef.current?.focus(), []);

  return (
    <div
      className="mx-auto max-w-[640px] px-5 pt-16 pb-24 sm:pt-24"
      onKeyDown={(event) => {
        if (!isEnter(event)) return;
        event.preventDefault();
        go();
      }}
    >
      <Heading eyebrow="Welcome to Dittle" title="What do you keep track of?" sub="Pick a few and we'll set each one up with you. It takes about a minute." />
      <div className="mt-8 flex flex-wrap gap-2.5">
        {RECIPES.map((recipe) => (
          <Pill
            key={recipe.id}
            icon={recipe.icon}
            selected={picked.includes(recipe.id)}
            onClick={() => setPicked((current) => (current.includes(recipe.id) ? current.filter((id) => id !== recipe.id) : [...current, recipe.id]))}
          >
            {recipe.label}
          </Pill>
        ))}
        {other === undefined ? (
          <button
            type="button"
            onClick={() => setOther("")}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-dashed border-line-strong px-4 text-[15px] text-faint transition-colors hover:text-ink"
          >
            <Icon name="plus" className="size-[18px]" />
            Something else
          </button>
        ) : (
          <label className={`inline-flex h-11 items-center gap-2 rounded-full border px-4 ${other.trim() ? "border-ink" : "border-line-strong"}`}>
            <Icon name="sparkle" className="size-[18px] text-soft" />
            <input
              autoFocus
              value={other}
              onChange={(event) => setOther(event.target.value)}
              onBlur={() => !other.trim() && setOther(undefined)}
              placeholder="Plant care, book club…"
              aria-label="Something else you keep track of"
              className="w-[190px] bg-transparent text-[15px] text-ink outline-none placeholder:text-faint"
            />
          </label>
        )}
      </div>
      <div className="mt-10 flex items-center gap-4">
        <button ref={continueRef} type="button" disabled={topics.length === 0} onClick={go} className={PRIMARY}>
          Continue
          <Icon name="enter" className="size-4 opacity-70" />
        </button>
        <span className="min-w-0 truncate text-[14px] text-faint">{labels.length > 0 ? listOf(labels) : "Pick one or more"}</span>
      </div>
      <button type="button" onClick={onSample} className="mt-8 text-[14px] text-faint underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink">
        Or look around a sample trip first
      </button>
    </div>
  );
}

type EntryProps = { topic: Topic; custom?: Promise<Recipe | undefined>; position: string; today: Date; onAdd: (item: Written | undefined) => void };

function EntryLoader({ topic, custom, ...rest }: EntryProps) {
  const [recipe, setRecipe] = useState<Recipe | null | undefined>("recipe" in topic ? topic.recipe : undefined);
  useEffect(() => {
    if ("recipe" in topic || !custom) return;
    let live = true;
    void custom.then((proposed) => live && setRecipe(proposed ?? null));
    return () => {
      live = false;
    };
  }, [topic, custom]);

  if (recipe) return <EntryStep {...rest} recipe={recipe} />;
  const label = "custom" in topic ? topic.custom : "";
  return (
    <div className="mx-auto max-w-[640px] px-5 pt-16 pb-24 sm:pt-24">
      <Heading eyebrow={<><Icon name="sparkle" className="size-4" />{label} · {rest.position}</>} title={recipe === null ? "Dittle couldn't set that one up." : `Setting up ${label}…`} />
      {recipe === null ? (
        <button type="button" autoFocus onClick={() => rest.onAdd(undefined)} className={`${PRIMARY} mt-8`}>
          Carry on
          <Icon name="enter" className="size-4 opacity-70" />
        </button>
      ) : (
        <p className="mt-6 t-shimmer-text text-[15px]" data-text="Choosing columns and writing an example">
          Choosing columns and writing an example
        </p>
      )}
    </div>
  );
}

function EntryStep({ recipe, position, today, onAdd }: Omit<EntryProps, "topic" | "custom"> & { recipe: Recipe }) {
  const [sample, setSample] = useState<Sample>(recipe.samples[0]!);
  const [text, setText] = useState(() => sentenceOf(recipe.samples[0]!.parts));
  const [extras, setExtras] = useState<number[]>([]);
  const [glance, setGlance] = useState<Glance | undefined>(recipe.glances[0]?.glance);
  const [reading, setReading] = useState(false);
  const [problem, setProblem] = useState<string>();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const parsed = text === sentenceOf(sample.parts);
  const seed = useMemo(
    () => buildSeed(recipe, [sample, ...extras.map((index) => recipe.extras[index]!)], glance, today),
    [recipe, sample, extras, glance, today],
  );
  const table = tableOf(seed.collection, seed.rows, seed.values);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, []);

  const choose = (next: Sample) => {
    setSample(next);
    setText(sentenceOf(next.parts));
    setProblem(undefined);
    inputRef.current?.focus();
  };

  const read = async () => {
    const sentence = text.trim();
    if (!sentence || reading) return;
    setReading(true);
    setProblem(undefined);
    try {
      const { readEntry } = await import("./ai");
      const found = await readEntry(sentence, recipe, today);
      if (found) {
        setSample(found);
        setText(sentenceOf(found.parts));
      } else setProblem("Dittle couldn't find anything to file in that. Try adding a number or a day.");
    } catch (error) {
      console.warn("Dittle could not read an onboarding entry", error);
      setProblem("Dittle couldn't read that just now. Try again, or pick an example.");
    } finally {
      setReading(false);
    }
  };

  const advance = () => {
    if (reading) return;
    if (!parsed) return void read();
    onAdd({ recipe, seed, glance: recipe.glances.find((option) => option.glance === glance) });
  };

  const others = recipe.samples.filter((item) => item !== sample);

  return (
    <div
      className="mx-auto grid max-w-[1080px] gap-x-16 gap-y-10 px-5 pt-14 pb-24 sm:px-8 sm:pt-20 lg:grid-cols-[minmax(0,640px)_minmax(0,1fr)]"
      onKeyDown={(event) => {
        if (!isEnter(event)) return;
        event.preventDefault();
        advance();
      }}
    >
      <div className="min-w-0">
        <Heading eyebrow={<><Icon name={recipe.icon} className="size-4" />{recipe.label} · {position}</>} title={recipe.prompt} />
        <div className="mt-7 rounded-2xl border border-line bg-page px-5 pt-4 pb-3.5 transition-colors focus-within:border-line-strong">
          <div className="relative text-[18px] leading-[1.7]">
            <div aria-hidden className="pointer-events-none break-words whitespace-pre-wrap text-ink">
              {parsed
                ? sample.parts.map((part, index) =>
                    typeof part === "string" ? (
                      <span key={index}>{part}</span>
                    ) : (
                      <m.span
                        key={`${index}-${part.v}`}
                        initial={{ opacity: 0.4 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.03 }}
                        className="rounded-[5px] bg-accent-tint text-accent-ink"
                      >
                        {part.v}
                      </m.span>
                    ),
                  )
                : text}
              {"​"}
            </div>
            <textarea
              ref={inputRef}
              value={text}
              rows={1}
              spellCheck={false}
              aria-label={recipe.prompt}
              onChange={(event) => {
                setText(event.target.value);
                setProblem(undefined);
              }}
              className="absolute inset-0 resize-none overflow-hidden bg-transparent text-transparent caret-ink outline-none"
              style={{ font: "inherit", lineHeight: "inherit" }}
            />
          </div>
          <div className="mt-2 flex min-h-6 flex-wrap items-center gap-x-1.5 gap-y-1 text-[13.5px] text-faint">
            {reading ? (
              <span className="t-shimmer-text" data-text="Reading what you wrote">
                Reading what you wrote
              </span>
            ) : !parsed ? (
              <span>Press Enter and Dittle will file it</span>
            ) : (
              others.length > 0 && (
                <>
                  <span>Or try</span>
                  {others.map((item, index) => (
                    <span key={item.chip} className="flex items-center gap-1.5">
                      {index > 0 && <span aria-hidden>·</span>}
                      <button type="button" onClick={() => choose(item)} className="text-soft underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink hover:decoration-ink">
                        {item.chip}
                      </button>
                    </span>
                  ))}
                </>
              )
            )}
          </div>
        </div>
        {problem && <p className="mt-2.5 text-[14px] text-danger">{problem}</p>}

        <div className={`mt-8 transition-opacity duration-200 ${reading ? "opacity-50" : ""}`}>
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-faint">
            <Icon name="table" className="size-3.5" />
            {recipe.collection.name}
          </p>
          <table className="mt-2 w-full border-collapse text-left text-[15px] tabular-nums">
            <thead>
              <tr className="border-b border-line text-[13px] text-faint">
                {table.headers.map((header) => (
                  <th key={header} className="py-2 pr-4 font-normal">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {table.rows.map((row) => (
                  <m.tr
                    key={row.label + row.cells[0]}
                    layout
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease }}
                    className="border-b border-line"
                  >
                    <td className="py-3 pr-4 text-ink">{row.label}</td>
                    {row.cells.map((cell, index) => (
                      <td key={index} className="py-3 pr-4 text-ink">
                        {cell}
                      </td>
                    ))}
                  </m.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {recipe.extras.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13.5px]">
              {recipe.extras.map((extra, index) => {
                const on = extras.includes(index);
                return (
                  <button
                    key={extra.chip}
                    type="button"
                    onClick={() => setExtras((current) => (on ? current.filter((item) => item !== index) : [...current, index]))}
                    className={`inline-flex items-center gap-1 transition-colors ${on ? "text-ink" : "text-faint hover:text-ink"}`}
                  >
                    <Icon name={on ? "check" : "plus"} className="size-3.5" />
                    {on ? `Added ${extra.chip}` : `Add ${extra.chip} too`}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button type="button" onClick={advance} disabled={reading || !text.trim()} className={`${PRIMARY} mt-9`}>
          {parsed ? `Add to ${recipe.collection.name}` : reading ? "Reading…" : "File it"}
          <Icon name="enter" className="size-4 opacity-70" />
        </button>
      </div>

      {recipe.glances.length > 0 && (
        <aside className="lg:pt-[118px]">
          <fieldset>
            <legend className="text-[15px] font-semibold text-ink">On your home, show</legend>
            <div className="mt-3 grid gap-2">
              {recipe.glances.map((option) => {
                const selected = option.glance === glance;
                const value = glanceValue(option.glance, seed.collection, seed.rows, seed.values, today);
                return (
                  <label
                    key={option.glance}
                    className={`flex h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 text-[15px] transition-colors ${selected ? "border-ink" : "border-line hover:border-line-strong"}`}
                  >
                    <input type="radio" name="glance" checked={selected} onChange={() => setGlance(option.glance)} className="size-4 accent-ink" />
                    <span className="flex-1 text-ink">{option.label}</span>
                    <span className="text-[13.5px] text-faint tabular-nums">{value ?? "—"}</span>
                  </label>
                );
              })}
            </div>
            <p className="mt-3 text-[13.5px] text-faint">Picked from what you wrote. You can change it later.</p>
          </fieldset>
        </aside>
      )}
    </div>
  );
}

const LINE_ICON: Record<ChangeLine["at"], IconName> = { note: "note", row: "table", home: "home" };

function ChangeStep({ uid, written, today, onFinish }: { uid: string; written: Written; today: Date; onFinish: () => void }) {
  const queryClient = useQueryClient();
  const [store] = useState(() => createSyncedValueStore(queryClient, uid, writes));
  const options = written.seed.changes.slice(0, 2);
  const [chosen, setChosen] = useState(0);
  const [applied, setApplied] = useState<{ lines: ChangeLine[]; undo: () => void }>();
  const boxRef = useRef<HTMLButtonElement>(null);
  const finishRef = useRef<HTMLButtonElement>(null);

  useEffect(() => (applied ? finishRef : boxRef).current?.focus(), [applied]);

  const apply = (change: PlannedChange) => {
    const lines = previewChange({ seed: written.seed, noteTitle: written.recipe.noteTitle, change, glance: written.glance, today });
    const before = store.get(change.valueId) ?? written.seed.values.find((value) => value.id === change.valueId);
    changeOutsideEditor(queryClient, uid, store, change.valueId, change.to.text, { amount: change.to.amount, seconds: change.to.seconds });
    setApplied({
      lines,
      undo: () => before && changeOutsideEditor(queryClient, uid, store, change.valueId, before.text, { amount: before.amount, seconds: before.seconds }),
    });
  };

  const advance = () => (applied ? onFinish() : apply(options[chosen]!));

  return (
    <div
      className="mx-auto max-w-[640px] px-5 pt-14 pb-24 sm:pt-20"
      onKeyDown={(event) => {
        if (!isEnter(event)) return;
        event.preventDefault();
        advance();
      }}
    >
      <Heading eyebrow={<><Icon name={written.recipe.icon} className="size-4" />{written.recipe.label}</>} title="Plans change. Try it." sub="Tell Dittle something changed, the way you'd say it out loud." />
      <button
        ref={boxRef}
        type="button"
        disabled={Boolean(applied)}
        onClick={advance}
        className="mt-7 flex h-14 w-full items-center justify-between rounded-2xl border border-ink px-5 text-left text-[17px] text-ink disabled:border-line disabled:text-soft"
      >
        {options[chosen]!.sentence}
        <Icon name="enter" className="size-4 text-faint" />
      </button>
      {!applied && options.length > 1 && (
        <p className="mt-2.5 text-[13.5px] text-faint">
          Or try{" "}
          <button type="button" onClick={() => setChosen(chosen === 0 ? 1 : 0)} className="text-soft underline decoration-line-strong underline-offset-4 hover:text-ink">
            {options[chosen === 0 ? 1 : 0]!.sentence}
          </button>
        </p>
      )}
      <AnimatePresence>
        {applied && (
          <m.section key="applied" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="mt-7" aria-live="polite">
            <div className="flex items-center justify-between text-[13.5px]">
              <span className="font-medium text-faint">Updated in {applied.lines.length} {applied.lines.length === 1 ? "place" : "places"}</span>
              <button
                type="button"
                onClick={() => {
                  applied.undo();
                  setApplied(undefined);
                }}
                className="text-faint transition-colors hover:text-ink"
              >
                Undo
              </button>
            </div>
            <ul className="mt-2">
              {applied.lines.map((line, index) => (
                <m.li
                  key={index}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, delay: 0.08 * index, ease }}
                  className="flex items-center gap-4 border-b border-line py-3.5 last:border-b-0"
                >
                  <Icon name={LINE_ICON[line.at]} className="size-[18px] shrink-0 text-faint" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] text-faint">{line.title}</span>
                    {line.at === "note" ? (
                      <span className="block truncate text-[15px] text-ink">
                        {line.lead}
                        <s className="text-faint">{line.from}</s> <span className="rounded-[5px] bg-accent-tint px-1 text-accent-ink">{line.to}</span>
                        {line.tail}
                      </span>
                    ) : (
                      <span className="block text-[15px] text-ink">{line.label}</span>
                    )}
                  </span>
                  {line.at !== "note" && (
                    <span className="shrink-0 text-[15px] tabular-nums">
                      <s className="text-faint">{line.from}</s> <span className="font-semibold text-accent-ink">{line.to}</span>
                    </span>
                  )}
                </m.li>
              ))}
            </ul>
          </m.section>
        )}
      </AnimatePresence>
      <button ref={finishRef} type="button" onClick={onFinish} className={`${PRIMARY} mt-8`}>
        {applied ? "See my notes" : "Skip this"}
        <Icon name="enter" className="size-4 opacity-70" />
      </button>
    </div>
  );
}

function QuietStart({ uid, onStart, onStartFrom, onSample }: { uid: string; onStart: (title: string) => void; onStartFrom: (doc: NoteDoc) => void; onSample: () => void }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[760px] px-4 pt-10 pb-24 sm:px-8 sm:pt-16">
        <CaptureBox uid={uid} onStartNote={onStart} />
        <div className="mt-14 flex items-baseline justify-between gap-4">
          <h2 className="text-[15px] font-semibold text-ink">Or open an example</h2>
          <button type="button" onClick={() => onboarding.restart(uid)} className="text-[14px] text-faint underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink">
            Set up my home with Dittle
          </button>
        </div>
        <ul className="mt-3 border-t border-line">
          <li className="border-b border-line">
            <button type="button" onClick={onSample} className="group flex w-full items-baseline gap-4 py-3.5 text-left">
              <span className="w-44 shrink-0 text-[15px] font-medium text-ink">Sample trip</span>
              <span className="min-w-0 flex-1 truncate text-[14px] text-faint group-hover:text-soft">A long weekend in Lisbon for 6 friends, already linked and added up.</span>
            </button>
          </li>
          {STARTERS.map((starter) => (
            <li key={starter.title} className="border-b border-line">
              <button type="button" onClick={() => onStartFrom(starter.doc)} className="group flex w-full items-baseline gap-4 py-3.5 text-left">
                <span className="w-44 shrink-0 text-[15px] font-medium text-ink">{starter.title}</span>
                <span className="min-w-0 flex-1 truncate text-[14px] text-faint group-hover:text-soft">{starter.summary}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
