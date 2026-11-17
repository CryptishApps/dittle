---
name: merge
description: Merge every PR labelled good to go into the integration branch together, then watch integration CI and revert the merge that breaks it. Use only when the user explicitly asks to merge; a finished PR or review is not a request.
---

# Merge the good-to-go PRs

Read `branches.integration` and `merge` from the `astack` section of `t3.json`. `merge.ts` works in its own temporary worktree, so run it from any clean checkout of this project.

`merge` merges the PRs and pushes. Integration CI is the gate: it runs the full check on a clean runner and deploys only when every check and build passes. `checks.merge` and `merge.deploy` are optional and unset by default.

## Merge

1. `git fetch origin`. Note `git rev-parse origin/<integration>` as the old tip.
2. `bun scripts/astack/merge.ts --dry-run`. Show the user the PRs it would merge.
3. `bun scripts/astack/merge.ts`. Read its JSON report.
4. Skipped PRs already have a comment and lost their label. Nothing more to do for them.
5. `checks` and `deploy` are `skipped` unless the project sets `checks.merge` or `merge.deploy`. If `deploy` is `failed`, the push stands and CI's own deploy follows; report the last lines of `deployOutput`.
6. `deleted` lists the merged branches it removed from GitHub. A branch stays when GitHub was slow to mark its PR merged or it got new commits; the weekly sweep picks up the first kind.
7. If `checks` is `fail` (only when `checks.merge` is set), nothing was pushed. Read the failing output, find the PR whose change it points to, comment on that PR with the failure, remove its label, and run `merge.ts` again.

## Watch integration CI

1. Find the run: `gh run list --branch <integration> --limit 1 --json databaseId,headSha`. Confirm `headSha` is the commit you pushed.
2. `gh run watch <id> --exit-status`
3. Green: report the merged PRs and CI's deploy result. Stop.

Without staging, the integration branch is the release branch, so this run is the Release workflow and its deploy is production.

## Revert on red

1. `gh run view <id> --log-failed`. Note the failing job, test, and files.
2. List the merges this run pushed: `git log --merges --first-parent --oneline <old-tip>..origin/<integration>`.
3. Match the failure to one merge with `git show --stat <merge>`.
4. In a temporary worktree from `origin/<integration>`: `git revert -m 1 <merge>`, then `git push origin HEAD:<integration>`.
5. Comment on that PR: the failing job link, the failure in one line, and the revert commit.
6. Tell the user which PR needs a fix, with the failure. In T3 Code, also send the PR link and failure to the thread that owns the PR. Start no new thread unless the user asks.
7. The fix goes on the PR's branch, starting with `git revert <revert-commit>`, and reaches the integration branch through a fresh `review`, the PR, and `merge`, when the user asks.
8. Watch the next integration run the same way.

If the failure does not match one merge, ask the user before reverting anything.

## Never

- Force-push the integration branch.
- Revert more than the merge that broke the run.
- Merge without the user asking, merge a PR without the label, or skip `checks.merge` when the project sets it.
- Open a release PR because the merge went green. Releases wait for the user.
- Delete the integration, release, or evidence branch.

Report the PRs merged, skipped, or reverted, and the final integration CI result.
