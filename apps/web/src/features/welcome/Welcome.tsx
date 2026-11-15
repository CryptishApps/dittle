import { useScroll } from "motion/react";
import { useRef, type ReactNode } from "react";
import { BucketTag } from "../../ui/BucketPill";
import { SourceTag } from "../../ui/InferenceMeter";
import { Mark } from "../../ui/Mark";
import { Wordmark } from "../../ui/Wordmark";
import { Floating, Rise, ScrollWords, Shot, StickySteps, TiltedShot, useSmoothScroll, type Step } from "./motion";

type WelcomeProps = {
  onStart: () => void;
  onGoogle: () => void;
  busy?: boolean;
  error?: string;
};

const REPO_URL = "https://github.com/CryptishApps/dittle";

const STEPS: Step[] = [
  {
    shot: "update",
    alt: "A note where 80 guests became 95, with a dark card offering to update Budget, Chair hire and Email to Sam.",
    tag: <SourceTag source="device" />,
    title: "Change it once",
    body: "Change 80 guests to 95 and Dittle already knows the other notes that mention it. One tap updates them all.",
  },
  {
    shot: "insert",
    alt: "A request line in a note with an Add 7 meals button and a preview of the meals.",
    tag: <SourceTag source="device" />,
    title: "Ask inside the note",
    body: "Write \"add in a list of meals here\". A button appears with the list already written. Hover to preview, tap to add.",
  },
  {
    shot: "buckets",
    alt: "A new note called Pick up the rings being sorted into the Wedding bucket.",
    tag: <SourceTag source="device" />,
    title: "Buckets sort themselves",
    body: "Every new note lands in the right bucket from what it says. Wedding, work, the Lisbon trip. No folders to pick.",
  },
  {
    shot: "recalc",
    alt: "A budget where food, chairs and the total were worked out again for 95 guests.",
    tag: <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white/70">Plain maths</span>,
    title: "Sums that keep up",
    body: "When a number changes, totals that use it are worked out again. Code does the maths, so nothing is guessed.",
  },
  {
    shot: "collections",
    alt: "A Vendors table built from three notes with price, deposit and contact.",
    tag: <SourceTag source="cloud" />,
    title: "Collections, found for you",
    body: "Notes about the same kind of thing become a table, like vendors with price, deposit and contact. The cloud only sees the values, never the notes.",
  },
  {
    shot: "offline",
    alt: "A note being written offline, saved on the device.",
    tag: <SourceTag source="device" />,
    title: "Works offline",
    body: "Notes save to your device first, and the AI runs there too. Everything syncs when you're back online.",
  },
];

export function Welcome({ onStart, onGoogle, busy = false, error }: WelcomeProps) {
  useSmoothScroll();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });

  return (
    <div className="min-h-dvh overflow-x-clip bg-paper">
      <nav className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
        <div className="flex items-center gap-1 rounded-full bg-paper-raised/90 p-1.5 pl-4 shadow-card backdrop-blur">
          <Wordmark className="mr-3 text-[19px]" />
          <a href="#how" className="hidden rounded-full px-3.5 py-2 text-[14px] font-bold text-ink-soft hover:text-ink sm:block">
            How it works
          </a>
          <a href={REPO_URL} className="hidden rounded-full px-3.5 py-2 text-[14px] font-bold text-ink-soft hover:text-ink sm:block">
            GitHub
          </a>
          <button
            type="button"
            onClick={onStart}
            disabled={busy}
            className="rounded-full bg-primary px-4 py-2 text-[14px] font-bold text-primary-ink transition active:scale-95 disabled:opacity-60"
          >
            Start writing
          </button>
        </div>
      </nav>

      <main>
        <section ref={heroRef} className="relative px-4 pt-36 sm:px-8 sm:pt-44">
          <div className="mx-auto max-w-5xl text-center">
            <Rise>
              <span className="inline-flex items-center gap-2 rounded-full bg-paper-raised px-3.5 py-1.5 text-[13px] font-bold text-ink-soft shadow-card">
                <span aria-hidden className="size-2 rounded-full bg-hl-green ring-2 ring-hl-green/40" />
                Notes with AI that runs on your device
              </span>
            </Rise>
            <Rise delay={0.08}>
              <h1 className="mt-7 text-[52px] leading-[0.98] font-extrabold tracking-[-0.055em] text-balance sm:text-[96px]">
                Change it once.
                <br />
                Every note{" "}
                <Mark swipe delay={900}>
                  follows.
                </Mark>
              </h1>
            </Rise>
            <Rise delay={0.16}>
              <p className="mx-auto mt-7 max-w-[44ch] text-[18px] leading-relaxed font-medium text-ink-soft sm:text-[21px]">
                Write notes the way you always do. Dittle notices the numbers, dates and names you repeat, and keeps every
                note in step when one changes.
              </p>
            </Rise>
            <Rise delay={0.24} className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onStart}
                disabled={busy}
                className="rounded-full bg-primary px-7 py-4 text-[16px] font-bold text-primary-ink transition active:scale-[0.97] disabled:opacity-60"
              >
                Start writing
              </button>
              <button
                type="button"
                onClick={onGoogle}
                disabled={busy}
                className="inline-flex items-center gap-2.5 rounded-full bg-paper-raised px-7 py-4 text-[16px] font-bold shadow-card transition active:scale-[0.97] disabled:opacity-60"
              >
                <GoogleMark />
                Continue with Google
              </button>
            </Rise>
            <Rise delay={0.3}>
              <p className="mt-4 text-[14px] font-semibold text-ink-faint">No account needed · Works offline · Free</p>
              {error && (
                <p role="alert" className="mt-3 text-[14px] font-semibold text-caution">
                  {error}
                </p>
              )}
            </Rise>
          </div>

          <div className="mx-auto mt-20 max-w-6xl">
            <TiltedShot
              floating={
                <>
                  <Floating progress={heroProgress} distance={180} className="top-[18%] -left-6 hidden lg:block">
                    <Chip>
                      <SourceTag source="device" /> Read your note · 180 ms
                    </Chip>
                  </Floating>
                  <Floating progress={heroProgress} distance={320} className="top-[46%] -right-8 hidden lg:block">
                    <Chip>
                      <Mark>Updated</Mark> Budget, Chair hire, Email to Sam
                    </Chip>
                  </Floating>
                  <Floating progress={heroProgress} distance={250} className="bottom-[16%] -left-10 hidden lg:block">
                    <Chip>
                      Sorted into <BucketTag bucket={{ name: "Wedding", color: "green" }} />
                    </Chip>
                  </Floating>
                  <Floating progress={heroProgress} distance={140} className="-top-6 right-[12%] hidden lg:block">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-[14px] font-bold text-primary-ink shadow-pop">
                      + Add 7 meals
                    </span>
                  </Floating>
                </>
              }
            >
              <div className="overflow-hidden rounded-[28px] bg-paper-raised p-2 shadow-pop sm:rounded-[36px] sm:p-3">
                <div className="overflow-hidden rounded-[22px] sm:rounded-[28px]">
                  <Shot
                    name="editor"
                    alt="The Dittle app: a grid of notes sorted into buckets, and a catering note where 80 guests became 95 with a card offering to update three other notes."
                  />
                </div>
              </div>
            </TiltedShot>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-36 sm:px-8 sm:py-52">
          <ScrollWords
            text="Your notes repeat the same numbers, dates and names. Dittle notices them as you write, right on your device, and keeps every note in step."
            marked="right on your device"
          />
        </section>

        <section id="how" className="rounded-t-[40px] bg-[#0d0d0d] px-4 py-24 text-white sm:rounded-t-[64px] sm:px-8 sm:py-32">
          <div className="mx-auto max-w-6xl">
            <p className="text-[15px] font-bold text-white/50">How it works</p>
            <h2 className="mt-3 max-w-[16ch] text-[40px] leading-[1.02] font-extrabold tracking-[-0.045em] sm:text-[68px]">
              The busywork, done quietly.
            </h2>
            <div className="mt-10">
              <StickySteps steps={STEPS} />
            </div>
          </div>
        </section>

        <section className="bg-[#0d0d0d]">
          <div className="rounded-t-[40px] bg-paper px-4 py-24 sm:rounded-t-[64px] sm:px-8 sm:py-32">
            <div className="mx-auto max-w-6xl">
              <h2 className="max-w-[18ch] text-[40px] leading-[1.02] font-extrabold tracking-[-0.045em] sm:text-[68px]">
                On your device first. <span className="text-ink-faint">Cloud when it helps.</span>
              </h2>
              <div className="mt-14 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
                <div className="rounded-[36px] bg-paper-raised p-7 shadow-card sm:p-10">
                  <SourceTag source="device" />
                  <h3 className="mt-4 text-[30px] font-extrabold tracking-[-0.04em]">Gemini Nano</h3>
                  <p className="mt-2 max-w-[40ch] text-[17px] text-ink-soft">
                    Runs inside Chrome on your computer. Fast, private, free, and it works on a plane.
                  </p>
                  <List items={["Reading your notes as you type", "Finding the notes a change affects", "Sorting notes into buckets", "Writing short lists"]} />
                </div>
                <div className="flex flex-col gap-4">
                  <div className="rounded-[36px] bg-primary p-7 text-primary-ink sm:p-10">
                    <SourceTag source="cloud" />
                    <h3 className="mt-4 text-[30px] font-extrabold tracking-[-0.04em]">Gemini Flash</h3>
                    <p className="mt-2 max-w-[40ch] text-[17px] opacity-70">
                      For jobs that span every note, or that are too big for your device.
                    </p>
                    <List items={["Finding collections", "Longer writing", "Backup when your device can't"]} invert />
                  </div>
                  <div className="rounded-[36px] bg-paper-sunk/70 p-3">
                    <Shot name="activity" alt="AI activity today: 412 calls on device and 6 in the cloud." />
                  </div>
                </div>
              </div>
              <p className="mt-6 text-[15px] font-semibold text-ink-faint">
                Both run through Firebase AI Logic. If your browser can't run Gemini Nano, everything still works in the cloud.
              </p>
            </div>
          </div>
        </section>

        <section className="px-4 pb-6 sm:px-8">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-[40px] bg-primary px-6 pt-16 text-center text-primary-ink sm:rounded-[56px] sm:pt-24">
            <h2 className="mx-auto max-w-[14ch] text-[44px] leading-[1] font-extrabold tracking-[-0.05em] sm:text-[80px]">
              Write it down. Dittle keeps up.
            </h2>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={onStart}
                disabled={busy}
                className="rounded-full bg-primary-ink px-7 py-4 text-[16px] font-bold text-primary transition active:scale-[0.97]"
              >
                Start writing
              </button>
              <button
                type="button"
                onClick={onGoogle}
                disabled={busy}
                className="rounded-full px-7 py-4 text-[16px] font-bold opacity-70 ring-1 ring-current transition hover:opacity-100"
              >
                Continue with Google
              </button>
            </div>
            <div className="mx-auto mt-16 max-w-4xl translate-y-6 [perspective:1600px]">
              <div className="overflow-hidden rounded-t-[28px] p-2 pb-0 [transform:rotateX(18deg)] [transform-origin:50%_100%]">
                <Shot name="editor" alt="" />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-[14px] font-semibold text-ink-faint sm:px-8">
        <Wordmark className="text-[18px]" />
        <span>On-device AI needs desktop Chrome. Other browsers use the cloud.</span>
        <a href={REPO_URL} className="hover:text-ink">
          Open source on GitHub
        </a>
      </footer>
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-2xl bg-paper-raised px-4 py-3 text-[14px] font-bold whitespace-nowrap shadow-pop">
      {children}
    </span>
  );
}

function List({ items, invert = false }: { items: string[]; invert?: boolean }) {
  return (
    <ul className="mt-6 space-y-0">
      {items.map((item) => (
        <li
          key={item}
          className={`flex items-center gap-3 border-t py-3 text-[16px] font-semibold ${invert ? "border-current/15" : "border-rule"}`}
        >
          <span aria-hidden className={`size-2 rounded-full ${invert ? "bg-hl-blue" : "bg-hl-green"}`} />
          {item}
        </li>
      ))}
    </ul>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 18 18" className="size-4">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}
