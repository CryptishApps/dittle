import { MotionConfig } from "motion/react";
import { useState, type ReactNode } from "react";
import { Wordmark } from "../../ui/Wordmark";
import { Shot } from "../../ui/Shot";
import { CaptureDemo } from "./CaptureDemo";
import { CollectionDemo } from "./CollectionDemo";
import { HeroDemo } from "./HeroDemo";
import { Reveal, StickySteps, type Step } from "./motion";
import { Icon, PRIMARY, SECONDARY, type IconName } from "./quiet";
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
    label: "On device",
    title: "It knows what each value is",
    body: "Type @ before a value to tag it, or let Dittle spot it for you. Gemini Nano names it, like price per head or run distance, and notices when one is worked out from others. Hover a value to see what it is and how many notes use it.",
    visual: <Shot name="hover" alt="The catering note with a card on £3,040 showing it is worked out from the catering price and the guest count." focus={{ x: 19, y: 9, zoom: 1.55 }} />,
  },
  {
    key: "panel",
    label: "On device",
    title: "Click a value to see where it lives",
    body: "A side panel shows the value, a field to change it, the notes that use it and its row in a collection. Three plans written in three different notes line up in one Things to do table, with the cost each and the date.",
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
    title: "The whole plan on your home page",
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
    job: "Find and name values, link them across notes, file them into collections, spot formulas, write requests",
    model: "Gemini Nano",
    where: "On device",
    how: "Chrome's Prompt API, through Firebase AI Logic hybrid mode",
  },
  { job: "The same jobs when the device has no model", model: "Gemini Flash-Lite", where: "Cloud", how: "Firebase AI Logic falls back to the cloud" },
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
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh overflow-x-clip bg-page text-ink">
        <nav className="sticky top-0 z-50 border-b border-line bg-page/90 backdrop-blur-md">
          <div className={`${WRAP} flex h-16 items-center justify-between gap-6`}>
            <Wordmark className="text-[20px]" />
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
              <a href="#privacy" className="hover:text-ink">
                Privacy
              </a>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <a
                href="/signin"
                onClick={(event) => {
                  event.preventDefault();
                  onSignIn();
                }}
                className="inline-flex h-10 items-center px-3 text-[14.5px] font-semibold text-soft transition-colors hover:text-ink"
              >
                Sign in
              </a>
              <button type="button" onClick={onStart} className={`${PRIMARY} h-10 px-4 text-[14.5px]`}>
                Get started
              </button>
            </div>
          </div>
        </nav>

        <main>
          <section className={`${WRAP} grid grid-cols-[minmax(0,1fr)] items-center gap-12 pt-16 pb-20 sm:pt-24 sm:pb-28 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16`}>
            <div>
              <h1 className="text-[42px] leading-[1.05] font-semibold tracking-[-0.045em] sm:text-[56px]">
                Plans change.
                <span className="block text-faint">Your notes keep up.</span>
              </h1>
              <p className="mt-6 max-w-[44ch] text-[18px] leading-[1.6] text-soft">
                Write plans and logs as plain notes. Dittle spots the prices, dates and distances, keeps every copy in step and adds them up for you.
              </p>
              <div className="mt-8 flex flex-wrap gap-2.5">
                <button type="button" onClick={onStart} className={PRIMARY}>
                  Get started
                </button>
                <a
                  href="/signin"
                  onClick={(event) => {
                    event.preventDefault();
                    onSignIn();
                  }}
                  className={SECONDARY}
                >
                  Sign in
                </a>
              </div>
            </div>
            <HeroDemo />
          </section>

          <Section id="capture">
            <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
              <Reveal>
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
              <h2 className={H2}>Paste the mess, get a tidy note.</h2>
              <p className={LEAD}>Drop in a group chat, an email or a booking. You get a short note with the values marked, and the dates on your home page.</p>
            </Reveal>
            <Reveal delay={0.08} className="mt-10">
              <TidyDemo />
            </Reveal>
          </Section>

          <Section id="collections">
            <Reveal>
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
              <h2 className={H2}>Starts in a minute.</h2>
              <p className={LEAD}>Pick what you keep track of. Dittle sets up the notes and collections to start from, and you write the rest your way.</p>
              <TrackPicker />
              <button type="button" onClick={onStart} className={`${PRIMARY} mt-8`}>
                Get started
                <Icon name="arrow" className="size-4" />
              </button>
            </Reveal>
          </Section>

          <Section id="how">
            <Reveal>
              <h2 className={H2}>How it works.</h2>
            </Reveal>
            <div className="mt-6">
              <StickySteps steps={STEPS} />
            </div>
          </Section>

          <Section id="privacy">
            <Reveal>
              <h2 className={H2}>On device first.</h2>
              <p className={LEAD}>Most of the work runs on Gemini Nano inside your browser or phone. The cloud steps in when your device can’t, or when the job is too big.</p>
            </Reveal>
            <Reveal delay={0.08} className="mt-10 overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-[15px]">
                <thead className="text-[13px] text-faint">
                  <tr className="border-b border-line">
                    <th className="py-2.5 pr-6 font-semibold">Job</th>
                    <th className="py-2.5 pr-6 font-semibold">Model</th>
                    <th className="py-2.5 pr-6 font-semibold">Where</th>
                    <th className="py-2.5 font-semibold">How</th>
                  </tr>
                </thead>
                <tbody>
                  {MODELS.map((row) => (
                    <tr key={row.job} className="border-b border-line align-top">
                      <td className="py-4 pr-6 leading-[1.6]">{row.job}</td>
                      <td className="py-4 pr-6 font-semibold whitespace-nowrap">{row.model}</td>
                      <td className="py-4 pr-6 whitespace-nowrap">
                        <span className={`rounded-md px-2 py-0.5 text-[13px] font-semibold ${row.where === "On device" ? "bg-accent-tint text-accent-ink" : "bg-panel text-soft"}`}>{row.where}</span>
                      </td>
                      <td className="py-4 leading-[1.6] text-soft">{row.how}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Reveal>
            <Reveal delay={0.1} className="mt-12 grid gap-x-8 gap-y-6 sm:grid-cols-3">
              <Fact icon="lock" title="Private" body="On-device jobs keep your notes on your device. Cloud fallback sends one paragraph, or the note for a request. Collection suggestions send only values." />
              <Fact icon="offline" title="Offline" body="Notes save to your device first and sync when you’re back. The on-device model works without a connection." />
              <Fact icon="code" title="Open" body="The code is on GitHub under Apache 2.0. Read how every AI call is made, or run your own copy." />
            </Reveal>
            <p className="mt-10 flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-faint">
              <span>Built on Firebase</span>
              {FIREBASE.map((product) => (
                <span key={product} className="text-soft">
                  {product}
                </span>
              ))}
            </p>
          </Section>

          <section className="border-t border-line">
            <div className={`${WRAP} py-24 text-center sm:py-32`}>
              <h2 className="text-[36px] leading-[1.08] font-semibold tracking-[-0.04em] sm:text-[52px]">
                Plans change.
                <span className="block text-faint">Your notes keep up.</span>
              </h2>
              <div className="mt-8 flex flex-wrap justify-center gap-2.5">
                <button type="button" onClick={onStart} className={PRIMARY}>
                  Get started
                </button>
                <a href={REPO_URL} className={SECONDARY}>
                  View on GitHub
                </a>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-line">
          <div className={`${WRAP} flex flex-wrap items-center justify-between gap-4 py-8 text-[14px] text-faint`}>
            <Wordmark className="text-[17px]" />
            <span>Built for #BuildHybridAI 2026</span>
            <span className="flex gap-5">
              <a href={REPO_URL} className="hover:text-ink">
                GitHub
              </a>
              <span>Apache 2.0</span>
            </span>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}

function Section({ id, children }: { id: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-16 border-t border-line">
      <div className={`${WRAP} py-20 sm:py-28`}>{children}</div>
    </section>
  );
}

function Fact({ icon, title, body }: { icon?: IconName; title: string; body: string }) {
  return (
    <div className="border-t border-line pt-4">
      <p className="flex items-center gap-2 text-[16px] font-semibold tracking-[-0.01em]">
        {icon ? <Icon name={icon} className="size-[18px] text-soft" /> : null}
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
              className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-[15px] font-medium transition-colors ${on ? "bg-ink text-page" : "border border-line-strong text-ink hover:border-ink"}`}
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
