import type { ReactNode } from "react";
import { Wordmark } from "../../ui/Wordmark";

type WelcomeProps = {
  onStart: () => void;
  onGoogle: () => void;
  busy?: boolean;
  error?: string;
};

const REPO_URL = "https://github.com/CryptishApps/dittle";

const FEATURES = [
  {
    shot: "update",
    title: "Change it once",
    body: "Change 80 guests to 95 and Dittle finds the other notes that mention it. One click updates them all.",
    alt: "A note where 80 guests was changed to 95, with a card offering to update the same number in Budget, Chair hire and Email to Sam.",
  },
  {
    shot: "insert",
    title: "Ask inside the note",
    body: "Write \"add in a list of meals here\". A button appears with the list already written. Hover to preview, click to add.",
    alt: "A request line in a note with an Add 7 meals button and a preview of seven meals.",
  },
  {
    shot: "recalc",
    title: "Sums that keep up",
    body: "Totals work themselves out again when a number changes. Code does the maths, so it's never guessed.",
    alt: "A budget table where food, chairs and the total have just been recalculated for 95 guests.",
  },
  {
    shot: "collections",
    title: "Collections, found for you",
    body: "Notes about the same kind of thing become a table, like vendors with price, deposit and contact.",
    alt: "A Vendors table built from three notes, with price, deposit and contact columns.",
  },
  {
    shot: "offline",
    title: "Works offline",
    body: "Notes save to your device first and the AI runs there too. Everything syncs when you're back online.",
    alt: "A note being written while offline, marked Saved on this device.",
  },
  {
    shot: "activity",
    title: "Your device does the work",
    body: "Most AI runs on your computer with Gemini Nano. The cloud steps in for big jobs, and you can see which did what.",
    alt: "An activity panel showing 412 AI calls on device and 6 in the cloud today.",
  },
];

export function Welcome({ onStart, onGoogle, busy = false, error }: WelcomeProps) {
  return (
    <div className="dot-grid min-h-dvh bg-paper">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
        <Wordmark className="text-[24px]" />
        <div className="flex items-center gap-1 text-[15px]">
          <a href={REPO_URL} className="rounded-xl px-3 py-2 text-ink-soft transition hover:bg-paper-sunk hover:text-ink">
            GitHub
          </a>
          <button
            type="button"
            onClick={onGoogle}
            disabled={busy}
            className="rounded-xl px-3 py-2 font-medium text-ink transition hover:bg-paper-sunk disabled:opacity-50"
          >
            Sign in
          </button>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-4 pt-14 text-center sm:px-8 sm:pt-20">
          <h1 className="text-[42px] leading-[1.05] font-bold tracking-[-0.035em] text-balance sm:text-[68px]">
            Change it once. <span className="text-accent-strong">Every note follows.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-[46ch] text-[18px] leading-relaxed text-ink-soft sm:text-[21px]">
            Write notes the way you always do. Dittle's AI notices the numbers, dates and names you repeat, and keeps
            every note in step when one changes.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onStart}
              disabled={busy}
              className="rounded-xl bg-accent px-6 py-3.5 text-[16px] font-semibold text-accent-ink shadow-card transition hover:brightness-105 disabled:opacity-60"
            >
              Start writing
            </button>
            <button
              type="button"
              onClick={onGoogle}
              disabled={busy}
              className="inline-flex items-center gap-2.5 rounded-xl border border-rule bg-paper-raised px-6 py-3.5 text-[16px] font-semibold shadow-card transition hover:border-ink-faint disabled:opacity-60"
            >
              <GoogleMark />
              Continue with Google
            </button>
          </div>
          <p className="mt-4 text-[14px] text-ink-faint">No account needed · Works offline · Free</p>
          {error && (
            <p role="alert" className="mt-3 text-[14px] text-caution">
              {error}
            </p>
          )}
        </section>

        <section aria-label="Dittle editor" className="mx-auto mt-14 max-w-6xl px-4 sm:mt-20 sm:px-8">
          <BrowserFrame>
            <Shot
              name="editor"
              alt="The Dittle editor. Guests changed from 80 to 95 in a catering note, and a card offers to update three other notes."
            />
          </BrowserFrame>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-8 sm:py-28">
          <h2 className="max-w-[20ch] text-[32px] leading-tight font-bold tracking-[-0.03em] sm:text-[44px]">
            The busywork, <span className="text-accent-strong">done quietly.</span>
          </h2>
          <div className="mt-12 grid gap-x-6 gap-y-12 md:grid-cols-2">
            {FEATURES.map((feature) => (
              <article key={feature.shot}>
                <div className="rounded-3xl border border-rule bg-paper-sunk/70 p-3 sm:p-5">
                  <Shot name={feature.shot} alt={feature.alt} />
                </div>
                <h3 className="mt-5 text-[20px] font-semibold tracking-[-0.02em]">{feature.title}</h3>
                <p className="mt-1.5 max-w-[48ch] text-[16px] leading-relaxed text-ink-soft">{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-8">
          <div className="grid gap-4 rounded-3xl border border-rule bg-paper-raised p-6 shadow-card sm:p-10 md:grid-cols-[1.2fr_1fr_1fr]">
            <div>
              <h2 className="text-[26px] leading-tight font-bold tracking-[-0.03em]">On your device first. Cloud when it helps.</h2>
              <p className="mt-2 text-ink-soft">Both run through Firebase AI Logic.</p>
            </div>
            <Where
              dot={<span aria-hidden className="size-2.5 rounded-full bg-accent" />}
              title="On your device"
              model="Gemini Nano"
              items={["Reading your notes as you type", "Finding the notes a change affects", "Writing short lists"]}
            />
            <Where
              dot={<span aria-hidden className="size-2.5 rounded-full border-2 border-ink-faint" />}
              title="In the cloud"
              model="Gemini Flash"
              items={["Finding collections across all notes", "Longer writing", "Backup when your device can't"]}
            />
          </div>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 border-t border-rule px-4 py-6 text-[14px] text-ink-faint sm:px-8">
        <span>On-device AI needs desktop Chrome. Other browsers use the cloud.</span>
        <a href={REPO_URL} className="underline-offset-4 hover:text-ink hover:underline">
          Open source on GitHub
        </a>
      </footer>
    </div>
  );
}

function Shot({ name, alt }: { name: string; alt: string }) {
  return (
    <picture>
      <source srcSet={`/shots/${name}-dark.png`} media="(prefers-color-scheme: dark)" />
      <img src={`/shots/${name}-light.png`} alt={alt} loading="lazy" className="block h-auto w-full" />
    </picture>
  );
}

function BrowserFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-rule bg-paper-raised shadow-pop">
      <div className="flex items-center gap-3 border-b border-rule px-4 py-3">
        <span className="flex gap-1.5" aria-hidden>
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </span>
        <span className="mx-auto rounded-lg bg-paper px-16 py-1 text-[13px] text-ink-soft">dittle.app</span>
        <span className="w-[54px]" aria-hidden />
      </div>
      <div className="max-h-[640px] overflow-hidden [mask-image:linear-gradient(to_bottom,black_80%,transparent)]">
        {children}
      </div>
    </div>
  );
}

function Where({ dot, title, model, items }: { dot: ReactNode; title: string; model: string; items: string[] }) {
  return (
    <div className="rounded-2xl bg-paper p-5">
      <p className="flex items-center gap-2 font-semibold">
        {dot}
        {title}
      </p>
      <p className="mt-0.5 text-[13px] text-ink-faint">{model}</p>
      <ul className="mt-3 space-y-1.5 text-[15px] text-ink-soft">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
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
