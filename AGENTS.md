<!-- ASTACK:PROJECT:START -->
## Astack project instructions

Read `.agents/PROJECT.md` before doing repository work. It contains the shared operating agreement for any coding agent. Read `.agents/project-profile.md` for the actual commands, runtime entrypoints, boundaries, and protected operations.
<!-- ASTACK:PROJECT:END -->

## Dittle rules

### The owner's words for shipping

There is no staging. PRs target `main`, and every merge into `main` deploys https://dittle.app.

- "Create" means open a PR for the thread's work. First commit everything, run `checks.focused`, and have a fresh subagent with no shared context run the `review` skill. Fix every finding, commit, and review again until the verdict is `good to go.` for the head commit. Then use `open-pr`, which labels the PR `good-to-go`. A PR is never good to go without that separate review.
- "Release" means use the `merge` skill: it merges every `good-to-go` PR into `main` together, and the Release workflow deploys production once every check and the build pass. Do not use the `release` skill; it is only for projects with staging.
- Each step still waits for the owner's word. "Create" does not mean release.

### Project rules

- Tests run on Bun's test runner: `bun test <files>` in `apps/web`. Use it wherever the shared instructions say `bunx vitest run`.
- No code comments by default.
- Ask the owner before shipped code makes a decision from human-written text with regexes, keyword lists, substring checks or similar matching. Tests are exempt.
- Commits are authored as `Cryptish <57979515+CryptishApps@users.noreply.github.com>`. Never use another email.
- Commit messages, PR titles and PR bodies never mention Claude, Codex or AI tools, and never carry `Co-Authored-By` lines.
- `VITE_APPCHECK_DEBUG_TOKEN` lives only in `apps/web/.env.local`. Never put it in CI, variables, secrets, or committed files. `bun run build` fails if it reaches `apps/web/dist`.
- Every dev server talks to the live Firebase project. Use a throwaway account and delete it afterwards. See `.agents/project-profile.md`.
