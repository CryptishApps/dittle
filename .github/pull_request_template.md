<!--
One PR per thread, holding all of its work. Target the integration branch from the astack section of t3.json.
Title: a conventional commit in plain language, such as "fix(web): invite emails send once".
`pr-check.ts` fails this PR when a section is empty, a UI change has no image,
or a backend change has no backend evidence.
-->

## Problem

<!-- The problem in a sentence or two. For a bug, the steps that show it. -->

## Acceptance

<!-- Link the issue or task ("Closes #N"), then list each acceptance criterion
and where its evidence is below. With no issue, copy the criteria from the task
you were given. A reviewer checks the PR against this list. -->

## Change

<!-- How this fixes it. If it spans apps or packages, say why each is needed. -->

## Risk

<!-- One of: low, product, protected. See docs/ai/autonomy-policy.md.
Protected work names what a human must approve. -->

## Verification

<!-- What you ran or did, and what you saw. Name each command and its result.
Behavior changes: the focused test, and for a bug the failure it showed before
the fix. If no automated test fits, write "No test: <reason>" and give the
manual check before and after.
State anything you could not check and why. "Tests pass" alone is not enough. -->

## UI evidence

<!-- ### Before and ### After, with one labelled image per changed screen or
state, from `bun scripts/astack/evidence.ts add`. A video when moving between
screens or animating. Look at each image first: it must look finished (aligned,
no jumps, no placeholder text), not only work.
Write "N/A: no UI change" when none. -->

## Backend evidence

<!-- The data before and after: query output or stored records, as text.
Write "N/A: no backend change" when none. -->

## Review

<!-- The verdict file from the `review` skill, pasted as is, or "Not reviewed yet." -->

