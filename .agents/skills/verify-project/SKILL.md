---
name: verify-project
description: Reproduce and verify project behavior in the real runnable artifact. Use for bug reports, completed features, UI or workflow changes, integration changes, performance claims, and requests to prove that behavior works. Do not use for docs-only explanations with no behavioral claim.
---

# Verify the project

Prove behavior by operating the artifact a user or real caller would operate. Tests support the proof but do not replace it when the artifact can run.

## Prepare

1. Read the active instructions, `.agents/project-profile.md`, and [the feature map](references/feature-map.md).
2. State the claim as an observable result.
3. Capture the starting state before changing code: the failing behavior for a bug, the baseline for performance, and the before screenshots for a UI change.
4. Choose the smallest runnable artifact that contains the behavior.
5. Confirm the environment is non-production before creating fixtures or calling external providers.

## Operate the artifact

1. Launch it with `bun scripts/astack/run.ts <service>` or the command the map records. If the command is stale, inspect the project, correct the map, and continue.
2. Follow the shortest mapped user or protocol path.
3. Use semantic selectors, typed inputs, and public interfaces instead of coordinates or private helpers.
4. Exercise one nearby regression path when the change could affect it.
5. Inspect the relevant failure channel: rendered state, console, network, stored result, process boundary, simulator log, trace, profiler, stdout, or exit status.
6. For performance work, repeat the same measurement before and after. Do not claim improvement from source inspection.

## Capture evidence for the PR

Capture what a reviewer needs to trust the change without running it:

- a screenshot of every UI change, after and, when it helps, before
- a video when the change moves between screens or has motion
- backend data before and after a backend change: the query output or stored records, as text in the PR
- the failing test output for a bug, before the fix

`evidence.ts` uploads files; it does not capture them. Capture with what the harness gives you, in this order:

1. T3 Code's built-in tools when they are available: `preview_open` on the service URL, `preview_snapshot` with `save: true` for a screenshot path, `preview_recording_start` and `preview_recording_stop` for a video path, and `device_screenshot` for a simulator or device.
2. The project's own browser or end-to-end runner, when the profile records one.
3. The platform's own tools: a simulator screenshot or screen recording.

Name the screenshots so their order and state are clear, such as `before-empty.png` and `after-empty.png`. Save files outside the repository in a folder unique to this branch, such as `${TMPDIR:-/tmp}/astack-evidence/<branch>/`, so another session's files are never uploaded with yours. Then upload them:

```bash
bun scripts/astack/evidence.ts add <files...> --label "<what it shows>"
```

The command prints markdown. Paste it under `### Before` and `### After` in the PR's UI evidence, or into Backend evidence. Never commit evidence files to the branch.

## Run checks

Run the smallest focused check first, then the focused type-check, test, and lint commands from `.agents/project-profile.md` for what you changed. Do not run the full check; `merge` runs it and CI repeats it. Record every command and exit status. Do not hide a red check behind a summary.

## Return evidence

Report:

- artifact and environment
- starting state and exact reproduction steps
- expected and observed behavior before the change
- observed behavior after the change
- evidence markdown from `evidence.ts`, plus trace, response, or command output when useful
- focused checks and their exit status
- anything not verified, stated once with the concrete reason

Use `PASS` only for a claim directly observed. Use `BLOCKED` when credentials, unavailable infrastructure, missing hardware, or an unsafe environment prevents the check. A confident explanation is not evidence.
