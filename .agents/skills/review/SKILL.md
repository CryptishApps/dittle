---
name: review
description: Review a thread's branch before it becomes a PR, from local git, against its acceptance criteria, every affected surface, its tests, and its evidence, then record the verdict that open-pr uses. Use only when the user asks for a review, in a fresh subagent or a separate session, never in the context that wrote the change.
---

# Review a branch

Read `branches.integration`, `checks.focused`, and `merge.label` from the `astack` section of `t3.json`.

The review happens before the PR, so findings get fixed locally and GitHub checks the PR once. All of a project's worktrees share one git repository, so the reviewer reads the branch without anything being pushed.

## Start it

- The user asks for a review. The author commits everything, updates the branch (`git fetch origin`, then `git rebase origin/<integration>`), and runs `checks.focused`.
- The author then starts a fresh subagent with no shared context, in the same worktree. It passes only the branch name, the task's acceptance criteria word for word, and where the evidence is. The subagent follows this skill.
- In a separate T3 thread, read the branch by name from that thread's checkout. Never edit the author's worktree.
- The reviewer reads and runs checks. It never edits files, commits, or pushes.

## Read

1. `git log --oneline origin/<integration>..<branch>` and `git diff origin/<integration>...<branch>`.
2. The acceptance criteria. If there are none, that is a finding.
3. `.agents/PROJECT.md` and any nested instruction file next to the changed code.
4. The evidence the author captured.

Note the head commit: `git rev-parse <branch>`.

## Check

- **Acceptance.** Each criterion is met and observable, not just plausible from the diff.
- **Surfaces.** Walk "Hit every surface" in `PROJECT.md`. Each entry that applies is handled.
- **Tests.** A bug fix has a test that fails without the fix. Tests assert behavior, not implementation.
- **Checks.** Run `checks.focused` with the task cache off (for Turborepo, prefix with `TURBO_FORCE=true`). Red is a finding. A green run that executed no tasks while the branch changed code or shared config is also a finding.
- **Evidence.** Each screenshot shows the changed state from the diff. Each video shows the whole flow. Backend evidence shows the data before and after.
- **Verification.** Every claim matches the evidence or what you saw. Each thing the author could not check is either acceptable or a finding.
- **Risk.** The class fits the change. Protected work names what a human must approve.
- **Safety.** No local origins or ports committed. No shared or production state touched. No evidence files committed.

Run the change yourself only when evidence is missing, doubtful, or cannot show a criterion. Use the worktree's running services (`bun scripts/astack/status.ts`) or start them with `run.ts`. A platform this machine cannot run does not cancel adequate evidence.

Findings are things that must be fixed before this becomes a PR. Leave out style preferences the project has not written down, and "consider" lists.

## Record the verdict

The file `"$(git rev-parse --git-common-dir)/astack/reviews/<branch>.md"` keeps every review round for the branch, newest first. Create the folder if needed. Add this round at the top, above earlier rounds and a `---` line, so the file's first line is always the latest verdict. Never edit or drop earlier rounds: `open-pr` posts the whole file on the PR.

The round's first line is exactly one of:

- `Reviewed <head>: good to go.`
- `Reviewed <head>: good to go once the user approves the protected part.`
- `Reviewed <head>: changes needed.`

Then one line per finding (file and line, what is wrong, what to do), or for a clean review, the checks you ran and what you looked at. On a re-review, also say for each earlier finding whether it is fixed.

If a PR for the branch is already open (`gh pr list --head <branch> --state open`), also post this round as a comment (`gh pr comment <number> --body-file <file with this round>`). On `good to go.` add the label too: `gh pr edit <number> --add-label <merge.label>`. Comments and labels run no GitHub Actions.

A verdict covers only the commit it names. After fixes, the author commits and asks the user for a fresh review.

Report the verdict and the findings.
