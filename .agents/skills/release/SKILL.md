---
name: release
description: Open the release PR from the newest integration-branch commit that passed Integration CI, for a human to merge into the release branch. Use only when the user explicitly asks for a release; a finished merge is not a request.
---

# Open a release PR

Read `branches.integration` and `branches.release` from the `astack` section of `t3.json`. This applies only to projects with an integration branch; without one, `merge` deploys production and there are no release PRs.

`release.ts` releases the newest commit on `origin/<integration>` that a successful Integration run proved: the run passed its `verify` job, and its commit is on the integration branch's history. Newer commits whose runs are still going, or were cancelled by a later push, wait for the next release. Nobody waits for the tip's run to go green.

## Steps

1. `bun scripts/astack/release.ts --dry-run`. Read its log and JSON report:
   - `sha`: the commit it would release. `provenBy`: the Integration run that proved it, with its link.
   - `changes`: the merged changes between the release branch and that commit.
   - `waiting`: newer merged changes not in this release, still waiting for a passing run.
   - If it says no Integration run has passed yet, it falls back to the tip, and the Release workflow runs the full check on it. That is normal only in a new project.
2. Show the user the commit, the proving run, and the changes. If the user asked for something in `waiting`, say it is not proven yet and ask whether to wait for its run or release without it.
3. `bun scripts/astack/release.ts`. It pushes `release/<date>`, a copy of that commit, and opens the PR into the release branch.
4. Pass `--tip` only when the user asks to release the tip knowingly. The Release workflow then runs the full check unless an Integration run passed on exactly that code.

If a release PR is already open, the script reports its link and opens nothing. Report that link.

## Report

- The PR link.
- The released commit and the Integration run that proved it, or that it fell back to the tip and why.
- The changes in the release, and any still waiting.
- That a human approves and merges it with a merge commit, never squash. The merge deploys production.

## Never

- Open a release PR without the user asking, including right after a merge goes green. One release carries every merge since the last one.
- Approve, merge, or label the release PR.
- Open a release PR from the integration branch itself, or push to the release branch.
- Use `--tip` to get past a failed or missing run without the user's say-so.
- Delete the integration or release branch.
