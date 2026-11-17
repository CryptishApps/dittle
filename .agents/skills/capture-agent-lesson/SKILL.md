---
name: capture-agent-lesson
description: Convert a repeated agent failure, recurring review comment, false-green check, or costly escaped regression into a durable repository control. Use explicitly after recurrence or a material incident. Do not use for one-off preferences.
---

# Capture an agent lesson

Turn evidence from a failure into the hardest practical control. Do not add another paragraph to instructions by default.

## Establish the failure

1. Collect the raw artifact: diff, review comment, failed check, runtime trace, or reproduction.
2. Confirm the failure recurred or was costly enough to justify a durable rule.
3. Name the exact bad outcome and the smallest valid alternative.

## Choose the enforcement layer

Use the first layer that can express the rule accurately:

1. Change architecture so the bad path is difficult to express.
2. Add a compiler, lint, dependency, schema, or CI failure.
3. Add a concise repository instruction when judgment remains necessary.
4. Create or revise a focused skill when the failure is a reusable process mistake.
5. Use ordinary documentation for background and taste.

Do not encode a syntactic ban as a skill when static analysis can catch it. Do not make a global ban from one local incident.

## Implement and prove

1. For a mechanical check, add the smallest fixture that fails for the bad pattern and passes for the approved pattern. Observe it fail before implementing the check.
2. For a skill change, add direct, indirect, incomplete, non-trigger, and relevant edge cases to the comparison input.
3. Remove duplicated soft instructions after the harder control works.
4. Run the focused check and the focused commands from `.agents/project-profile.md` for what you changed.
5. Report the evidence, chosen layer, changed files, and any part that remains a soft rule.

Invoke `evaluate-agent-skill` explicitly after a material skill edit when independent agents are available and the user authorized delegation.
