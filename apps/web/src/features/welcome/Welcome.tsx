import { m } from "motion/react";
import { useState, type ReactNode } from "react";
import { btnClass, MIcon, TypeOn } from "../../ui/kit";
import { LogoMark, Wordmark } from "../../ui/Wordmark";
import { Demo } from "./Demo";
import { Shot } from "../../ui/Shot";
import { DeskHero } from "./DeskHero";
import { Scenes } from "./Scenes";
import { Reveal, ScrollWords, StickySteps, useSmoothScroll, type Step } from "./motion";

type WelcomeProps = {
  onStart: () => void;
  onSignIn: () => void;
};

const PILL = "inline-flex h-9 items-center gap-2 rounded-full bg-card px-4 text-[14px] font-medium text-soft shadow-[0_0_0_1px_var(--line),0_6px_14px_-8px_rgb(18_20_24/0.25)]";
const H2 = "text-[40px] leading-[1.04] font-semibold tracking-[-0.045em] sm:text-[60px]";

const REPO_URL = "https://github.com/CryptishApps/dittle";

const STEPS: Step[] = [
  {
    key: "hover",
    label: "On device",
    title: "It knows what each value is",
    body: "Type @ before a value to tag it, or let Dittle spot it for you. Gemini Nano names it, like price per head or run distance, and notices when one is worked out from others. Hover a value to see what it is and how many notes use it.",
    visual: <Shot name="hover" alt="The catering note with a card on £3,040 saying it is the price per head × the guest count." focus={{ x: 19, y: 9, zoom: 1.55 }} />,
  },
  {
    key: "panel",
    label: "On device",
    title: "Click a value to see where it lives",
    body: "A side panel shows the value, a field to change it, the notes that use it and its row in a collection. Three plans written in three different notes line up in one Things to do table, with the cost each and the date.",
    visual: <Shot name="panel" alt="A side panel for €45 with a field to change it and a Things to do table listing a fado night, Jerónimos Monastery and Pena Palace with their prices and dates." focus={{ x: 36, y: 12, zoom: 1.6 }} />,
  },
  {
    key: "change",
    label: "On device",
    title: "Change it once",
    body: "Change a value and Dittle asks whether to update every note that uses it or only this one. Anything worked out from it, like a cost each or a total, follows. The sums are done by code, not by the model.",
    visual: <Shot name="change" alt="The price per head changed from £38 to £42, with a note that £38 is used in 2 notes and a button to update both." focus={{ x: 40, y: 12, zoom: 1.7 }} />,
  },
  {
    key: "home",
    label: "On device, cloud for suggestions",
    title: "The whole plan on your home page",
    body: "Each collection adds itself up, like what the things to do cost each of you. The dates in your notes count down, and Dittle suggests a new collection when it sees a pattern.",
    visual: <Shot name="home" alt="The home page with a Things to do tile showing €95 in total, a Coming up tile counting down to the venue deposit, and a list of notes." focus={{ x: 7, y: 6, zoom: 1.7 }} />,
  },
  {
    key: "request",
    label: "On device, cloud as fallback",
    title: "Ask in the note itself",
    body: "Write “Write a packing list for a day trip to Sintra” and a button appears with the list already written. Hover to preview it, then add it below or replace your request. Type / for the same thing from a menu.",
    visual: <Shot name="request" alt="The Sintra day trip note with an Add a packing list button and a preview of the checklist." focus={{ x: 20, y: 20, zoom: 1.55 }} />,
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

export function Welcome({ onStart, onSignIn }: WelcomeProps) {
  useSmoothScroll();

  return (
    <div className="min-h-dvh overflow-x-clip bg-page text-ink">
      <nav className="fixed inset-x-0 top-0 z-50 bg-page/85 backdrop-blur-md">
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between gap-6 px-5 sm:px-10">
          <Wordmark className="text-[23px]" />
          <div className="hidden items-center gap-9 text-[16px] font-medium text-ink/80 md:flex">
            <a href="#features" className="hover:text-ink">
              Features
            </a>
            <a href="#collections" className="hover:text-ink">
              Collections
            </a>
            <a href="#how" className="hover:text-ink">
              How it works
            </a>
            <a href="#models" className="hover:text-ink">
              Privacy
            </a>
            <a href={REPO_URL} className="hover:text-ink">
              GitHub
            </a>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <a
              href="/signin"
              onClick={(event) => {
                event.preventDefault();
                onSignIn();
              }}
              className="hidden h-11 items-center px-2 text-[16px] font-medium text-ink/80 transition-colors hover:text-ink sm:inline-flex"
            >
              Sign in
            </a>
            <button type="button" onClick={onStart} className={`${btnClass({ variant: "secondary", size: "md" })} h-11 border-[1.5px] px-5 text-[15.5px]`}>
              Start a plan
            </button>
          </div>
        </div>
      </nav>

      <main>
      <DeskHero onStart={onStart} />

      <Section id="features" label="What it does">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr] lg:items-end">
          <Reveal>
            <h2 className={H2}>Plain notes that do the sums.</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="max-w-[48ch] text-[17px] leading-[1.7] text-soft lg:justify-self-end">
              Dittle reads the prices, dates and distances in what you write. It keeps every copy in step, files them into tables and counts down to the dates.
            </p>
          </Reveal>
        </div>
        <Reveal delay={0.1} className="mt-12">
          <Scenes />
        </Reveal>
      </Section>

      <section className="mx-auto max-w-[1200px] px-6 py-24 sm:px-8 sm:py-36">
        <ScrollWords text="Plans and logs keep repeating the same few details: [what it costs], [when], [how far]. Dittle notices them on your device, keeps every copy in step and files them into tables that add themselves up." />
      </section>

      <Section id="collections" label="Collections">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr] lg:items-end">
          <Reveal>
            <h2 className={H2}>Tables that build themselves.</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="max-w-[48ch] text-[17px] leading-[1.7] text-soft lg:justify-self-end">
              Click a value and start a collection, like Runs or Things to do. After that, anything you write that fits files itself in. Try it: change the distance and watch the week add up.
            </p>
          </Reveal>
        </div>
        <Reveal delay={0.1} className="mt-12">
          <Demo />
        </Reveal>
        <Reveal delay={0.1} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Fact title="A row per day or per thing" body="A log like Runs gets a row for each day. A list like Things to do gets a row for each place or booking." />
          <Fact title="Totals and averages" body="Each collection adds itself up on your home page: distance this week, cost each, average pace." />
          <Fact title="Calculated columns" body="Add a column worked out from the others, like pace from time and distance. Code does the maths." />
          <Fact title="Suggested for you" body="When the same details turn up across notes, Dittle offers a collection. Only the values are sent to the cloud." />
        </Reveal>
      </Section>

      <div className="desk mx-2 rounded-[26px] sm:mx-4 sm:rounded-[34px]">
        <Section id="how" label="How it works" dark>
          <StickySteps steps={STEPS} />
        </Section>
      </div>

      <Section id="models" label="Where the AI runs">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr] lg:items-end">
          <Reveal>
            <h2 className={H2}>On device first.</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="max-w-[46ch] text-[16.5px] leading-[1.7] text-soft lg:justify-self-end">
              Most of the work runs on Gemini Nano inside your browser or phone. The cloud steps in when your device can't, or when the job is too big.
            </p>
          </Reveal>
        </div>
        <Reveal delay={0.1} className="mt-12 overflow-x-auto rounded-[22px] bg-card shadow-sheet">
          <table className="w-full min-w-[720px] text-left text-[15px]">
            <thead className="bg-panel text-[13.5px] text-faint">
              <tr>
                <th className="px-6 py-3.5 font-semibold">Job</th>
                <th className="px-6 py-3.5 font-semibold">Model</th>
                <th className="px-6 py-3.5 font-semibold">Where</th>
                <th className="px-6 py-3.5 font-semibold">How</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {MODELS.map((row) => (
                <tr key={row.job} className="transition-colors hover:bg-panel">
                  <td className="px-6 py-4 leading-[1.6]">{row.job}</td>
                  <td className="px-6 py-4 font-semibold whitespace-nowrap">{row.model}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`rounded-full px-2.5 py-1 text-[12.5px] font-semibold ${row.where === "On device" ? "bg-accent-tint text-accent-ink" : "bg-chip text-soft"}`}>
                      {row.where}
                    </span>
                  </td>
                  <td className="px-6 py-4 leading-[1.6] text-soft">{row.how}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
        <Reveal delay={0.1} className="mt-4 grid gap-4 sm:grid-cols-3">
          <Fact title="Private" body="On-device jobs keep your notes on your device. Cloud fallback sends one paragraph, or the note for a request. Collection suggestions send only values." />
          <Fact title="Offline" body="Notes save to your device first and sync when you're back. The on-device model works without a connection." />
          <Fact title="Open" body="The code is on GitHub under Apache 2.0. Read how every AI call is made, or run your own copy." />
        </Reveal>
        <Reveal delay={0.1} className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-[14px] font-medium text-faint">
          <span>Built on Firebase</span>
          {FIREBASE.map((product) => (
            <span key={product} className="text-soft">
              {product}
            </span>
          ))}
        </Reveal>
      </Section>

      </main>

      <div className="desk relative mx-2 mb-2 overflow-hidden rounded-[26px] sm:mx-4 sm:mb-4 sm:rounded-[34px]">
        <FooterObjects />
        <section className="relative mx-auto max-w-[1200px] px-6 py-28 sm:px-8 sm:py-36">
          <Reveal>
            <p className={PILL}>Start</p>
            <h2 className="mt-7 max-w-[14ch] text-[50px] leading-[1] font-semibold tracking-[-0.05em] sm:text-[96px]">
              <InViewTypeOn text="Plan it once." />
            </h2>
            <div className="mt-12 flex flex-wrap gap-2.5">
              <button type="button" onClick={onStart} className={btnClass({ variant: "primary", size: "lg" })}>
                Start planning
                <MIcon name="right" className="size-4" />
              </button>
              <a href={REPO_URL} className={btnClass({ variant: "secondary", size: "lg" })}>
                View on GitHub
              </a>
            </div>
          </Reveal>
        </section>
        <footer className="relative mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 border-t border-line-strong px-6 py-7 text-[14px] text-soft sm:px-8">
          <Wordmark className="text-[19px] [--mark-gap:var(--side)]" />
          <span>Built for #BuildHybridAI 2026</span>
          <span className="flex gap-5">
            <a href={REPO_URL} className="hover:text-ink">
              GitHub
            </a>
            <span>Apache 2.0</span>
          </span>
        </footer>
      </div>
    </div>
  );
}

function FooterObjects() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
      <span className="tile absolute top-[16%] right-[30%] grid h-[92px] rotate-[8deg] place-items-center px-5 text-[38px] font-semibold tracking-[-0.04em]">£42</span>
      <span className="tile absolute top-[46%] right-[10%] w-[92px] -rotate-6 overflow-hidden text-center">
        <span className="block bg-date py-1 text-[12px] font-bold tracking-[0.08em] text-date-ink">DEC</span>
        <span className="block pt-0.5 text-[38px] leading-tight font-semibold">11</span>
        <span className="block pb-2 text-[11px] font-semibold text-soft">Friday</span>
      </span>
      <span className="tile absolute top-[12%] right-[8%] grid size-[84px] -rotate-[10deg] place-items-center [--mark-gap:var(--card-top)]">
        <LogoMark className="size-11" />
      </span>
      <span className="sticky-note absolute right-[24%] bottom-[22%] w-[190px] rotate-[4deg] px-5 py-5 font-hand text-[24px] leading-[1.15]">Write it once. Every note keeps up.</span>
    </div>
  );
}

function Section({ id, label, dark = false, children }: { id: string; label: string; dark?: boolean; children: ReactNode }) {
  return (
    <section id={id} className={`mx-auto max-w-[1200px] scroll-mt-24 px-6 sm:px-8 ${dark ? "py-24 sm:py-32" : "py-24 sm:py-32"}`}>
      <div className="mb-10">
        <span className={PILL}>{label}</span>
      </div>
      {children}
    </section>
  );
}

function Fact({ title, body }: { title: string; body: string }) {
  return (
    <div className="tile p-6">
      <p className="text-[22px] font-semibold tracking-[-0.025em]">{title}</p>
      <p className="mt-2 text-[15.5px] leading-[1.65] text-soft">{body}</p>
    </div>
  );
}

function InViewTypeOn({ text }: { text: string }) {
  const [shown, setShown] = useState(false);
  return (
    <m.span onViewportEnter={() => setShown(true)} viewport={{ once: true }}>
      {shown ? <TypeOn text={text} duration={700} /> : <span className="opacity-0">{text}</span>}
    </m.span>
  );
}

