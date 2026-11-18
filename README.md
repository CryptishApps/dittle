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

In a hurry? On the first screen, choose "Or look around a sample trip first" for a ready-made long weekend in Lisbon, then go to step 7.

1. Sign up. Dittle asks what you keep track of. Pick Running log and Weekly meal plan and press Enter.
2. Each pick shows a sample entry with its values highlighted. Press Enter to file it: the run lands in a Runs table with its pace worked out. Tap "Add Sunday's 8 km too" for a second row, and choose what your home shows.
3. On "Plans change. Try it." press Enter. Dittle lists every place that updated: the sentence in the note, the row, the pace and the home total. Then See my notes: each pick has a folder, a note and a collection.
4. In the box at the top of home, type `ran 6k by the canal, 31 mins` and press Enter. A receipt says where it went (Filed in Runs, with the day, distance and pace) with Undo. Try `dinner on saturday is fish tacos` too, or hold M and say it, or drop a screenshot of a booking on the box.
5. Click "a group chat" under the box. Dittle turns a messy chat into a tidy note with the values tracked. Choose Save note.
6. Click + in the tabs to start a note called "Villa". Type `The villa is @€1,680` and press Tab, then `for @6` and Tab, then `of us, so @€280` and Tab, then `each.` Tab tags the value and adds the space after it. A few seconds later a message says €280 now follows a formula, something like villa cost ÷ guest count. Start a note called "Flights" and type `@6`, press ↓ to pick the 6 you already have, then Tab, and carry on with `seats at @£118` and Tab, then `each, so @£708` and Tab, then `in total.` Click the 6, change it to 8 and choose Update all. Both notes change: €280 becomes €210 and £708 becomes £944.
7. On the home page, type `What if 2 more people come?` in Ask and press Enter. Dittle shows how it read the question, such as Group size 6 → 8, and rolls every value that follows to its new number. Nothing changes until you choose Make it so.
8. Click "Paste or upload" in the header and paste `Hi, we can now do £42 a head, and we'd need the deposit by 30 May.` into a plan that tracks a price per head and a deposit date. Dittle lists each change as old → new with the words it came from. Tick the ones you want and choose Apply; every note and total that uses them follows.
9. Type `/` on a new line, pick "Ask Dittle to write…", type `a packing list for a long weekend in Lisbon` and press Enter. Hover the button that appears to preview the list.
10. Open `/ai` to see every AI call and whether it ran on your device or in the cloud.

## Where each job runs, and why

Every call goes through [Firebase AI Logic](https://firebase.google.com/docs/ai-logic) hybrid inference ([hybrid.ts](apps/web/src/features/ai/hybrid.ts)). Each job sends a JSON schema with fixed options, and code checks the answer before using it.

| Job | Runs | Why |
|---|---|---|
| Find values in a paragraph as you type | Nano first | It runs on every paragraph you finish, so it has to be free, fast and private. Nano finds 97% of values. It also gets the plain-text columns you track, such as Dinners (dish), and picks out a phrase only when it fills one, so "chorizo pasta" lights up only if you keep a Dinners collection. |
| Describe a value (what it measures, which day, what it belongs to, its number, unit and duration) | Cloud first, Nano offline | It writes a long answer for every value in the paragraph, which took Nano many seconds on a laptop. The cloud answers in about 2 seconds. It only sees the one paragraph. |
| Place a value in a collection | Cloud first, Nano offline | Picks a collection, column and row from numbered options, and says whether it is sure. When it isn't, Dittle asks before filing. In testing Nano filed a meeting's time into Workouts, and the cloud filed nothing. A wrong filing puts a value in the wrong table, so this goes to the cloud when it can. |
| Name a new collection's columns | Nano first | Turns names taken from the first entry ("palace ticket price") into ones that fit every row ("Price"). |
| Spot a formula (£708 = 6 seats × £118) | Nano first | Suggests a formula; code checks it reproduces the number. |
| Suggest a calculated column (price per person = total ÷ people, pace = time ÷ distance) | Nano first | Picks two columns of a collection; code checks the units fit and works out every row. |
| Write a request ("add a packing list here") | Nano first | Short text, written from the note itself. |
| Link a value to one you already track | Cloud first, Nano offline | Nano got 7 of 11 test cases right, the cloud 10 of 11. A wrong link merges two different values, so this one goes to the cloud when it can. |
| Answer a what-if ("what if 2 more people come?") | Cloud first, Nano offline | Picks one tracked value from a numbered list and returns set, add, subtract or multiply with a number. Like linking, a wrong pick changes the wrong value everywhere. Code works out every value that follows and changes nothing until you choose Make it so. |
| Read an update from pasted text (a supplier's email) | Cloud first, Nano offline | It compares the message with every value you track, and a wrong match changes a value in every note. |
| Read an update from a photo or PDF of a quote | Cloud only | Files always go to the cloud, and only when you upload one. |
| Suggest collections ("you've written 3 things to do, make a table of them?") | Cloud only | Needs every value at once. It gets the extracted values and note titles, never note text. |
| Decide where an entry in the home box goes (file it, update a value, add to a note, start a note) | Cloud first, Nano offline | It weighs the entry against every collection and tracked value at once, which the cloud does best. Offline, Nano decides; code checks its pick against the numbered options. If neither answers within 15 seconds, the entry is saved as a note and the receipt says so. |
| Tidy a pasted chat or list into a note | Cloud first, Nano offline | It writes the whole note in one go. Offline, Nano tidies it; if that fails, the paste is kept as it is. |
| Read a typed onboarding entry, or propose a table for "Something else" | Cloud only | The sample entries come already read, so the model runs only for text you type. |
| Turn a voice recording or a screenshot into text for the home box | Cloud only | Audio and images go to the cloud only when you record or drop one. |

"Nano first" is `PREFER_ON_DEVICE`. If the on-device call fails or takes more than 30 seconds, Dittle retries in the cloud. "Cloud first" is `PREFER_IN_CLOUD`, which uses Nano when the cloud can't be reached. The cloud model is Gemini Flash-Lite, named in [Remote Config](https://firebase.google.com/docs/remote-config) so it can change without a deploy ([ai.ts](apps/web/src/lib/ai.ts)).

## The model suggests, code decides

The models never write into your notes directly. Every answer goes through a check first.

- **Quotes are grounded.** A value Find returns is only used if its text appears exactly in your paragraph. A new row name in a collection must appear in the sentence too; if the model changed its capitals, the row takes the sentence's own spelling.
- **Choices come from a list.** Kinds come from a fixed set. Collections, columns, rows and link targets are numbered options. An answer outside the list is dropped.
- **Code does the maths.** Formulas run in a small parser ([engine.ts](apps/web/src/features/formulas/engine.ts)), not `eval` and not the model. A suggested formula is kept only if it reproduces the written number within 2% ([apply.ts](apps/web/src/features/formulas/apply.ts)).
- **Units come from a fixed list.** Describe names a unit (km, mi, kg…) or an ISO 4217 currency code. Code converts miles to km with fixed factors for totals and averages, never converts currencies, and leaves out entries it can't combine instead of guessing ([units.ts](apps/web/src/features/formulas/units.ts)).
- **Durations come back as ISO 8601.** "27:40" for a run is `PT27M40S`; "2:40" for a flight is `PT2H40M`. The model reads the context and code parses the strict format into seconds ([duration.ts](apps/web/src/features/formulas/duration.ts)).
- **Updates are quoted.** A change read from pasted text is offered only if its quote is in the text and the new value is in the quote. The model gives the number on its own, and code writes it in the tracked value's format (£, %, km). It never converts currencies. Changes read from a photo or PDF have no text to check against, so they're marked as read from the file and start unticked. Nothing changes until you choose Apply.
- **A what-if shows its reading.** Code works out the effects of a what-if with the same recalculation as an edit, writes nothing, and shows the reading plainly (Group size 6 → 8) so you can see what it understood before you apply it.
- **Nothing changes silently.** If a new value looks like one you already track but the text differs, Dittle asks before touching anything. If the model isn't sure a value belongs in a collection, Dittle asks before filing it, and a date only joins a row with the thing it belongs to.
- **Every home-box action has Undo.** Each entry leaves a receipt saying what happened, and Undo reverses it.
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

`/dev/what-if` runs 20 what-if questions against the sample trip: 14 that change a value (including "doubled", "half price" and "rose 10%") and 6 that should be refused because they are about nothing tracked. The cloud gets 20 of 20 on prompt v1, in about 1 s each. Nano is not measured yet.

`/dev/update` runs 17 messages against a catering plan: price and date changes, a duration, unrelated phone and street numbers, a value repeated unchanged, a quote in euros against a price in pounds, another caterer's price and two images. On prompt v5 the cloud got all 17 right in five of six runs; the other run made one wrong change. Median time is about 1.4 s. Nano is not measured yet.

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
apps/web/src/features/spike        Test sets and scoring for /dev/describe, /dev/what-if and /dev/update
apps/web/build                     Vite plugins: route preloading, service worker
```

## Licence

[Apache 2.0](LICENSE). Figtree and Caveat in `apps/web/public/fonts` are under the SIL Open Font License ([Figtree](apps/web/public/fonts/OFL-figtree.txt), [Caveat](apps/web/public/fonts/OFL-caveat.txt)). The motion recipes in `apps/web/src/styles/transitions.css` come from [transitions.dev](https://transitions.dev) and are covered by its [terms](https://transitions.dev/terms), not by the Apache licence.
