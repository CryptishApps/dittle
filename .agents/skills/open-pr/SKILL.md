---
name: open-pr
description: Open the one pull request for this thread's branch into the integration branch, with focused checks, runtime evidence, the review verdict, and a filled PR template, and label it good to go when the review covered the exact commit. Use only when the user explicitly asks to open or submit a PR; finishing a task is not a request.
---

# Open a PR

Read `branches.integration`, `checks.focused`, and `merge.label` from the `astack` section of `t3.json`. Follow [the change workflow](../../../docs/ai/change-workflow.md).

Work and verification come first: by now `verify-project` has captured the before and after evidence. Usually the user has also asked for a `review`, whose verdict is in `"$(git rev-parse --git-common-dir)/astack/reviews/<branch>.md"`.

## Prepare the branch

1. Confirm you are on a task branch, not the integration or release branch.
2. Confirm the diff holds this thread's work and nothing else: `git status` and `git diff origin/<integration>...HEAD`.
3. Read the verdict file. If its first line names `git rev-parse HEAD`, the review covered this exact commit: skip step 4 and the focused checks below, since the review ran them. Rebasing now would change the commit and void the verdict.
4. Otherwise update the branch: `git fetch origin`, then `git rebase origin/<integration>`, resolving conflicts, and commit with a conventional title in plain language, such as `fix(web): invite emails send once`.

## Check and verify

1. Run `checks.focused`, unless the review covered this commit. Fix anything red. Do not run the full check; integration CI owns it.
2. For any behavior change, use `verify-project`. It captures screenshots, video, and backend data and uploads them with `bun scripts/astack/evidence.ts add`.
3. Keep the markdown each upload prints.

## Fill the template

1. Copy `.github/pull_request_template.md` to a temporary file outside the repository.
2. Fill every section. Replace the guidance comments with content.
3. Acceptance: link the issue, or copy the acceptance criteria from the task you were given, word for word. Point each criterion at its evidence. The reviewer has only the PR.
4. Pick one risk class: low, product, or protected. See `docs/ai/autonomy-policy.md`.
5. Verification: write what you ran and what you saw, with each command and its result. For a bug, include the test's failure before the fix. Say what you could not check and why.
6. Paste the evidence markdown into UI evidence, under `### Before` and `### After`, and into Backend evidence.
7. Review: paste the latest round from the verdict file (from the first line down to the first `---`), or write `Not reviewed yet.`
8. Check it locally:
   - `git diff --name-only origin/<integration>...HEAD > <files-file>`
   - `bun scripts/astack/pr-check.ts --body-file <body-file> --files-file <files-file>`
   - Fix every failure it prints.

## Open it

1. `git push -u origin HEAD`
2. `gh pr create --base <integration> --title "<title>" --body-file <body-file>`
3. Post the reviewer's comments on the PR: `gh pr comment <number> --body-file <verdict file>`. It holds every review round, so the PR shows what the reviewer found and that each finding was fixed. Comments run no GitHub Actions. Post it as is; never edit a verdict.
4. If the verdict's first line is exactly `Reviewed <the head you pushed>: good to go.`, add the label: `gh pr edit <number> --add-label <merge.label>`. Any other verdict, or none, gets no label: say the PR needs a review, or the user's approval of the protected part, before `merge` takes it.
5. When T3 Code's `link_pull_request` tool is available, link the PR to this thread.
6. Watch the PR checks, including the focused checks on a clean machine: `gh pr checks --watch`. A check that passes for you and fails in CI usually means the check depends on a gitignored or generated file.
7. Stop your services: `bun scripts/astack/stop.ts --all`. Start them again with `run.ts` if a follow-up needs them.

## Follow up

If a PR check fails or a bot leaves a finding, check it against the source. Fix every real one in one commit, then tell the user: a push runs PR CI again and removes the good-to-go label, so the new head needs a fresh `review` before it gets the label back. Answer false findings on the PR with the reason.

## Never

- Open a PR without the user asking, or a second PR for this thread's work.
- Claim a check you did not run. Say what you could not check instead.
- Target the release branch, when the project has staging.
- Add the good-to-go label without a reviewer's `good to go.` verdict for the exact head you pushed.
- Write or edit a review verdict, approve, or merge your own PR.
- Commit evidence files to the branch.

Report the PR link, its risk class, the review verdict, whether it has the label, and the evidence attached.
