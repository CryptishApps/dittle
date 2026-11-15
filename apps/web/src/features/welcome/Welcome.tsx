import { useEffect, useState, type ReactNode } from "react";
import { VarChip } from "../../ui/VarChip";
import { Wordmark } from "../../ui/Wordmark";

type WelcomeProps = {
  onStart: () => void;
  onGoogle: () => void;
  busy?: boolean;
  error?: string;
};

const PER_HEAD = 38;
const REPO_URL = "https://github.com/CryptishApps/dittle";

export function Welcome({ onStart, onGoogle, busy = false, error }: WelcomeProps) {
  const guests = useGuestDemo();
  const money = (n: number) => `£${n.toLocaleString("en-GB")}`;

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
        <Wordmark className="text-[26px]" />
        <button
          type="button"
          onClick={onGoogle}
          disabled={busy}
          className="rounded-full px-3 py-1.5 text-[14px] text-ink-soft transition hover:bg-paper-sunk hover:text-ink disabled:opacity-50"
        >
          Sign in
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-10 pb-16 sm:px-8 sm:pt-16">
        <h1 className="max-w-[15ch] font-note text-[44px] leading-[1.02] font-medium tracking-[-0.025em] text-balance sm:text-[72px]">
          Four notes said 80 guests.{" "}
          <em className="font-normal text-ditto">Now it's 95.</em>
        </h1>

        <p className="mt-6 max-w-[54ch] text-[17px] leading-relaxed text-ink-soft sm:text-[18px]">
          Dittle spots the numbers, dates and names in your notes as you type, and links the ones that mean
          the same thing. Change one and every note that uses it updates. Spotting runs on your device, so it's
          instant, private and works offline.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onStart}
            disabled={busy}
            className="rounded-full bg-ink px-5 py-3 text-[15px] font-medium text-paper transition hover:bg-ditto disabled:opacity-60"
          >
            Start writing
          </button>
          <button
            type="button"
            onClick={onGoogle}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full border border-rule bg-paper-raised px-5 py-3 text-[15px] font-medium transition hover:border-ink-faint disabled:opacity-60"
          >
            <GoogleMark />
            Continue with Google
          </button>
        </div>
        <p className="mt-3 text-[13px] text-ink-faint">
          No account needed to start. Sign in with Google later to keep your notes on every device.
        </p>
        {error && (
          <p role="alert" className="mt-3 text-[14px] text-caution">
            {error}
          </p>
        )}

        <section aria-label="Example notes" className="mt-14 sm:mt-20">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <NoteCard title="Catering quote">
              Rosa's Kitchen can do a buffet for <VarChip name="guest_count" value={String(guests)} usedIn={4} /> guests
              at £38 a head.
            </NoteCard>
            <NoteCard title="Budget">
              Food: <VarChip name="guest_count" value={String(guests)} usedIn={4} /> × £38 ={" "}
              <VarChip name="food_total" value={money(guests * PER_HEAD)} formula="guest_count × 38" />
            </NoteCard>
            <NoteCard title="Chair hire">
              <VarChip name="guest_count" value={String(guests)} usedIn={4} /> chairs, plus 4 spare for the top table.
            </NoteCard>
            <NoteCard title="Email to Sam">
              We're expecting <VarChip name="guest_count" value={String(guests)} usedIn={4} /> people, so the barn
              works if we use the courtyard.
            </NoteCard>
          </div>
          <p className="mt-4 font-mono text-[11px] text-ink-faint">
            <span className="text-ditto">〃</span> marks a linked value. Hover one to see what it's linked to.
          </p>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 border-t border-rule px-4 py-5 text-[13px] text-ink-faint sm:px-8">
        <span>On-device AI in desktop Chrome. Other browsers use the cloud.</span>
        <a href={REPO_URL} className="underline-offset-4 hover:text-ink hover:underline">
          Open source on GitHub
        </a>
      </footer>
    </div>
  );
}

function useGuestDemo(): number {
  const [guests, setGuests] = useState(80);
  useEffect(() => {
    const timer = window.setTimeout(() => setGuests(95), 1400);
    return () => window.clearTimeout(timer);
  }, []);
  return guests;
}

function NoteCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="rounded-xl border border-rule bg-paper-raised p-5">
      <h2 className="font-note text-[17px] font-semibold tracking-[-0.01em]">{title}</h2>
      <p className="mt-2 font-note text-[16px] leading-[1.65] text-ink">{children}</p>
    </article>
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
