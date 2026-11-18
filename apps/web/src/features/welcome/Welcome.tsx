import { MotionConfig } from "motion/react";
import { useState, type MouseEvent, type ReactNode } from "react";
import { Wordmark } from "../../ui/Wordmark";
import { Shot } from "../../ui/Shot";
import { CaptureDemo } from "./CaptureDemo";
import { CollectionDemo } from "./CollectionDemo";
import { HeroDemo } from "./HeroDemo";
import { Reveal, StickySteps, type Step } from "./motion";
import { Eyebrow, Icon, PRIMARY, SECONDARY, useReplay, type IconName } from "./quiet";
import "./welcome.css";
import { TidyDemo } from "./TidyDemo";

type WelcomeProps = {
  onStart: () => void;
  onSignIn: () => void;
};

const REPO_URL = "https://github.com/CryptishApps/dittle";
const WRAP = "mx-auto w-full max-w-[1120px] px-4 sm:px-8";
const H2 = "text-[32px] leading-[1.1] font-semibold tracking-[-0.035em] sm:text-[44px]";
const LEAD = "mt-4 max-w-[52ch] text-[17px] leading-[1.65] text-soft";

const STEPS: Step[] = [
  {
    key: "hover",
    label: "On device and cloud",
    title: "It knows what each value is",
    body: "Type @ before a value to tag it, or let Gemini Nano spot it as you type. The cloud names it, like price per head or run distance, and Nano notices when one is worked out from others. Hover a value to see what it is and how many notes use it.",
    visual: <Shot name="hover" alt="The catering note with a card on £3,040 showing it is worked out from the catering price and the guest count." focus={{ x: 19, y: 9, zoom: 1.55 }} />,
  },
  {
    key: "panel",
    label: "On device",
    title: "Click a value to see where it lives",
    body: "A side panel shows the value, a field to change it, the notes that use it and its row in a collection. Three bookings written in three different notes line up in one Things to do table, with the cost each and the date.",
    visual: <Shot name="panel" alt="A side panel for €45 with a field to change it and a Things to do table listing a fado night, Jerónimos Monastery and Pena Palace with their prices and dates." focus={{ x: 21, y: 7, zoom: 1.27 }} />,
  },
  {
    key: "change",
    label: "On device",
    title: "Change it once",
    body: "Change a value and Dittle asks whether to update every note that uses it or only this one. Anything worked out from it, like a cost each or a total, follows. The sums are done by code, not by the model.",
    visual: <Shot name="change" alt="The price per head changed from £38 to £42, with a note that £38 is used in 2 notes and a button to update both." focus={{ x: 21, y: 7, zoom: 1.27 }} />,
  },
  {
    key: "home",
    label: "On device, cloud for suggestions",
    title: "Everything you track, on your home page",
    body: "Each collection adds itself up, like what the things to do cost each of you. The dates in your notes count down, and Dittle suggests a new collection when it sees a pattern.",
    visual: <Shot name="home" alt="The home page with a Things to do tile showing €95 in total, a Next up tile counting down 23 days to the barn deposit, and a list of notes." focus={{ x: 19, y: 6, zoom: 1.45 }} />,
  },
  {
    key: "request",
    label: "On device, cloud as fallback",
    title: "Ask in the note itself",
    body: "Write “Write a packing list for a day trip to Sintra” and a button appears with the list already written. Hover to preview it, then add it below or replace your request. Type / for the same thing from a menu.",
    visual: <Shot name="request" alt="The Sintra day trip note with an Add a packing list button and a preview of the checklist." focus={{ x: 20, y: 8, zoom: 1.45 }} />,
  },
];

const MODELS: { job: string; model: string; where: string; how: string }[] = [
  {
    job: "Find values as you type, name columns, spot formulas, write requests",
    model: "Gemini Nano",
    where: "On device",
    how: "Chrome's Prompt API, through Firebase AI Logic hybrid mode",
  },
  { job: "The same jobs when the device has no model", model: "Gemini Flash-Lite", where: "Cloud", how: "Firebase AI Logic falls back to the cloud" },
  {
    job: "Describe values, file them into collections, link them across notes, sort the home box, read updates",
    model: "Gemini Flash-Lite",
    where: "Cloud, Nano offline",
    how: "These decide where your values go, so the cloud goes first and Nano takes over offline",
  },
  { job: "Suggest collections across all your notes", model: "Gemini Flash-Lite", where: "Cloud", how: "Only the tracked values are sent, not the notes" },
];

const FIREBASE = ["AI Logic", "Firestore", "Authentication", "App Check", "Remote Config", "Hosting"];

const TRACK: { icon: IconName; label: string }[] = [
  { icon: "run", label: "Running log" },
  { icon: "meal", label: "Weekly meal plan" },
  { icon: "dumbbell", label: "Workouts" },
  { icon: "plane", label: "Trip plans" },
  { icon: "ring", label: "Wedding budget" },
  { icon: "book", label: "Reading list" },
  { icon: "receipt", label: "Invoices" },
  { icon: "plant", label: "Plant care" },
  { icon: "box", label: "Moving house" },
];

export function Welcome({ onStart, onSignIn }: WelcomeProps) {
  const { replay, again } = useReplay();
  const signIn = (event: MouseEvent) => {
    event.preventDefault();
    onSignIn();
  };
  return (
    <MotionConfig reducedMotion="user">
      <div className="welcome min-h-dvh overflow-x-clip bg-page text-ink">
        <nav className="sticky top-0 z-50 border-b border-line/70 bg-page/90 backdrop-blur-md">
          <div className={`${WRAP} flex h-16 items-center justify-between gap-6`}>
            <ToTop className="text-[20px]" />
            <div className="hidden items-center gap-7 text-[14.5px] text-soft md:flex">
              <a href="#capture" className="hover:text-ink">
                Features
              </a>
              <a href="#collections" className="hover:text-ink">
                Collections
              </a>
              <a href="#how" className="hover:text-ink">
                How it works
              </a>
              <a href="#on-device" className="hover:text-ink">
                On device
              </a>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <a href="/signin" onClick={signIn} className="inline-flex h-10 items-center px-3 text-[14.5px] font-semibold text-soft transition-colors hover:text-ink">
                Sign in
              </a>
              <button type="button" onClick={onStart} className={`${PRIMARY} h-10 px-4 text-[14.5px]`}>
                Start free
              </button>
            </div>
          </div>
        </nav>

        <main>
          <section id="top" className="relative isolate scroll-mt-16 overflow-hidden">
            <div className="welcome-wash absolute inset-0 -z-10" aria-hidden />
            <div className="welcome-grid absolute inset-0 -z-10" aria-hidden />
            <div className={`${WRAP} pt-12 text-center sm:pt-16`}>
              <Reveal>
                <a href="#on-device" className="inline-flex h-8 items-center gap-2 rounded-full border border-line bg-page/80 px-3.5 text-[13.5px] font-medium text-soft backdrop-blur transition-colors hover:text-ink">
                  <span className="welcome-pulse size-2 rounded-full bg-[var(--brand-yellow)]" />
                  Gemini Nano, right in your browser
                  <Icon name="arrow" className="size-3.5" />
                </a>
                <h1 className="mx-auto mt-6 max-w-[14ch] text-[44px] leading-[1.02] font-semibold tracking-[-0.045em] sm:text-[68px]">
                  Notes that
                  <span className="welcome-headline block pb-1">
                    <span className="welcome-swash">keep track.</span>
                  </span>
                </h1>
                <p className="mx-auto mt-5 max-w-[52ch] text-[18px] leading-[1.6] text-balance text-soft sm:text-[19px]">
                  Write runs, dinners, trips and budgets the way you already do. Dittle spots the numbers and dates, keeps every copy in step, files them into tables and does the maths.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-2.5">
                  <button type="button" onClick={onStart} className={`${PRIMARY} h-12 px-5 text-[16px]`}>
                    Start writing, free
                    <Icon name="arrow" className="welcome-cta-arrow size-4" />
                  </button>
                  <a href="#demo" onClick={again} className={`${SECONDARY} h-12 px-5 text-[16px]`}>
                    See it update
                  </a>
                </div>
                <p className="mt-4 text-[13.5px] text-faint">Free · set up in about a minute · works offline</p>
              </Reveal>
            </div>
            <div id="demo" className="mx-auto w-full max-w-[1180px] scroll-mt-24 px-4 pt-12 pb-20 sm:px-12 sm:pt-14 sm:pb-28">
              <HeroDemo key={replay} />
            </div>
          </section>

          <Section id="capture" tone="sky">
            <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
              <Reveal>
                <Eyebrow tone="sky" icon="type">
                  Capture
                </Eyebrow>
                <h2 className={H2}>Throw anything at it.</h2>
                <p className={LEAD}>One box takes typing, a pasted chat, a screenshot or your voice. Dittle files it where it belongs and tells you what it did in one line, with Undo next to it.</p>
              </Reveal>
              <Reveal delay={0.08}>
                <CaptureDemo />
              </Reveal>
            </div>
          </Section>

          <Section id="tidy">
            <Reveal>
              <Eyebrow tone="sun" icon="chat">
                Tidy up
              </Eyebrow>
              <h2 className={H2}>Paste the mess, get a tidy note.</h2>
              <p className={LEAD}>Drop in a group chat, an email or a booking. You get a short note with the values marked, and the dates on your home page.</p>
            </Reveal>
            <Reveal delay={0.08} className="mt-10">
              <TidyDemo />
            </Reveal>
          </Section>

          <Section id="collections" tone="sun">
            <Reveal>
              <Eyebrow tone="sun" icon="table">
                Collections
              </Eyebrow>
              <h2 className={H2}>Collections that add themselves up.</h2>
              <p className={LEAD}>A collection is a table, like Runs or Things to do. Anything you write that fits files itself in, and the totals keep up.</p>
            </Reveal>
            <Reveal delay={0.08} className="mt-10">
              <CollectionDemo />
            </Reveal>
            <Reveal delay={0.1} className="mt-12 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
              <Fact title="A row per day or per thing" body="A log like Runs gets a row for each day. A list like Things to do gets a row for each place or booking." />
              <Fact title="Totals and averages" body="Each collection adds itself up on your home page: distance this month, cost each, average pace." />
              <Fact title="Calculated columns" body="Add a column worked out from the others, like pace from time and distance. Code does the maths." />
              <Fact title="Suggested for you" body="When the same details turn up across notes, Dittle offers a collection. Only the values are sent to the cloud." />
            </Reveal>
          </Section>

          <Section id="start">
            <Reveal className="max-w-[760px]">
              <Eyebrow tone="sky" icon="spark">
                Getting started
              </Eyebrow>
              <h2 className={H2}>Starts in a minute.</h2>
              <p className={LEAD}>Pick what you keep track of. Dittle sets up the notes and collections to start from, and you write the rest your way.</p>
              <TrackPicker />
              <button type="button" onClick={onStart} className={`${PRIMARY} mt-8`}>
                Start writing, free
                <Icon name="arrow" className="welcome-cta-arrow size-4" />
              </button>
            </Reveal>
          </Section>

          <Section id="how" tone="sky">
            <Reveal>
              <Eyebrow tone="sky" icon="sync">
                How it works
              </Eyebrow>
              <h2 className={H2}>Change it once. It changes everywhere.</h2>
            </Reveal>
            <div className="mt-6">
              <StickySteps steps={STEPS} />
            </div>
          </Section>

          <section id="on-device" className="theme-dark welcome-dark scroll-mt-16 text-ink">
            <div className={`${WRAP} py-20 sm:py-28`}>
              <Reveal>
                <p className="mb-5 inline-flex h-7 items-center gap-1.5 rounded-full bg-[var(--brand-yellow)] px-3 text-[13px] font-semibold text-[var(--brand-ink)]">
                  <Icon name="chip" className="size-[15px]" />
                  On device
                </p>
                <h2 className={H2}>Gemini Nano, right on your device.</h2>
                <p className={LEAD}>Gemini Nano runs inside your browser. It spots values as you type, privately and without a connection. The cloud makes the calls that decide where a value goes, and Nano takes those over when you’re offline.</p>
              </Reveal>
              <Reveal delay={0.08} className="mt-10 space-y-3 md:hidden">
                {MODELS.map((row) => (
                  <div key={row.job} className="rounded-2xl border border-line bg-page/60 p-4">
                    <p className="flex items-center justify-between gap-3">
                      <span className="font-semibold">{row.model}</span>
                      <Where where={row.where} />
                    </p>
                    <p className="mt-2 text-[15px] leading-[1.6]">{row.job}</p>
                    <p className="mt-1 text-[14px] leading-[1.6] text-soft">{row.how}</p>
                  </div>
                ))}
              </Reveal>
              <Reveal delay={0.08} className="mt-10 hidden overflow-x-auto rounded-2xl border border-line bg-page/60 px-6 backdrop-blur md:block">
                <table className="w-full min-w-[680px] text-left text-[15px]">
                  <thead className="text-[13px] text-faint">
                    <tr className="border-b border-line">
                      <th className="py-3 pr-6 font-semibold">Job</th>
                      <th className="py-3 pr-6 font-semibold">Model</th>
                      <th className="py-3 pr-6 font-semibold">Where</th>
                      <th className="py-3 font-semibold">How</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MODELS.map((row) => (
                      <tr key={row.job} className="border-b border-line align-top last:border-b-0">
                        <td className="py-4 pr-6 leading-[1.6]">{row.job}</td>
                        <td className="py-4 pr-6 font-semibold whitespace-nowrap">{row.model}</td>
                        <td className="py-4 pr-6 whitespace-nowrap">
                          <Where where={row.where} />
                        </td>
                        <td className="py-4 leading-[1.6] text-soft">{row.how}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Reveal>
              <Reveal delay={0.1} className="mt-12 grid gap-x-8 gap-y-6 sm:grid-cols-3">
                <Fact icon="lock" title="Private" body="On-device jobs keep your notes on your device. Cloud jobs send only what they work on: one paragraph, or what you type in the home box. Collection suggestions send only values." />
                <Fact icon="offline" title="Offline" body="Notes save to your device first and sync when you’re back. The on-device model works without a connection." />
                <Fact icon="code" title="Open" body="The code is on GitHub. Read how every AI call is made, or run your own copy." />
              </Reveal>
              <p className="mt-10 flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-faint">
                <span>Built on Firebase</span>
                {FIREBASE.map((product) => (
                  <span key={product} className="text-soft">
                    {product}
                  </span>
                ))}
              </p>
            </div>
          </section>

          <section className="relative isolate overflow-hidden">
            <div className="welcome-wash absolute inset-0 -z-10" aria-hidden />
            <div className={`${WRAP} py-24 text-center sm:py-32`}>
              <h2 className="text-[40px] leading-[1.04] font-semibold tracking-[-0.04em] sm:text-[60px]">
                Write it once.
                <span className="welcome-headline block pb-1">Dittle keeps it up to date.</span>
              </h2>
              <div className="mt-8 flex flex-wrap justify-center gap-2.5">
                <button type="button" onClick={onStart} className={`${PRIMARY} h-12 px-5 text-[16px]`}>
                  Start writing, free
                  <Icon name="arrow" className="welcome-cta-arrow size-4" />
                </button>
                <a href={REPO_URL} className={`${SECONDARY} h-12 px-5 text-[16px]`}>
                  View on GitHub
                </a>
              </div>
              <p className="mt-4 text-[13.5px] text-faint">Free · set up in about a minute</p>
            </div>
          </section>
        </main>

        <footer className="border-t border-line">
          <div className={`${WRAP} flex flex-wrap items-center justify-between gap-4 py-8 text-[14px] text-faint`}>
            <ToTop className="text-[17px]" />
            <span className="flex flex-wrap gap-x-5 gap-y-2">
              <a href="#capture" className="hover:text-ink">
                Features
              </a>
              <a href="#on-device" className="hover:text-ink">
                On device
              </a>
              <a href={REPO_URL} className="hover:text-ink">
                GitHub
              </a>
              <a href="/signin" onClick={signIn} className="hover:text-ink">
                Sign in
              </a>
            </span>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}

function Where({ where }: { where: string }) {
  return <span className={`rounded-md px-2 py-0.5 text-[13px] font-semibold whitespace-nowrap ${where === "On device" ? "bg-[var(--brand-yellow)] text-[var(--brand-ink)]" : "bg-chip text-soft"}`}>{where}</span>;
}

function ToTop({ className }: { className: string }) {
  return (
    <a
      href="#top"
      aria-label="Dittle, back to top"
      onClick={(event) => {
        event.preventDefault();
        const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: still ? "auto" : "smooth" });
        history.replaceState(null, "", window.location.pathname);
      }}
      className="rounded-md"
    >
      <Wordmark className={className} />
    </a>
  );
}

const TINTS = { plain: "border-t border-line", sky: "bg-[var(--sky)]", sun: "bg-[var(--sun)]" } as const;

function Section({ id, tone = "plain", children }: { id: string; tone?: keyof typeof TINTS; children: ReactNode }) {
  return (
    <section id={id} className={`scroll-mt-16 ${TINTS[tone]}`}>
      <div className={`${WRAP} py-20 sm:py-28`}>{children}</div>
    </section>
  );
}

function Fact({ icon, title, body }: { icon?: IconName; title: string; body: string }) {
  return (
    <div className="border-t border-line pt-4">
      <p className="flex items-center gap-2 text-[16px] font-semibold tracking-[-0.01em]">
        {icon ? <Icon name={icon} className="size-[18px] text-[var(--brand-yellow)]" /> : null}
        {title}
      </p>
      <p className="mt-1.5 text-[15px] leading-[1.65] text-soft">{body}</p>
    </div>
  );
}

function TrackPicker() {
  const [picked, setPicked] = useState<string[]>(["Running log", "Weekly meal plan"]);
  return (
    <ul className="mt-8 flex flex-wrap gap-2" aria-label="Things you keep track of">
      {TRACK.map((item) => {
        const on = picked.includes(item.label);
        return (
          <li key={item.label}>
            <button
              type="button"
              aria-pressed={on}
              onClick={() => setPicked((list) => (on ? list.filter((label) => label !== item.label) : [...list, item.label]))}
              className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-[15px] font-medium transition-colors ${on ? "bg-[var(--brand-blue)] text-white" : "border border-line-strong bg-page text-ink hover:border-ink"}`}
            >
              <Icon name={item.icon} className={`size-[18px] ${on ? "" : "text-soft"}`} />
              {item.label}
            </button>
          </li>
        );
      })}
      <li className="inline-flex h-10 items-center gap-2 rounded-full border border-dashed border-line-strong px-4 text-[15px] text-faint">
        <Icon name="plus" className="size-[18px]" />
        Something else
      </li>
    </ul>
  );
}
