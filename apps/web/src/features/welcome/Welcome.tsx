import { m } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { Code, MIcon, Scramble } from "../../ui/kit";
import { Wordmark } from "../../ui/Wordmark";
import { Demo } from "./Demo";
import { Shot } from "../../ui/Shot";
import { Floating, Reveal, Rise, ScrollWords, StickySteps, TiltedShot, useSmoothScroll, type Step } from "./motion";

type WelcomeProps = {
  onStart: () => void;
  onSignIn: () => void;
};

const REPO_URL = "https://github.com/CryptishApps/dittle";

const STEPS: Step[] = [
  {
    key: "hover",
    label: "On device",
    title: "It knows what each value is",
    body: "Type @ before a value to tag it. Gemini Nano names it, like guest count or villa cost, and notices when one is worked out from others. Hover a value to see what it is and how many notes use it.",
    visual: <Shot name="hover" theme="dark" alt="A villa note with a card on €280 saying it is the villa cost ÷ the guest count." focus={{ x: 23, y: 14, zoom: 1.9 }} />,
  },
  {
    key: "panel",
    label: "On device",
    title: "Click a value to see where it lives",
    body: "A side panel shows the value, a field to change it, the notes that use it and its row in a collection. Three plans written in three notes line up in one Things to do table, with the cost each and the date.",
    visual: <Shot name="panel" theme="dark" alt="A side panel for €45 with a field to change it and a Things to do table listing a fado night, Jerónimos Monastery and Pena Palace with their prices and dates." focus={{ x: 53.5, y: 9, zoom: 2.15 }} />,
  },
  {
    key: "change",
    label: "On device",
    title: "Change it once",
    body: "Two more friends are coming. Change 6 to 8 and Dittle asks whether to update every note that uses it or only this one. The sums follow: flights go from £708 to £944 and the villa from €280 each to €210, worked out by code, not by the model.",
    visual: <Shot name="change" theme="dark" alt="The guest count changed from 6 to 8, with a note that 6 is used in 2 notes and a button to update both." focus={{ x: 56.5, y: 9, zoom: 2.3 }} />,
  },
  {
    key: "home",
    label: "On device, cloud for suggestions",
    title: "The whole plan on your home page",
    body: "Each collection adds itself up, like what the things to do cost each of you. The dates in your notes count down, and Dittle suggests a new collection when it sees a pattern.",
    visual: <Shot name="home" theme="dark" alt="The home page with a Things to do tile showing €95 in total, a Coming up tile counting down 24 days to the flight, and a list of notes." focus={{ x: 19.5, y: 10, zoom: 1.65 }} />,
  },
  {
    key: "request",
    label: "On device, cloud as fallback",
    title: "Ask in the note itself",
    body: "Write “Write a packing list for a long weekend in Lisbon” and a button appears with the list already written. Hover to preview it, then add it below or replace your request. Type / for the same thing from a menu.",
    visual: <Shot name="request" theme="dark" alt="The flights note with an Add a packing list button and a preview of the checklist." focus={{ x: 24, y: 12.5, zoom: 1.6 }} />,
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
  const navDark = useNavOverDark();
  const [found, setFound] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setFound(true), 1100);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="guides min-h-dvh overflow-x-clip bg-page text-ink">
      <nav className={`fixed inset-x-0 top-3 z-50 px-3 ${navDark ? "theme-dark" : ""}`}>
        <div className="mx-auto flex h-12 max-w-[1200px] items-center justify-between border border-line-strong bg-page/85 pr-1.5 pl-4 text-ink backdrop-blur-md transition-colors duration-300">
          <Wordmark className="text-[14px]" />
          <div className="hidden items-center gap-7 text-[11px] tracking-[0.06em] text-soft uppercase md:flex">
            <a href="#try" className="hover:text-ink">
              Try it
            </a>
            <a href="#how" className="hover:text-ink">
              How it works
            </a>
            <a href="#models" className="hover:text-ink">
              Models
            </a>
            <a href={REPO_URL} className="hover:text-ink">
              GitHub
            </a>
          </div>
          <div className="flex items-center gap-1">
          <a
            href="/signin"
            onClick={(event) => {
              event.preventDefault();
              onSignIn();
            }}
            className="inline-flex h-9 items-center px-3 text-[11px] tracking-[0.06em] text-soft uppercase hover:text-ink"
          >
            Sign in
          </a>
          <button
            type="button"
            onClick={onStart}
            className="inline-flex h-9 items-center gap-2 bg-ink px-4 text-[11px] tracking-[0.06em] text-page uppercase transition-opacity hover:opacity-90"
          >
            Start planning
            <MIcon name="right" className="size-3.5" />
          </button>
          </div>
        </div>
      </nav>

      <main>
      <header className="relative mx-auto max-w-[1200px] px-6 pt-36 sm:px-8 sm:pt-44">
        <Rise>
          <span className="inline-flex items-center gap-2.5 border border-line-strong bg-card px-2.5 py-1.5 text-[11px] tracking-[0.06em] text-soft uppercase">
            <span aria-hidden className="size-1.5 animate-pulse bg-accent" />
            Gemini Nano · runs on your device
          </span>
        </Rise>
        <h1 className="mt-8 text-[40px] leading-[1.06] font-medium tracking-[-0.06em] [--caret-w:0.32em] sm:text-[60px] lg:text-[76px]">
          Plans that keep <br className="hidden sm:block" />
          themselves{" "}
          <span className="whitespace-nowrap">
            <span className="token" data-found={found}>
              up to date
            </span>
            <span className="caret" aria-hidden />
          </span>
        </h1>
        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <Rise delay={0.16}>
            <p className="max-w-[50ch] text-[16px] leading-[1.75] text-soft sm:text-[17px]">
              Plan a trip, a wedding or a team offsite in plain notes. Change a date, price or headcount in one, and Dittle updates every other note that mentions it.{" "}
              <span className="text-ink">Private, instant, works offline.</span>
            </p>
          </Rise>
          <Rise delay={0.24}>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onStart}
                className="inline-flex h-11 items-center gap-2 bg-ink px-5 text-[12px] tracking-[0.06em] text-page uppercase transition-opacity hover:opacity-90"
              >
                Start planning
                <MIcon name="right" className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={onSignIn}
                className="inline-flex h-11 items-center border border-line-strong bg-card px-5 text-[12px] tracking-[0.06em] uppercase transition-colors hover:border-ink"
              >
                Sign in
              </button>
            </div>
            <p className="mt-3 text-[11px] tracking-[0.06em] text-faint uppercase">Free · Works offline · Apache 2.0</p>
          </Rise>
        </div>

        <Rise delay={0.3} className="mt-20 sm:mt-28">
          <div className="mb-3 flex items-center justify-between text-[11px] tracking-[0.06em] text-faint uppercase">
            <span>Fig. 00 — Two more friends are coming to Lisbon</span>
            <span className="hidden sm:inline">1280 × 800</span>
          </div>
          <TiltedShot
            floating={(progress) => (
              <>
                <Floating progress={progress} distance={60} className="top-[30%] -left-3 hidden md:block lg:-left-10">
                  <Note code="FX" title="€210 each follows the change" detail="Villa cost ÷ guest count" />
                </Floating>
                <Floating progress={progress} distance={110} className="top-[48%] -right-3 hidden md:block lg:-right-10">
                  <Note code="UP" title="8 people in 2 notes" detail="Villa, Flights" accent />
                </Floating>
                <Floating progress={progress} distance={80} className="-bottom-6 left-[38%] hidden md:block">
                  <Note code="ND" title="Read on this device" detail="Gemini Nano · Prompt API" />
                </Floating>
              </>
            )}
          >
            <div className="brackets border border-line-strong bg-card p-1.5 shadow-pop [--bracket-inset:-9px] [--bracket-size:16px]">
              <Shot name="hero" priority alt="A villa note after the group grew from 6 to 8: the cost each now reads €210, and a side panel lists the two notes that use the group size." />
            </div>
          </TiltedShot>
        </Rise>
      </header>

      <Section id="try" index="01" label="Try it">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr] lg:items-end">
          <Reveal>
            <h2 className="text-[34px] leading-[1.05] font-medium tracking-[-0.05em] sm:text-[52px]">Change it once.</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="max-w-[46ch] text-[15px] leading-[1.75] text-soft lg:justify-self-end">
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

      <div data-dark className="theme-dark bg-page text-ink">
        <Section id="how" index="02" label="How it works" dark>
          <StickySteps steps={STEPS} />
        </Section>
      </div>

      <Section id="models" index="03" label="Where the AI runs">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr] lg:items-end">
          <Reveal>
            <h2 className="text-[34px] leading-[1.05] font-medium tracking-[-0.05em] sm:text-[52px]">On device first.</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="max-w-[46ch] text-[15px] leading-[1.75] text-soft lg:justify-self-end">
              Most of the work runs on Gemini Nano inside your browser or phone. The cloud steps in when your device can't, or when the job is too big.
            </p>
          </Reveal>
        </div>
        <Reveal delay={0.1} className="mt-12 overflow-x-auto border border-line-strong">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead className="bg-side text-[11px] tracking-[0.06em] text-faint uppercase">
              <tr>
                <th className="px-5 py-3 font-normal">Job</th>
                <th className="px-5 py-3 font-normal">Model</th>
                <th className="px-5 py-3 font-normal">Where</th>
                <th className="px-5 py-3 font-normal">How</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {MODELS.map((row) => (
                <tr key={row.job} className="bg-card transition-colors hover:bg-panel">
                  <td className="px-5 py-4 leading-[1.6]">{row.job}</td>
                  <td className="px-5 py-4 whitespace-nowrap">{row.model}</td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={`px-1.5 py-0.5 text-[11px] tracking-[0.05em] uppercase ${row.where === "On device" ? "bg-accent-tint text-accent-ink" : "bg-chip text-soft"}`}>
                      {row.where}
                    </span>
                  </td>
                  <td className="px-5 py-4 leading-[1.6] text-soft">{row.how}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
        <Reveal delay={0.1} className="mt-px grid border border-t-0 border-line-strong sm:grid-cols-3">
          <Fact title="Private" body="On-device jobs keep your notes on your device. Cloud fallback sends one paragraph, or the note for a request. Collection suggestions send only values." />
          <Fact title="Offline" body="Notes save to your device first and sync when you're back. The on-device model works without a connection." />
          <Fact title="Open" body="The code is on GitHub under Apache 2.0. Read how every AI call is made, or run your own copy." />
        </Reveal>
        <Reveal delay={0.1} className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-[11px] tracking-[0.06em] text-faint uppercase">
          <span>Built on Firebase</span>
          {FIREBASE.map((product) => (
            <span key={product} className="text-soft">
              {product}
            </span>
          ))}
        </Reveal>
      </Section>

      </main>

      <div data-dark className="theme-dark bg-page text-ink">
        <section className="mx-auto max-w-[1200px] px-6 py-32 sm:px-8 sm:py-40">
          <Reveal>
            <p className="text-[11px] tracking-[0.06em] text-faint uppercase">04 — Start</p>
            <h2 className="mt-6 max-w-[14ch] text-[44px] leading-[1.02] font-medium tracking-[-0.06em] sm:text-[88px]">
              <InViewScramble text="Plan it once." />
            </h2>
            <div className="mt-12 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onStart}
                className="inline-flex h-11 items-center gap-2 bg-ink px-5 text-[12px] tracking-[0.06em] text-page uppercase transition-opacity hover:opacity-90"
              >
                Start planning
                <MIcon name="right" className="size-3.5" />
              </button>
              <a
                href={REPO_URL}
                className="inline-flex h-11 items-center border border-line-strong px-5 text-[12px] tracking-[0.06em] uppercase transition-colors hover:border-ink"
              >
                View on GitHub
              </a>
            </div>
          </Reveal>
        </section>
        <footer className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 border-t border-line px-6 py-6 text-[11px] tracking-[0.06em] text-faint uppercase sm:px-8">
          <Wordmark className="text-[12px]" />
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

function useNavOverDark(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const check = () => {
      const probe = 36;
      setDark(
        [...document.querySelectorAll<HTMLElement>("[data-dark]")].some((el) => {
          const rect = el.getBoundingClientRect();
          return rect.top <= probe && rect.bottom >= probe;
        }),
      );
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);
  return dark;
}

function Section({ id, index, label, dark = false, children }: { id: string; index: string; label: string; dark?: boolean; children: ReactNode }) {
  return (
    <section id={id} className={`mx-auto max-w-[1200px] scroll-mt-20 px-6 sm:px-8 ${dark ? "py-28 sm:py-36" : "py-24 sm:py-32"}`}>
      <div className="mb-10 flex items-center gap-4 text-[11px] tracking-[0.06em] text-faint uppercase">
        <span className="text-accent-ink">{index}</span>
        {label}
        <span className="h-px flex-1 bg-line" />
      </div>
      {children}
    </section>
  );
}

function Note({ code, title, detail, accent = false }: { code: string; title: string; detail: string; accent?: boolean }) {
  return (
    <div className={`flex items-center gap-3 border bg-card py-2.5 pr-4 pl-3 shadow-pop ${accent ? "border-accent-line" : "border-line-strong"}`}>
      <Code className="size-8 text-[11px]">{code}</Code>
      <span className="text-[12px] leading-[1.4]">
        <span className={`block font-medium ${accent ? "text-accent-ink" : ""}`}>{title}</span>
        <span className="block text-[10.5px] tracking-[0.05em] text-faint uppercase">{detail}</span>
      </span>
    </div>
  );
}

function Fact({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-t border-line-strong bg-card p-6 sm:border-t-0 sm:border-l sm:first:border-l-0">
      <p className="text-[11px] tracking-[0.06em] text-accent-ink uppercase">{title}</p>
      <p className="mt-3 text-[13px] leading-[1.7] text-soft">{body}</p>
    </div>
  );
}

function InViewScramble({ text }: { text: string }) {
  const [shown, setShown] = useState(false);
  return (
    <m.span onViewportEnter={() => setShown(true)} viewport={{ once: true }}>
      {shown ? <Scramble text={text} duration={900} /> : <span className="opacity-0">{text}</span>}
    </m.span>
  );
}

