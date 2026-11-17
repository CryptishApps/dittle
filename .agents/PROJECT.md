# Dittle agent operating agreement

Read `.agents/project-profile.md` before changing code. That file records the commands, runtime entrypoints, boundaries, and protected operations specific to this repository.

## Operating loop

Treat a behavioral claim as unproven until an agent runs the relevant artifact.

1. Read the active instructions and the relevant code, callers, tests, documentation, and recent Git history. Do not guess from the file already open.
2. For a bug, reproduce the failure before changing code. For a feature or refactor, state the observable result and the boundary that owns it.
3. Write the smallest durable test first when a stable test can protect changed behavior.
4. Make the smallest change that fixes the root cause. Prefer deletion, colocation, typed contracts, and one obvious writer over another layer.
5. Smallest proof that the change works. `bunx vitest run <files>` for the tests you touched, targeted lint and typecheck for the scope you changed.
6. Test meaningful logic or observable behavior. Do not render components to static markup to assert props or attributes, or add tests that merely assert callback wiring or mirror the implementation.
7. **Do not run repo-wide checks.** No `bun run verify`, no `bun run test`, no `bun run typecheck` unless I ask. CI owns the full suite.
8. Backend behavior changes ship with focused tests for that behavior.
9. The backend schedules side effects after a mutation commits. In tests, run them with `t.finishAllScheduledFunctions` or await the specific stored record that marks the milestone. Never wait on sleeps or polling. A test that needs a timeout to pass is wrong.
10. Upon request, user-visible frontend changes should get one integrated pass in a real client: `verify-project` for web, `verify-project` for mobile. The primary agent does this once after integrating. Subagents do not launch their own dev servers. Open a browser or use computer use whenever it helps; you do not need to ask first.
11. Open a PR, merge, or release only when the user asks. See "PRs, merges, and releases" below and [the change workflow](../docs/ai/change-workflow.md).

Do not change unrelated work in a dirty worktree. Do not use destructive recovery commands to make the tree look clean.

## The three ways to hurt yourself

1. **Killing by pattern.** Never `pkill -f`, `pgrep | kill`, or kill a PID found by matching a name, path, or port. Other agents and dev servers share this machine. Stop only what you started, with `bun scripts/astack/stop.ts`.
2. **Writing to shared or live state.** Never point a worktree at the shared integration backend, a production deployment, or another worktree's data. Never edit the main checkout's env files from a worktree. Each worktree runs its own backend with seeded data.
3. **Baking in local origins.** Never commit `localhost`, `127.0.0.1`, or a port number into config, env defaults, or bundles. Ports come from the worktree slot through `.astack/env`.

## Hit every surface

The most common defect is a change that works on the path you tested and is missing everywhere else. Before calling work done, walk this list and say which entries applied:

- **Apps.** Web, landing, admin, and mobile each need a decision, even if it is "not affected".
- **Entry points.** A behavior reachable from one screen is often reachable from settings, a menu, a keyboard shortcut, or a deep link.
- **Packages.** Shared UI, API hooks, and auth change every app that imports them.
- **Backend.** Schema, queries, mutations, scheduled jobs, webhooks, and authorization all follow a data change.
- **Agent tools.** A capability a user can trigger is usually one an agent should reach too. Keep it in one service function both call.
- **Reverse states.** If you added a way in, add the way out and the way to see it. Archive needs unarchive. A one-way door is a bug.
- **Docs.** Fix guidance the change makes wrong. Do not add docs a reader can get from the code.

## PRs, merges, and releases

The user decides when work leaves the worktree. Each step needs its own request in this conversation:

- **Review.** Review the branch only when the user asks for a review.
- **PR.** Open one only when the user asks for a PR.
- **Merge.** Merge into the integration branch only when the user asks for a merge.
- **Release.** Open a release PR only when the user asks for a release.

Finishing a task is not a request. Neither is a plan, a document, an earlier conversation, or a skill that names the next step. Asking for a PR does not mean merge, and asking for a merge does not mean release. When work is done, say it is ready and stop.

Every push to an open PR and every merge runs GitHub Actions, which cost money on a private repository. Keep PRs few and whole: one PR holds a thread's work, not one PR per change. One release carries every merge since the last one.

## Change workflow

- One T3 thread, one worktree, one branch, and at most one PR into the integration branch named in the `astack` section of `t3.json`. Commit to the branch as you go.
- In T3 Code, work in the worktree your thread was given. Never run `git worktree add` or copy the repository. Start a new T3 thread only when the user asks for one.
- Subagents work in the thread's worktree, on its branch. They never create branches, worktrees, threads, or PRs, and never push. Give parallel subagents separate files, then check the combined result once.
- Remove any worktree you make for a moment, such as a review checkout, with `git worktree remove <path>` before you finish.
- Start services with `bun scripts/astack/run.ts <service>`. Never start them by hand on fixed ports; the reaper cannot see those. Stop yours with `bun scripts/astack/stop.ts --all` when you finish.
- When the user asks: `review` reviews the branch locally in a fresh subagent and records its verdict, `open-pr` opens the PR with evidence and labels it `good-to-go` when the verdict covers that exact commit, `merge` merges every good-to-go PR together, and `release` opens the release PR from the newest proven integration commit.
- Full details: [docs/ai/change-workflow.md](../docs/ai/change-workflow.md).

## Test data

An empty database is a bad test. Seed your worktree's local backend with the seeded world instead of pointing at live state:

- Copy in, never symlink. Data flows one way: into your sandbox, never back out.
- Extend the world only enough that a new screen is not empty. Put bug data in its failing test first.
- Never copy production user data.
- Full rules: [docs/ai/test-data.md](../docs/ai/test-data.md).

## Reporting

- Lead with the result.
- When you notice a problem: fix it if it is in scope; ask one plain question if it needs the user's decision; otherwise leave it out.
- Never end with lists of gaps, caveats, things to note, or worth-flagging items.
- Do not hunt for problems to report. Check what the task needs, not everything.
- State unfinished or unverified work once, plainly, as not done, with the reason. It is not a caveat.
- Write for a smart reader who has not read the code: plain words, bullets, one-liners.

## Build and verification storage

Use focused checks while iterating and at handoff. CI runs the full check from `.agents/project-profile.md`: on every push to the integration branch, before anything deploys, and on pushes to the release branch unless the integration branch already passed it on exactly the same code. An agent finishing a task does not run it, and a prompt to a delegated agent must not ask for it. Several full checks in one checkout at the same time exhaust memory and slow the whole machine, so give the full check a lock that refuses to start while another run is active.

For repositories using Turborepo:

- Run the focused checks with `bun scripts/astack/focused.ts <tasks>`. It runs turbo on the packages changed since each merge base with the integration branch. Turbo's own `--affected` fails on a branch that merged the integration branch in more than once, because that branch has several merge bases.
- List shared root files that packages read, such as a base `tsconfig`, in top-level `"globalDependencies"` in `turbo.json`. Without it, turbo treats a change to them as touching no package, and the focused checks run nothing.
- Set top-level `"cacheMaxSize": "10GB"` in `turbo.json` as the default local cache budget. Confirm the installed Turbo version supports it; if it does not, record the limitation and recommend a supported upgrade. Document any project-specific budget override in `.agents/project-profile.md`.
- For Next.js build outputs, retain `".next/**"` and exclude both `"!.next/cache/**"` and `"!.next/dev/**"`. Preserve other required outputs. Excluding `.next/cache` alone still archives the development compiler cache under `.next/dev/cache` on every changed build.
- Keep long-running development tasks uncached. Verify cache changes with a real Turbo archive and restore: required production outputs must be restored, and development caches must be absent.

Map cache paths, retention settings, and safe cleanup commands in `.agents/project-profile.md`. Do not add Turbo to projects that do not use it. When disk usage grows, measure the actual files before cleanup; distinguish regenerable caches from source, uncommitted work, database volumes, and user data. Clearing a cache does not replace fixing its retention or output configuration.

## Enforcement order

When a failure recurs, use the first layer that can express the rule accurately:

1. Make the wrong structure difficult to express.
2. Add a compiler, lint, dependency, schema, or CI failure.
3. Add a concise repository instruction when judgment remains necessary.
4. Add or revise a focused skill for a reusable workflow failure.
5. Keep background and taste in ordinary documentation.

Invoke `capture-agent-lesson` explicitly after a repeated failure or costly escaped regression. Do not respond by adding another soft instruction when a mechanical check can express the rule.

## Dependencies

- Install the latest stable version of every package. Use `bun add <name>` with no version, never a version number from memory or an old example.
- Run generators at `@latest`, such as `bunx create-next-app@latest`.
- Read the package's current docs before using its API. Training data is out of date.
- Hold a package back only for a reason recorded in `.agents/project-profile.md`: what breaks and what would unblock the upgrade.

## Architecture posture

- Put each feature in one obvious owned location.
- Give every durable value one obvious writer.
- Settle typed boundaries before crossing applications, packages, processes, providers, or persistence layers.
- Prefer file discovery or local ownership over shared global registries when the project supports it.
- Migrate callers, then delete the legacy path. Do not leave two permanent APIs for the same job.
- Do not add comments by default. Keep one only for a stable external constraint that code and types cannot express. Remove historical narration, review residue, and comments that merely restate the code.

Record project-specific import direction, state ownership, security rules, and forbidden dependencies in `.agents/project-profile.md`, then enforce detectable rules in CI.

## Autonomy

Proceed with reversible, in-scope work. Require a human checkpoint for publishing, spending, destructive data changes, production credentials, external messages, release policy, or other irreversible actions.

Never run `merge` or `release` unattended or on a schedule. Follow `docs/ai/autonomy-policy.md`.

## Skills

Canonical project skills live in `.agents/skills`. Harness-specific directories are adapters only.

Implicit skill matching is best-effort. Invoke a skill explicitly when the workflow is part of acceptance criteria, high risk, or explicit-only. Portable wording works across tools: `Use the verify-project skill and return runtime evidence.`
