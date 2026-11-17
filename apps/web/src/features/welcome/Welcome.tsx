import { m } from "motion/react";
import { useState, type ReactNode } from "react";
import { btnClass, MIcon, TypeOn, type MIconName } from "../../ui/kit";
import { LogoMark, Wordmark } from "../../ui/Wordmark";
import { Demo } from "./Demo";
import { Shot } from "../../ui/Shot";
import { DeskHero } from "./DeskHero";
import { Floating, Reveal, Rise, ScrollWords, StickySteps, TiltedShot, useSmoothScroll, type Step } from "./motion";

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
    body: "Type @ before a value to tag it. Gemini Nano names it, like guest count or villa cost, and notices when one is worked out from others. Hover a value to see what it is and how many notes use it.",
    visual: <Shot name="hover" alt="A villa note with a card on €280 saying it is the villa cost ÷ the guest count." focus={{ x: 25, y: 11, zoom: 1.43 }} />,
  },
  {
    key: "panel",
    label: "On device",
    title: "Click a value to see where it lives",
    body: "A side panel shows the value, a field to change it, the notes that use it and its row in a collection. Three plans written in three notes line up in one Things to do table, with the cost each and the date.",
    visual: <Shot name="panel" alt="A side panel for €45 with a field to change it and a Things to do table listing a fado night, Jerónimos Monastery and Pena Palace with their prices and dates." focus={{ x: 39, y: 6, zoom: 1.65 }} />,
  },
  {
    key: "change",
    label: "On device",
    title: "Change it once",
    body: "Two more friends are coming. Change 6 to 8 and Dittle asks whether to update every note that uses it or only this one. The sums follow: flights go from £708 to £944 and the villa from €280 each to €210, worked out by code, not by the model.",
    visual: <Shot name="change" alt="The guest count changed from 6 to 8, with a note that 6 is used in 2 notes and a button to update both." focus={{ x: 50, y: 6, zoom: 2 }} />,
  },
  {
    key: "home",
    label: "On device, cloud for suggestions",
    title: "The whole plan on your home page",
    body: "Each collection adds itself up, like what the things to do cost each of you. The dates in your notes count down, and Dittle suggests a new collection when it sees a pattern.",
    visual: <Shot name="home" alt="The home page with a Things to do tile showing €95 in total, a Coming up tile counting down 24 days to the flight, and a list of notes." focus={{ x: 19.5, y: 10, zoom: 1.65 }} />,
  },
  {
    key: "request",
    label: "On device, cloud as fallback",
    title: "Ask in the note itself",
    body: "Write “Write a packing list for a long weekend in Lisbon” and a button appears with the list already written. Hover to preview it, then add it below or replace your request. Type / for the same thing from a menu.",
    visual: <Shot name="request" alt="The flights note with an Add a packing list button and a preview of the checklist." focus={{ x: 24, y: 12.5, zoom: 1.6 }} />,
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
            <a href="#try" className="hover:text-ink">
              Try it
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

      <section className="mx-auto max-w-[1200px] px-6 pt-24 sm:px-8 sm:pt-32">
        <Rise className="text-center">
          <span className={PILL}>Two more friends are coming to Lisbon</span>
        </Rise>
        <Rise delay={0.1} className="mt-10">
          <TiltedShot
            floating={(progress) => (
              <>
                <Floating progress={progress} distance={60} className="top-[30%] -left-3 hidden md:block lg:-left-10">
                  <Note icon="equals" title="€210 each follows the change" detail="Villa cost ÷ guest count" />
                </Floating>
                <Floating progress={progress} distance={110} className="top-[48%] -right-3 hidden md:block lg:-right-10">
                  <Note icon="check" title="8 people in 2 notes" detail="Villa, Flights" accent />
                </Floating>
                <Floating progress={progress} distance={80} className="-bottom-6 left-[38%] hidden md:block">
                  <Note icon="chip" title="Read on this device" detail="Gemini Nano · Prompt API" />
                </Floating>
              </>
            )}
          >
            <div className="tile p-2">
              <div className="overflow-hidden rounded-[16px]">
                <Shot name="hero" alt="A villa note after the group grew from 6 to 8: the cost each now reads €210, and a side panel lists the two notes that use the group size." />
              </div>
            </div>
          </TiltedShot>
        </Rise>
      </section>

      <Section id="try" label="Try it">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr] lg:items-end">
          <Reveal>
            <h2 className={H2}>Change it once.</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="max-w-[46ch] text-[16.5px] leading-[1.7] text-soft lg:justify-self-end">
              Two more friends are coming. Change the group size in the villa note. Three other notes mention the same number, so Dittle offers to bring them along.
            </p>
          </Reveal>
        </div>
        <Reveal delay={0.1} className="mt-12">
          <Demo />
        </Reveal>
      </Section>

      <section className="mx-auto max-w-[1200px] px-6 py-32 sm:px-8 sm:py-44">
        <ScrollWords text="Every plan repeats the same details: [how many are coming], [when], [what it costs]. Dittle notices them on your device and keeps every copy in step, so a change in one place is never forgotten in another." />
      </section>

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
      <span className="tile absolute top-[16%] right-[30%] grid size-[92px] rotate-[8deg] place-items-center text-[44px] font-semibold tracking-[-0.04em]">8</span>
      <span className="tile absolute top-[46%] right-[10%] w-[92px] -rotate-6 overflow-hidden text-center">
        <span className="block bg-date py-1 text-[12px] font-bold tracking-[0.08em] text-date-ink">DEC</span>
        <span className="block pt-0.5 text-[38px] leading-tight font-semibold">11</span>
        <span className="block pb-2 text-[11px] font-semibold text-soft">Friday</span>
      </span>
      <span className="tile absolute top-[12%] right-[8%] grid size-[84px] -rotate-[10deg] place-items-center [--mark-gap:var(--card-top)]">
        <LogoMark className="size-11" />
      </span>
      <span className="sticky-note absolute right-[24%] bottom-[22%] w-[190px] rotate-[4deg] px-5 py-5 font-hand text-[24px] leading-[1.15]">Change it once. Every note keeps up.</span>
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

function Note({ icon, title, detail, accent = false }: { icon: MIconName; title: string; detail: string; accent?: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-[18px] py-2.5 pr-5 pl-2.5 ${accent ? "sticky-note" : "tile"}`}>
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${accent ? "bg-sticky-ink text-sticky" : "bg-accent text-on-accent shadow-press"}`}>
        <MIcon name={icon} className="size-[18px]" />
      </span>
      <span className="text-[14.5px] leading-[1.35]">
        <span className="block font-semibold">{title}</span>
        <span className={`block text-[13px] ${accent ? "text-sticky-soft" : "text-soft"}`}>{detail}</span>
      </span>
    </div>
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

