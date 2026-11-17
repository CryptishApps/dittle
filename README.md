# Dittle

Change it once. Every note follows.

You write "80 guests" in the catering quote, the budget and the seating plan. Then it's 95. In most notes apps you now hunt down three numbers. In Dittle you change one. The budget and the seating plan follow, and so does the £3,040 catering total that was worked out from it.

To do that, Dittle has to know that the "80" in one note is the same thing as the "80" in another, and that "£3,040" is 80 × £38. Gemini Nano, running in Chrome on your computer, reads each paragraph as you type and works out what its values are. Deciding whether two values are the same thing, and suggesting tables across all your notes, go to the cloud model when you're online. The cloud also covers for Nano on computers that can't run it.

Built for [#BuildHybridAI 2026](https://firebasehybridaihackathon.devpost.com). Live at [dittle.app](https://dittle.app).

## Try it in two minutes

Use desktop Chrome. If your computer can run Gemini Nano, Dittle offers to download it from the account menu (Gemini Nano, then Download). Without it, everything still works through the cloud.

1. Sign up, then click "Rosa's Kitchen quoted £38 a head for 80 guests." on the first page. Dittle opens it as a note and underlines the values it found. Hover one to see what it thinks it is.
2. Start a note called "Catering". Type `Buffet for @80` and press Tab, then `guests at @£38` and Tab, then `a head, so about @£3,040` and Tab. Tab tags the value and adds the space after it. A couple of seconds later a message says £3,040 now follows the price per head × the guest count. The wording comes from the names Nano gave the values.
3. Start another note, type `@80` and pick the 80 you already have from the menu.
4. Click the 80, change it to 95 and choose Update all. Both notes change, and £3,040 becomes £3,610.
5. Type `/` on a new line, pick "Ask Dittle to write…", type `a packing list for a weekend in Lisbon` and press Enter. Hover the button that appears to preview the list.
6. Open `/ai` to see every AI call and whether it ran on your device or in the cloud.

## Where each job runs, and why

Every call goes through [Firebase AI Logic](https://firebase.google.com/docs/ai-logic) hybrid inference ([hybrid.ts](apps/web/src/features/ai/hybrid.ts)). Each job sends a JSON schema with fixed options, and code checks the answer before using it.

| Job | Runs | Why |
|---|---|---|
| Find values in a paragraph as you type | Nano first | It runs on every paragraph you finish, so it has to be free, fast and private. Nano finds 97% of values. |
| Describe a value (what it measures, which day, what it belongs to, its number, its duration) | Nano first | Same reason. It only sees the one paragraph. |
| Place a value in a collection | Nano first | Picks a collection, column and row from numbered options. |
| Spot a formula (£3,040 = 80 × £38) | Nano first | Suggests a formula; code checks it reproduces the number. |
| Write a request ("add a packing list here") | Nano first | Short text, written from the note itself. |
| Link a value to one you already track | Cloud first, Nano offline | Nano got 7 of 11 test cases right, the cloud 10 of 11. A wrong link merges two different values, so this one goes to the cloud when it can. |
| Suggest collections ("you've logged 3 runs, make a Runs table?") | Cloud only | Needs every value at once. It gets the extracted values and note titles, never note text. |

"Nano first" is `PREFER_ON_DEVICE`. If the on-device call fails or takes more than 30 seconds, Dittle retries in the cloud. "Cloud first" is `PREFER_IN_CLOUD`, which uses Nano when the cloud can't be reached. The cloud model is Gemini Flash-Lite, named in [Remote Config](https://firebase.google.com/docs/remote-config) so it can change without a deploy ([ai.ts](apps/web/src/lib/ai.ts)).

## The model suggests, code decides

The models never write into your notes directly. Every answer goes through a check first.

- **Quotes are grounded.** A value Find returns is only used if its text appears exactly in your paragraph. Same for a new row name in a collection.
- **Choices come from a list.** Kinds come from a fixed set. Collections, columns, rows and link targets are numbered options. An answer outside the list is dropped.
- **Code does the maths.** Formulas run in a small parser ([engine.ts](apps/web/src/features/formulas/engine.ts)), not `eval` and not the model. A suggested formula is kept only if it reproduces the written number within 2% ([apply.ts](apps/web/src/features/formulas/apply.ts)).
- **Durations come back as ISO 8601.** "27:40" for a run is `PT27M40S`; "2:40" for a flight is `PT2H40M`. The model reads the context and code parses the strict format into seconds ([duration.ts](apps/web/src/features/formulas/duration.ts)).
- **Nothing changes silently.** If a new value looks like one you already track but the text differs, Dittle asks before touching anything.
- **No keyword guessing.** No regex or word list decides what your text means. The few places that split text use `Intl.Segmenter` for sentence ends or the exact position of a quote.

## How well it works

The test page at `/dev/describe` (dev server only) runs 28 paragraphs, 12 context cases and 11 link cases through the real prompts and scores them ([spike](apps/web/src/features/spike)). The prompt examples are kept different from the test sentences.

| | Cloud (Find v9) | Gemini Nano in Chrome 157 (Find v8) |
|---|---|---|
| Values found | 100% | 97% |
| Found values that are right | 98.5% | 97% |
| Kind right | 100% | 98% |
| Requests told apart from reminders | 100% | 93% |
| Context fields right (not counting durations) | 70 of 71 | 64 of 71 |
| Durations read correctly | 5 of 5 | not measured; Chrome sent these to the cloud |
| Links | 10 of 11 | 7 of 11 |
| Median time per paragraph | about 1 s | about 3 s |

Nano's misses are mostly small: "today" filed as a condition, "garden" instead of "tomato". The link misses were not small, which is why linking prefers the cloud.

## Fast

Numbers from a production build, median of several runs.

| | Result |
|---|---|
| Lighthouse, landing and sign-in, mobile and desktop | 100 for performance, accessibility, best practices and SEO |
| Largest contentful paint, landing, mobile preset | 0.9 s |
| Returning user opens their notes | 57 ms (188 ms with 4× CPU slowdown), down from 404 ms |
| Opening a note from a link | 71 ms, down from 426 ms |
| JavaScript for the landing page | 157 KB compressed, no editor or Firestore code |
| Moving between home, a note and a collection | under 30 ms |

How it gets there:

- **Your notes show before Firebase loads.** TanStack Query's cache is kept in IndexedDB per account and restored before the first render ([query-cache.ts](apps/web/src/lib/query-cache.ts)). Firestore listeners start after the first paint and refresh what's on screen. A local hint says who was signed in, so nothing waits on Firebase Auth's network check.
- **Each page fetches its own code early.** A build step adds the current route's chunks as `modulepreload` links before the main script runs ([route-preload.ts](apps/web/build/route-preload.ts)).
- **Only what's used ships.** The editor lists the Tiptap extensions it uses instead of StarterKit. Auth is set up with only the persistence Dittle needs. Motion loads its features lazily. React Compiler handles memoisation.
- **Screenshots are AVIF and WebP** at three widths with fixed dimensions.

## Offline

Dittle opens and works with no connection.

- A service worker caches the built app after sign-in ([service-worker.ts](apps/web/build/service-worker.ts)). Pages try the network for 3 seconds, then use the cached copy.
- Notes and values live in Firestore with its persistent local cache. Writes are never awaited, so they show at once and sync when you're back.
- Gemini Nano keeps finding and describing values offline, and linking falls back to it.
- Signing out or deleting your account wipes the local Firestore cache and the kept query cache, in every open tab.

## Built on Firebase

| Product | Use |
|---|---|
| [AI Logic](https://firebase.google.com/docs/ai-logic) | Every model call, with hybrid inference |
| [App Check](https://firebase.google.com/docs/app-check) | reCAPTCHA Enterprise, enforced for AI Logic and Firestore |
| [Authentication](https://firebase.google.com/docs/auth) | Email and password or Google; account deletion with re-sign-in when needed |
| [Cloud Firestore](https://firebase.google.com/docs/firestore) | Notes, values, folders, collections and their rows, under `users/{uid}`. Each user can read and write only their own ([firestore.rules](firestore.rules)) |
| [Remote Config](https://firebase.google.com/docs/remote-config) | The cloud model name |
| [Hosting](https://firebase.google.com/docs/hosting) | dittle.app |

## Run it locally

You need [Bun](https://bun.sh) 1.3 or later and a Firebase project with AI Logic, Authentication (Email/Password and Google), Firestore and App Check (reCAPTCHA Enterprise).

```sh
bun install
cp apps/web/.env.example apps/web/.env.local   # your Firebase web app settings
bun run dev                                    # http://localhost:5180
```

App Check starts the first time the app uses AI Logic or Firestore, so the sign-in pages never load reCAPTCHA. Leave `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` empty to run without it. When it's set, development uses a debug token: leave `VITE_APPCHECK_DEBUG_TOKEN` empty once, copy the token the browser console prints, and register it under App Check > Manage debug tokens. The debug token is only read in development builds.

Checks: `bun run typecheck` at the root, and `bun test src` in `apps/web`.

The landing page screenshots come from the real app. With `bun run dev` running, `CHROME_PATH=/path/to/chrome bun run --filter @dittle/web shots` signs up a throwaway account, writes a few notes through the editor, takes each shot in light and dark, and deletes the account.

Deploy with `bun run deploy`, which builds and then deploys Hosting and the Firestore rules.

## Where things are

```
apps/web/src/features/ai           Prompts, schemas and answer checks for each job; hybrid.ts wraps AI Logic
apps/web/src/features/editor       Tiptap editor: @ tags, / menu, value spotting, requests, value cards
apps/web/src/features/notes        Firestore store, TanStack Query wiring, home page, note page, value panel, search
apps/web/src/features/collections  Collections: placement, totals, suggestions, collection page
apps/web/src/features/formulas     Formula parser, checks and recalculation; duration parsing
apps/web/src/features/spike        Test sets and scoring for /dev/describe
apps/web/build                     Vite plugins: route preloading, service worker
```

## Licence

[Apache 2.0](LICENSE). Geist Mono in `apps/web/public/fonts` is under the [SIL Open Font License](apps/web/public/fonts/OFL.txt). The motion recipes in `apps/web/src/styles/transitions.css` come from [transitions.dev](https://transitions.dev) and are covered by its [terms](https://transitions.dev/terms), not by the Apache licence.
