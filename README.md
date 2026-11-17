# Dittle

Plan things in plain notes. Change a number once, and every note that uses it follows.

A plan is mostly numbers. For a group trip to Lisbon: 6 people, a €1,680 villa, £118 flights, a fado night on Saturday 12 December. The same numbers end up in the villa note, the flights note, the budget and the message to the group. Then two more friends say yes, you update two of the four notes, and the one you miss is the one that costs you.

Dittle reads the numbers as you write. It works out what each one is, which ones are the same thing in different notes, and which are calculated from others. Change the group from 6 to 8 in one note and the flights total goes from £708 to £944, the villa from €280 each to €210, and every other note that says 6 offers to follow. Write three things to do in three notes and they line up in one table, with the cost each added up and the next date counting down on your home page.

It works for any plan with numbers in it: a trip, a wedding, an offsite, a training block.

Dittle doesn't summarise your notes. The AI's job is to keep track of what the numbers in them mean.

Gemini Nano, running in Chrome on your computer, reads each paragraph as you type and describes its values. Linking values across notes and suggesting tables go to the cloud model when you're online, because those need judgement across everything you've written. The cloud also covers for Nano on computers that can't run it.

Built for [#BuildHybridAI 2026](https://firebasehybridaihackathon.devpost.com). Live at [dittle.app](https://dittle.app).

## Try it in two minutes

Use desktop Chrome. If your computer can run Gemini Nano, Dittle offers to download it from the account menu (Gemini Nano, then Download). Without it, everything still works through the cloud.

1. Sign up, then click "The villa in Alfama is €1,680 for the 6 of us." on the first page. Dittle opens it as a note and underlines the values it found. Hover one to see what it thinks it is.
2. Start a note called "Villa". Type `The villa is @€1,680` and press Tab, then `for @6` and Tab, then `of us, so @€280` and Tab, then `each.` Tab tags the value and adds the space after it. A few seconds later a message says €280 now follows a formula, something like villa cost ÷ guest count. The names are the ones the model gave the values.
3. Start a note called "Flights" and type `@6`. The menu's first line makes a new value; press ↓ to pick the 6 you already have, then Tab. Carry on with `seats at @£118` and Tab, then `each, so @£708` and Tab, then `in total.`
4. Click the 6, change it to 8 and choose Update all. Both notes change: €280 becomes €210 and £708 becomes £944.
5. Type `/` on a new line, pick "Ask Dittle to write…", type `a packing list for a long weekend in Lisbon` and press Enter. Hover the button that appears to preview the list.
6. Open `/ai` to see every AI call and whether it ran on your device or in the cloud.

## Where each job runs, and why

Every call goes through [Firebase AI Logic](https://firebase.google.com/docs/ai-logic) hybrid inference ([hybrid.ts](apps/web/src/features/ai/hybrid.ts)). Each job sends a JSON schema with fixed options, and code checks the answer before using it.

| Job | Runs | Why |
|---|---|---|
| Find values in a paragraph as you type | Nano first | It runs on every paragraph you finish, so it has to be free, fast and private. Nano finds 97% of values. |
| Describe a value (what it measures, which day, what it belongs to, its number, unit and duration) | Nano first | Same reason. It only sees the one paragraph. |
| Place a value in a collection | Nano first | Picks a collection, column and row from numbered options. |
| Spot a formula (£708 = 6 seats × £118) | Nano first | Suggests a formula; code checks it reproduces the number. |
| Suggest a calculated column (price per person = total ÷ people, pace = time ÷ distance) | Nano first | Picks two columns of a collection; code checks the units fit and works out every row. |
| Write a request ("add a packing list here") | Nano first | Short text, written from the note itself. |
| Link a value to one you already track | Cloud first, Nano offline | Nano got 7 of 11 test cases right, the cloud 10 of 11. A wrong link merges two different values, so this one goes to the cloud when it can. |
| Suggest collections ("you've written 3 things to do, make a table of them?") | Cloud only | Needs every value at once. It gets the extracted values and note titles, never note text. |

"Nano first" is `PREFER_ON_DEVICE`. If the on-device call fails or takes more than 30 seconds, Dittle retries in the cloud. "Cloud first" is `PREFER_IN_CLOUD`, which uses Nano when the cloud can't be reached. The cloud model is Gemini Flash-Lite, named in [Remote Config](https://firebase.google.com/docs/remote-config) so it can change without a deploy ([ai.ts](apps/web/src/lib/ai.ts)).

## The model suggests, code decides

The models never write into your notes directly. Every answer goes through a check first.

- **Quotes are grounded.** A value Find returns is only used if its text appears exactly in your paragraph. A new row name in a collection must appear in the sentence too; if the model changed its capitals, the row takes the sentence's own spelling.
- **Choices come from a list.** Kinds come from a fixed set. Collections, columns, rows and link targets are numbered options. An answer outside the list is dropped.
- **Code does the maths.** Formulas run in a small parser ([engine.ts](apps/web/src/features/formulas/engine.ts)), not `eval` and not the model. A suggested formula is kept only if it reproduces the written number within 2% ([apply.ts](apps/web/src/features/formulas/apply.ts)).
- **Units come from a fixed list.** Describe names a unit (km, mi, kg…) or an ISO 4217 currency code. Code converts miles to km with fixed factors for totals and averages, never converts currencies, and leaves out entries it can't combine instead of guessing ([units.ts](apps/web/src/features/formulas/units.ts)).
- **Durations come back as ISO 8601.** "27:40" for a run is `PT27M40S`; "2:40" for a flight is `PT2H40M`. The model reads the context and code parses the strict format into seconds ([duration.ts](apps/web/src/features/formulas/duration.ts)).
- **Nothing changes silently.** If a new value looks like one you already track but the text differs, Dittle asks before touching anything.
- **No keyword guessing.** No regex or word list decides what your text means. The few places that split text use `Intl.Segmenter` for sentence ends or the exact position of a quote.

## How well it works

The test page at `/dev/describe` (dev server only) runs 28 paragraphs, 15 context cases and 11 link cases through the real prompts and scores them ([spike](apps/web/src/features/spike)). The prompt examples are kept different from the test sentences.

| | Cloud (prompts v10) | Gemini Nano in Chrome 157 (prompts v8) |
|---|---|---|
| Values found | 100% | 97% |
| Found values that are right | 98.5% | 97% |
| Kind right | 100% | 98% |
| Requests told apart from reminders | 100% | 93% |
| Context fields right (not counting durations) | 71 of 71 | 64 of 71 |
| Durations read correctly | 6 of 6 | not measured; Chrome sent these to the cloud |
| Unit right | 12 of 13 | not measured yet |
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

## Platforms

| Platform | Status | On-device model |
|---|---|---|
| Web, desktop Chrome | Live at [dittle.app](https://dittle.app) | Gemini Nano through Chrome's built-in AI, via Firebase AI Logic |
| Android | Coming soon | Gemini Nano through Firebase AI Logic |

Notes are stored in a small typed format ([note-doc.ts](apps/web/src/features/notes/note-doc.ts)) and formulas in plain symbols, so the Android app can read the same data.

Gemini Nano in Chrome needs Windows 10 or 11, macOS 13 or later, Linux or ChromeOS, about 22 GB of free disk, and either a GPU with more than 4 GB of video memory or 16 GB of RAM with 4 CPU cores. Without it, Dittle runs every job in the cloud.

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

Checks: `bun run lint`, `bun run typecheck` and `bun run test` at the root. `bun run verify` runs all three and the build, which fails if the App Check debug token ends up in `apps/web/dist`.

The landing page screenshots come from the real app. With `bun run dev` running, `CHROME_PATH=/path/to/chrome bun run --filter @dittle/web shots` signs up a throwaway account, writes a few notes through the editor, takes each shot in light and dark, and deletes the account.

Deploy with `bun run deploy`, which builds and then deploys Hosting and the Firestore rules.

## Where things are

```
apps/web/src/features/ai           Prompts, schemas and answer checks for each job; hybrid.ts wraps AI Logic
apps/web/src/features/editor       Tiptap editor: @ tags, / menu, value spotting, requests, value cards
apps/web/src/features/notes        Firestore store, TanStack Query wiring, home page, note page, value panel, search
apps/web/src/features/collections  Collections: placement, totals and averages, calculated columns, suggestions
apps/web/src/features/formulas     Formula parser, checks and recalculation; duration parsing
apps/web/src/features/spike        Test sets and scoring for /dev/describe
apps/web/build                     Vite plugins: route preloading, service worker
```

## Licence

[Apache 2.0](LICENSE). Geist Mono in `apps/web/public/fonts` is under the [SIL Open Font License](apps/web/public/fonts/OFL.txt). The motion recipes in `apps/web/src/styles/transitions.css` come from [transitions.dev](https://transitions.dev) and are covered by its [terms](https://transitions.dev/terms), not by the Apache licence.
