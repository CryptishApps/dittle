# Dittle project profile

Status: mapped on 2026-11-17

Dittle is a notes app with values, formulas and AI help. One web app, `apps/web` (`@dittle/web`): React 19, Vite 8, TanStack Router and Query, Tiptap 3, Firebase 13. Firebase project `dittle-app`, live at https://dittle.app. Bun workspace, no Turborepo.

## Commands

Run these from the repository root unless the row says otherwise.

| Purpose | Command | Evidence that it works |
| --- | --- | --- |
| Install dependencies | `bun install --frozen-lockfile` | Ran clean on 2026-11-17 (Bun 1.4.3) |
| Focused tests | `bun test <files>` in `apps/web` (Bun's test runner, not Vitest) | `bun test src` ran 81 tests in about 0.1 s |
| Lint | `bun run lint` (oxlint, `--deny-warnings`, config in `apps/web/.oxlintrc.json`) | Clean on 2026-11-17 |
| Type check | `bun run typecheck` (`tsr generate && tsc --noEmit`, TypeScript 7) | Clean in under 1 s; CI adds `-- --checkers 1` |
| Build | `bun run build` (`vite build`, then `scripts/check-no-debug-token.ts`) | Builds `apps/web/dist` |
| Focused checks for one package or module | `bun run lint && bun run typecheck && bun run test` (`checks.focused`); the whole app checks in a few seconds | Ran on 2026-11-17 |
| Full check (CI runs it on every push to `main`; never at the end of an agent task) | `bun run verify` | Runs lint, typecheck, test and build with a lock in `.turbo/verify.lock` |

`oxlint`'s `no-unused-vars` is off because `tsc` already checks unused locals and parameters (`noUnusedLocals`, `noUnusedParameters`).

## Worktrees and services

Worktree setup, services, ports, env files, and checks live in the `astack` section of `t3.json`.

- Services confirmed with `bun scripts/astack/run.ts <service>`: `web`, the Vite dev server, on `PORT_WEB` (5180 plus the worktree's slot). The main checkout is slot 0, so it keeps 5180.
- The main checkout's dev server runs as the systemd user unit `dittle-web` on 5180. Do not stop or restart it from a worktree.
- Seeded test user and how to sign in as it: none. There is no Firebase emulator, so every dev server talks to the live `dittle-app` project. Sign up a throwaway account for testing and delete the account in the app afterwards, as `bun run --filter @dittle/web shots` does. Never sign in as a real user, and never write seed data to production.
- Env files a worktree needs: `apps/web/.env.local`, linked from the main checkout. It holds the public Firebase web config and the App Check debug token for development. Template: `apps/web/.env.example`.
- Integration branch deploy target: none. There is no staging; PRs target `main`.
- Release branch deploy target: Firebase Hosting `live` channel of `dittle-app` (https://dittle.app), from the Release workflow's `deploy` job.
- Firestore rules, Firestore indexes and Remote Config are not deployed by CI. Deploy them by hand when the owner asks: `bunx firebase-tools deploy --only firestore --project dittle-app` or `--only remoteconfig`.
- CI workflows: `pr.yml` (template and evidence), `checks.yml` (`checks.focused` on every PR push), `stale-review.yml`, `sweep.yml`, and `release.yml` on pushes to `main`: `types`, `tests`, `checks` (`bun run lint`), `ready`, `build`, then `deploy`. `deploy` needs `ready` and `build`.
- CI build variables (GitHub Actions variables, public values that ship in the bundle): `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY`.
- CI secret: `FIREBASE_SERVICE_ACCOUNT_DITTLE_APP`, the service account JSON the `deploy` job uses. Only the owner creates it.

## Build storage

- Task runner and installed version: none. Root scripts run each workspace with `bun --filter '*' <script>`.
- Packages held below latest: none.
- Cache paths and measured sizes: `node_modules` about 1 GB, `apps/web/node_modules/.vite` about 17 MB (Vite's dependency cache), `apps/web/dist` about 4 MB.
- Local cache budget and retention settings: none needed at these sizes.
- Regenerable outputs and safe cleanup commands: `apps/web/dist`, `apps/web/node_modules/.vite`, `apps/web/.tanstack`, and the generated `apps/web/src/routeTree.gen.ts` and `routeTree.build.gen.ts`. Delete them freely in a worktree. In the main checkout, `apps/web/dist` is what the owner last deployed by hand; leave it alone.
- Archive and restore verification: not applicable without Turborepo.

## Runnable artifacts

| Artifact | Start command | Default location | Required safe fixture or service |
| --- | --- | --- | --- |
| Web app (dev) | `bun scripts/astack/run.ts web` | `http://localhost:${PORT_WEB}` | Linked `apps/web/.env.local`; a throwaway account on the live Firebase project |
| Web app (production build) | `bun run build`, then `bun run --filter @dittle/web preview` | `apps/web/dist` | App Check rejects headless Chromium on production builds, so signed-in pages need a debug-token build on localhost |
| Landing screenshots | `CHROME_PATH=<chrome> bun run --filter @dittle/web shots` with the dev server running | `apps/web/public/shots` | Signs up and deletes its own throwaway account |

## Architecture and ownership

- Feature ownership: `apps/web/src/features/<feature>` (ai, auth, collections, editor, formulas, notes, spike, welcome). Routes in `apps/web/src/routes` (file-based TanStack Router; `routes/dev` is left out of production builds). Vite plugins in `apps/web/build`.
- Import direction: routes import features; features import `src/lib` and `src/ui`; `src/lib` does not import features.
- Durable state and its writers: Firestore under `users/{uid}`, written only through `apps/web/src/features/notes/store.ts`. The stored note format is `apps/web/src/features/notes/note-doc.ts`; changing it means a new stored shape version. The query cache persists in IndexedDB per account (`src/lib/query-cache.ts`).
- Provider and platform boundaries: Firebase AI Logic wraps every model call (`src/features/ai/hybrid.ts`), cloud or Gemini Nano on device. Remote Config holds the cloud model name.
- Security-sensitive areas: `firestore.rules`, App Check (`src/lib/app-check.ts`), auth (`src/lib/auth.ts`, `src/features/auth`), account deletion.
- Files or directories outside normal agent scope: `.firebaserc`, `firebase.json` hosting headers, `remoteconfig.template.json`, `apps/web/.env.local`.

## Mechanical controls

- Existing checks: TypeScript 7 strict with `noUncheckedIndexedAccess` and unused checks; oxlint correctness rules; `bun test`; `scripts/check-no-debug-token.ts` fails `bun run build` when the App Check debug token from the environment or `.env*` files appears anywhere in `apps/web/dist`; the Release workflow's build fails if `VITE_APPCHECK_DEBUG_TOKEN` is set in CI or a Firebase web config variable is missing.
- Known baselines that may only shrink: none.
- Repeated review comments not yet enforced: none recorded.

## Protected operations

- Any deploy to `dittle-app`: Hosting, Firestore rules or indexes, Remote Config. A merge into `main` deploys Hosting to production.
- Changing `firestore.rules`, App Check, authentication, or account deletion.
- Creating, rotating or reading Firebase service accounts and keys.
- Putting `VITE_APPCHECK_DEBUG_TOKEN` anywhere outside `apps/web/.env.local`.
- Writing to Firestore outside a throwaway test account's own `users/{uid}` data.
- Force-pushing or rewriting `main`.
