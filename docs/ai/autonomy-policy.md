# Agent autonomy and merge policy

The user decides when a PR opens, merges, and releases, and every change carries evidence. Passing unit tests is not enough for a user-facing change, and a persuasive summary is never proof.

## Risk classes

| Class | Typical examples | Path to the integration branch |
| --- | --- | --- |
| Low | Documentation, tests, dependency-free tooling, isolated behavior-preserving refactors | Agent review, then `merge` |
| Product | Application, service, backend, workflow, integration, or shared-package behavior | Agent review of runtime evidence, then `merge` |
| Protected | Authentication, authorization, billing, migrations, destructive writes, secrets, external messages, release policy, or production infrastructure | The user's approval before the good-to-go label |

Adapt examples to this repository without weakening the Protected class.

## Who merges what

- A branch is reviewed, and a PR opened, merged, and released, only when the user asks for that step. Agents never schedule these or chain one into the next.
- Only `merge` merges into the integration branch. It pushes all the good-to-go PRs together; integration CI runs the full check and deploys only when it passes.
- With staging, a human approves and merges every release PR into the release branch.
- Without staging, `merge` pushes straight to the release branch, so a human asking for `merge` is asking for a production deploy.
- A PR gets the good-to-go label only from a reviewer's `good to go.` verdict for its exact head. The author never writes a verdict, approves, or merges its own PR.

## Required evidence

The PR template is the record. `pr-check.ts` fails a PR with an empty section, a UI change with no image, or a backend change with no backend evidence. Each PR records:

- acceptance criteria and risk class
- focused checks run and their results
- real artifact operated for any behavioral claim
- screenshots, video, and backend data before and after, as the change needs
- the failing test written first for a bug
- what could not be checked, and why

## Browser proof

For a web product, add a separate real-browser CI job after local verification is stable. Keep the normal full check fast, then require both jobs for user-facing web changes.

The browser job should start the proposed code, use a dedicated non-production identity and fixture, assert one stable critical path, attach a screenshot for passing scenarios, retain trace and video on failure, and fail on page errors, unexpected console errors, failed same-origin requests, skipped scenarios, or missing proof artifacts.

Roll it out locally, then by manual CI dispatch, then on the integration branch, and only then as a required check. Never turn missing secrets into a passing skip for a required job.
