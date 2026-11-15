# Dittle

Notes that link the numbers you repeat. Change one and every note follows.

You write "80 guests" in the catering quote, the budget, the chair order and an email. Then it's 95. Dittle spots values like these as you type, links the ones that mean the same thing, and updates every note when one changes. Spotting runs on your device, so it's instant, private and works offline. The cloud only steps in for jobs that span all your notes.

Built for [#BuildHybridAI 2026](https://firebasehybridaihackathon.devpost.com). Work in progress until 30 November 2026.

## What it does

- **Spot.** On every typing pause, a local model marks values that look like variables: amounts, counts, dates, names. Each one gets a dotted underline.
- **Link.** Hover or tap an underline to link it to an existing variable, create a new one, or leave it as text. Nothing changes until you pick.
- **Formulas.** "3 nights × £140" becomes `nights × nightly_rate`, and stays right when either value changes.
- **Insert.** Write a request in the note, like "add in a list of meals here". A button appears with the result ready to preview and add.
- **Collections.** The cloud looks across every note's extracted values and suggests tables, like "Vendors: price, deposit, contact".
- **Offline.** Notes save to the device first and sync when you're back online.

## Where each model runs

| Job | Web (desktop Chrome) | Android |
|---|---|---|
| Spot values, suggest links, write formulas, short inserts | Gemini Nano through Chrome's Prompt API | Gemini Nano through ML Kit and AICore |
| Fallback when the on-device model is missing or fails | Gemini Flash in the cloud | Gemini Flash in the cloud |
| Collections and long inserts | Gemini Flash in the cloud | Gemini Flash in the cloud |

Every call goes through Firebase AI Logic. On-device jobs use hybrid inference (`PREFER_ON_DEVICE`) and retry in the cloud if the local call fails. Cloud-only jobs use `ONLY_IN_CLOUD`. The app counts where each call ran and shows it in the corner, for example "412 on device · 6 cloud".

The cloud never sees full notes for Collections, only the values Dittle extracted and the note titles.

## Built on Firebase

| Product | What it does in Dittle |
|---|---|
| [Firebase AI Logic](https://firebase.google.com/docs/ai-logic) | Every AI call, on-device first with cloud fallback |
| [App Check](https://firebase.google.com/docs/app-check) | Keeps AI Logic and Firestore for this app only: reCAPTCHA Enterprise on web, Play Integrity on Android |
| [Authentication](https://firebase.google.com/docs/auth) | Start writing with no account, then sign in with Google to keep notes across devices |
| [Cloud Firestore](https://firebase.google.com/docs/firestore) | Notes, variables and collections, with an offline cache that syncs when you reconnect |
| [Remote Config](https://firebase.google.com/docs/remote-config) | Prompts, the cloud model name, the typing-pause delay and a switch for cloud calls |
| [Hosting](https://firebase.google.com/docs/hosting) | Serves the web app at [dittle.app](https://dittle.app) |

## Platforms

| Platform | Status | On-device AI needs |
|---|---|---|
| Web | In progress | Desktop Chrome on Windows 10/11, macOS 13+, Linux or ChromeOS, with 22 GB free disk and a GPU with more than 4 GB of VRAM (or 16 GB RAM and 4 CPU cores) |
| Android | Next | A phone on ML Kit's Gemini Nano list, such as Pixel 9 or later, or Galaxy S25 or later |

Without on-device AI, the app still works: every call goes to the cloud.

## Run it locally

You need [Bun](https://bun.sh) 1.3 or later and a Firebase project with AI Logic, Authentication (Anonymous and Google), Firestore and App Check (reCAPTCHA Enterprise) turned on.

```sh
bun install
cp apps/web/.env.example apps/web/.env.local   # fill in your Firebase web app settings
bun run dev                                    # http://localhost:5180
```

In development, App Check uses a debug token. Leave `VITE_APPCHECK_DEBUG_TOKEN` empty the first time, copy the token the browser console prints, and add it in the Firebase console under App Check > Manage debug tokens.

Design work lives at `http://localhost:5180/dev/designs`. Those pages exist only in development and are left out of production builds.

Deploy to Firebase Hosting with the Firebase CLI:

```sh
bunx firebase login
bunx firebase use --add
bun run deploy
```

## Repository

```
apps/web          Web app: React, Vite, TanStack Router, Tailwind CSS
firestore.rules   Each user can read and write only their own notes
firebase.json     Hosting and Firestore settings
```

## Licence

[Apache 2.0](LICENSE). The motion recipes in `apps/web/src/styles/transitions.css` come from [transitions.dev](https://transitions.dev) and are covered by its [terms](https://transitions.dev/terms), not by the Apache licence.
