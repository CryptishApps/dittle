# Change workflow

Work goes T3 thread worktree → branch → agent review → PR with evidence, good to go → merge into the integration branch → release PR into the release branch. Branch names come from the `astack` section of `t3.json` (`branches.integration`, default `staging`; `branches.release`, default `main`).

## Only when the user asks

The user decides when work leaves the worktree. Each of these needs its own request in this conversation:

- Reviewing the branch.
- Opening a PR.
- Merging into the integration branch.
- Opening a release PR.

Finishing a task is not a request. Neither is a plan, a document, an earlier conversation, or a skill that names the next step. Asking for a PR does not mean merge, and asking for a merge does not mean release. When work is done, say it is ready and stop.

Every push to an open PR and every push to the integration or release branch runs GitHub Actions, which cost money on a private repository. Keep PRs few and whole: one PR holds a thread's work. One merge takes every good-to-go PR. One release carries every merge since the last one.

Staging is optional. A project without it sets `branches.integration` to the release branch (`astack new --no-staging` or `astack init --no-staging`). Then PRs target `main`, `merge` pushes to `main`, every merge deploys production, and there are no release PRs. Wherever this document says the integration branch, read the release branch.

## 1. Start a worktree

- One T3 thread, one worktree, one branch. Never work on two threads' tasks in one checkout.
- In T3 Code, choose "New worktree". Its setup script runs on creation.
- An agent inside T3 Code works in the worktree its thread was given. It never runs `git worktree add` or makes copies of the repository. It starts a new T3 thread only when the user asks for one.
- Subagents work in the thread's worktree, on its branch. They never create branches, worktrees, threads, or PRs, and never push. Give parallel subagents separate files, then check the combined result once.
- Commit to the thread's branch as you go. Commits stay local until the user asks for a PR.
- A worktree you make for a moment, such as a review checkout, is yours to remove with `git worktree remove <path>` before you finish.
- `t3.json` holds the T3 scripts and, under `astack`, every Astack setting. Edit the `astack` section, then run `astack adapters` to refresh the scripts. Scripts you add yourself are kept.
- Elsewhere, create it by hand, then run setup:
  - `git worktree add ../<repo>-<slug> -b <branch> origin/<integration>`
  - `bun scripts/astack/setup.ts`
- Setup installs dependencies, links or copies env files, claims a port slot, writes `.astack/env`, and installs the reaper timer.
- Setup is safe to run again. Run it when module resolution or env values look wrong.

## 2. Name the branch

- `<type>/<short-slug>`, branched from `origin/<integration>`.
- Types match conventional commits: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`.
- Example: `fix/invite-email-twice`.

## 3. Run services

- `bun scripts/astack/run.ts <service>` starts a service and anything it requires, then prints its URL.
- `bun scripts/astack/status.ts` lists this project's slots and services.
- `bun scripts/astack/stop.ts <service>` or `--all` stops what this worktree started. Stop yours when you finish; T3 Code also runs `stop.ts --all` when a thread settles.
- `bun scripts/astack/env.ts` prints the worktree's env for a manual shell.
- Each worktree gets its own ports and its own local backend with seeded data. See [test data](test-data.md).

## 4. Test first

- Bug: write the failing test, watch it fail, then fix.
- Feature: write the main contract test before the code.
- Smallest proof that the change works. `bunx vitest run <files>` for the tests you touched, targeted lint and typecheck for the scope you changed.
- Test meaningful logic or observable behavior. Do not render components to static markup to assert props or attributes, or add tests that merely assert callback wiring or mirror the implementation.
- **Do not run repo-wide checks.** No `bun run verify`, no `bun run test`, no `bun run typecheck` unless I ask. CI owns the full suite.
- Backend behavior changes ship with focused tests for that behavior.
- The backend schedules side effects after a mutation commits. In tests, run them with `t.finishAllScheduledFunctions` or await the specific stored record that marks the milestone. Never wait on sleeps or polling. A test that needs a timeout to pass is wrong.

## 5. Verify with evidence

Explain how you established the problem, how you checked the change, and what you observed. Give the relevant reproduction steps, environment, focused test commands or manual checks, and their results. State what you could not check. A checkbox or "tests pass" alone does not show that the change works.

Match the evidence to the change. Use focused tests for behavior that can be tested and manual evidence where appropriate. Do not substitute broad test runs for checking the affected behavior, or run repo-wide checks just to satisfy this guide. A backend fix does not need unrelated UI evidence.

- Upon request, user-visible frontend changes should get one integrated pass in a real client: `verify-project` for web, `verify-project` for mobile. The primary agent does this once after integrating. Subagents do not launch their own dev servers. Open a browser or use computer use whenever it helps; you do not need to ask first.
- Screenshot every UI change.
- Record a video when the change moves between screens or has motion.
- Check backend data before and after a backend change.
- Capture with the harness's own tools (T3 Code's browser and device panels first). `verify-project` lists the order.
- Upload with `bun scripts/astack/evidence.ts add <files> --label "<what it shows>"`. It uploads only, and prints markdown for the PR.

## 6. Review

- Only when the user asks. The review happens before the PR, so findings get fixed locally, for free, and GitHub checks the PR once.
- The author commits everything, updates the branch from `origin/<integration>`, runs `checks.focused`, then starts a fresh subagent with no shared context to run `review`. It passes only the branch name, the acceptance criteria, and where the evidence is. A separate T3 thread can review instead: all of a project's worktrees share one git repository, so it reads the branch by name.
- The reviewer never edits, commits, or pushes. It adds each round to `$(git rev-parse --git-common-dir)/astack/reviews/<branch>.md`, newest first, naming the exact commit it reviewed. The author never writes or edits a verdict.
- Findings: the author fixes all of them in one go, commits, and the user asks for a fresh review.
- Protected-risk work also needs the user's approval. See [autonomy policy](autonomy-policy.md).

## 7. Open the PR

- Only when the user asks. Use `open-pr`.
- One PR holds the thread's whole branch. Never split a thread's work into several PRs, and never open one from a subagent.
- The PR targets the integration branch. With staging, never the release branch.
- The PR states its acceptance criteria, what was verified, and the latest review verdict, in plain sentences. There are no checkboxes to tick.
- `open-pr` posts every review round on the PR as one comment, so the reviewer's findings and their fixes stay on record. Comments run no Actions.
- When the verdict is `good to go.` for the exact commit pushed, `open-pr` adds the `good-to-go` label (`astack.merge.label` in `t3.json`). Without one, the PR waits for a review; the reviewer then comments and labels it on GitHub, which runs no Actions.
- PR CI checks the template and evidence (`pr-check.ts`) and runs `checks.focused` on a clean machine: typecheck, tests, and lint for what the PR changed. It does not run the full check; integration CI does.
- Every push to the PR runs PR CI again and removes the good-to-go label. The new head needs a fresh review.

## 8. Merge

Only when the user asks. `merge` takes every good-to-go PR together and pushes the merged result. Integration CI is the gate: it runs the full check on a clean runner and deploys the integration environment only when every check and every app build passes.

- `merge` merges labelled PRs, oldest first, up to `merge.maxPRs`, into a temporary worktree from `origin/<integration>`.
- It skips a PR that conflicts, comments on it, and removes its label.
- It pushes once. It runs no local check by default, so merging takes seconds and the machine stays free.
- `checks.merge` is optional. When set, `merge` runs it on the merged result first and pushes nothing on red. Leave it unset unless a red integration branch costs more than a slow local run.
- `merge.deploy` is optional and runs after the push, before CI has checked anything. Leave it empty, so nothing goes live before CI passes.
- GitHub marks each PR merged because its head commit is now on the base.

## 9. Integration CI

- A push to the integration branch checks the merged PRs on a clean runner, then deploys the integration environment.
- A `changes` job groups the workspaces that have a `typecheck` script into `ci.typecheckJobs` parallel `types` jobs (default 4), spreading the heaviest by source file count. `ci.typecheckExclude` lists workspaces CI never typechecks.
- Type checks run TypeScript 7 (`@typescript/native`), with `-- --checkers 1`, because GitHub's 2-core runners check faster with one checker than with the default four. The plain `typescript` package stays below 6.1 for the tools that need its JavaScript API.
- The same job lists one `tests` job per workspace with a `test` script. `ci.testShards` maps a workspace to a shard count: that workspace gets that many jobs instead, each running `bunx vitest run --shard=i/N` from the workspace. Only Vitest suites can be sharded. `ci.testExclude` lists workspaces the test matrix never runs.
- The `checks` job runs `checks.ci`, every other check, next to them. The `verify` job passes only when every `types` job, every `tests` job, and the `checks` job passed.
- Turborepo's remote cache is on when the `TURBO_TOKEN` and `TURBO_TEAMID` secrets are set, so CI reuses results it already built. On Vercel these are a Vercel token and the team ID. PR runs only restore Bun's download cache; integration and release runs save it.
- `build` jobs start at once, next to the checks, and build candidates that are not live yet. The backend deploys once `verify` and every build passed, then each app's tested build goes live. Nothing goes live while any check or build is red.
- `bun run typecheck`, `bun run test`, and `bun run verify` still run everything in one go locally.
- Without staging, that push goes to the release branch, so the Release workflow runs the same jobs, always, and deploys production. It has no `proven` job, because there is no integration branch to have proved the code.
- If it goes red, `merge` finds the merge that broke it, reverts that merge commit, pushes, and comments on the PR.

## 10. Release

This section applies only to projects with staging.

- Only when the user asks for a release, never because a merge finished. The agent follows the `release` skill: `bun scripts/astack/release.ts --dry-run`, then `bun scripts/astack/release.ts`.
- It releases the newest commit on the integration branch that a successful Integration run proved by passing `verify`. Every push to the integration branch cancels the run in progress, so the tip is often still unproven; waiting for it can take an hour on a busy day. Newer commits wait for the next release.
- It pushes `release/<date>`, a copy of that commit, and opens a PR from the copy into the release branch. The log and the PR body name the commit, the run that proved it, and the merged changes it releases.
- With no passing run yet, as in a new project, it says so and releases the tip. `--tip` releases the tip on purpose. Either way the Release workflow runs the full check on it.
- The PR never comes from the integration branch itself. GitHub deletes a PR's branch after the merge, and that must only ever remove the copy.
- A human approves and merges it with a merge commit, never squash, so the branches keep one history.
- A push to the release branch deploys production. It skips the typecheck jobs, the test jobs, and the `checks` job when an integration-branch commit with exactly the same code already passed `verify`, and runs them otherwise, for example after a hotfix made only on the release branch.

## 11. Branch cleanup

- The integration, release, and evidence branches live as long as the project. Every other branch is deleted once its work is merged.
- GitHub deletes a PR's branch when someone merges the PR in GitHub.
- `merge` merges by pushing, which GitHub does not count as a merge in the UI, so `merge` deletes each merged branch itself once GitHub marks the PR merged, unless GitHub's auto-delete already removed it.
- The Branch sweep workflow runs every Monday. It deletes branches with no open PR whose commits are all merged, and lists branches with unmerged commits and no commit in 30 days. Run `bun scripts/astack/sweep.ts --dry-run` to see the same list locally.
- No script deletes a branch that has new commits since it was checked, or one of the long-lived branches.
- `bun scripts/astack/github.ts`, run once by a repository admin, turns on GitHub's auto-delete, creates the good-to-go label, re-saves the Actions permissions, and adds a ruleset that blocks deleting or force-pushing the integration and release branches. Rulesets on a private repository need a paid GitHub plan; without one, the scripts above are the only guard.

## Why merge PRs together

- The full check is slow. One run for ten PRs costs one run, not ten. In CI it is split into parallel jobs, so the slowest job sets the time, not the sum of them.
- Integration CI runs the full check on the exact merged result and deploys nothing until it passes. A red run is reverted by `merge`.
- PR CI stays cheap and fast, so authors get feedback in minutes.

## The reaper

- Each running service is recorded in the main checkout's `.astack/processes/`.
- A timer runs `bun scripts/astack/reap.ts` every `reaper.intervalMinutes`.
- It stops a service when its worktree is gone, its branch is merged into the integration or release branch, or it has been idle longer than `reaper.idleHours`. Only services started with `run.ts` are recorded, so it cannot see a server started by hand.
- Idle means no git activity and no file edits in the worktree.
- It removes a worktree when all of these hold, judged from the last fetch of `origin`; it never fetches itself:
  - Its work is merged. On a branch, the branch was merged into the integration or release branch and has no commits since. A branch with no commits of its own is not merged. Detached, its commit is already on one of them.
  - It has no uncommitted or untracked files, and no merge or rebase in progress.
  - No recorded service runs in it.
  - Nobody has used it for `reaper.worktreeIdleHours` (default 24).
  - It is not the main checkout, not on the integration, release, or evidence branch, and not locked.
- Then it deletes the worktree's local branch. It also deletes any other local branch that is merged and is not checked out anywhere.
- A worktree whose work is merged but which still has uncommitted or untracked files waits `reaper.dirtyWorktreeIdleHours` (default 168, one week). Then the reaper commits those files, on top of the worktree's last commit, to `refs/archive/worktrees/<date>/<folder>`, and removes the worktree and its branch. If saving fails, it keeps the worktree. `git worktree add <path> <ref>` brings the files back.
- It deletes those archive refs after `reaper.archiveDays` (default 45). To keep one, copy it outside `refs/archive/worktrees/<date>/`, for example `git update-ref refs/archive/worktrees/keep/<name> <ref>`.
- It never removes a worktree whose work is not merged.
- It never deletes the integration, release, or evidence branch, never touches a remote branch, and forces a removal only after saving the worktree's files. To keep a worktree, lock it: `git worktree lock <path>`.
- Ignored files in a removed worktree, such as build output and copied env files, go with it.
- `bun scripts/astack/reap.ts --dry-run` shows what it would stop and remove.
- The timer is per main checkout: a systemd user timer on Linux, a launchd agent on macOS. When the main checkout it was installed for no longer exists, the timer's next run removes the timer itself.
- `bun scripts/astack/reap.ts --uninstall-timer` removes it on purpose, for example before you move or delete the project. The next worktree setup installs it again.

## Never

- Review, open a PR, merge, or open a release PR without the user asking for that step.
- Write a review verdict for your own work, or label a PR without a `good to go.` verdict for its exact head.
- Split a thread's work into several PRs, or open a PR, branch, worktree, or thread from a subagent.
- Push to the integration or release branch, except through `merge`.
- Delete the integration, release, or evidence branch. They live as long as the project.
- Open a release PR from the integration branch itself. Use `release.ts`.
- Merge or approve your own PR.
- Open or merge a release PR without the user asking.
- Commit screenshots or videos to a product branch. Use the evidence branch.
- Claim a check you did not run.
- Force-push any branch except your own feature branch. `evidence.ts prune` is the one exception.
- Run the full check at the end of a task.
- Kill a process you did not start, or find one by name or pattern.
- Start a dev server by hand on a port. Use `run.ts`.
- Make a worktree inside T3 Code with `git worktree add`, or leave one you made behind.
- Point a worktree at a shared or production backend.
