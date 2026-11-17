---
name: evaluate-agent-skill
description: Compare an agent skill revision against realistic hidden cases without leaking the desired answer. Use explicitly after a material SKILL.md or skill-resource change. Do not use during ordinary product implementation.
---

# Evaluate an agent skill

Treat a skill edit as a behavior change. Measure activation and work quality separately.

## Design the comparison

1. Read the target skill and state the behavior the revision claims to improve.
2. Write three to six concrete criteria. Keep them outside candidate context.
3. Prepare representative requests: direct, indirect, incomplete, nearby non-trigger, and a risky edge case when relevant.
4. Use [the comparison template](references/comparison-template.md) for the private record.

## Keep candidates blind

1. Copy each candidate into a fresh randomly named temporary directory.
2. Keep criteria, expected answers, prior conclusions, and other outputs out of candidate context.
3. Do not use evaluation-related words in candidate-visible paths or prompts.
4. Give every candidate the same task-local inputs and tool access.

When the environment exposes independent agents and the user authorizes delegation, run each candidate in a fresh agent. Otherwise prepare the cases and report that the behavioral comparison remains unrun. Never invent independent results.

## Judge and inspect

1. Prefer one independent judge from a different model family. Give it all outputs and the private criteria in one pass.
2. Hide candidate identity from the judge.
3. Read every output yourself. Judge disagreement often means the criteria are vague or biased.
4. Reject a revision that improves style while weakening safety, verification, or completion.
5. Re-run the whole comparison after every material edit.

Validate the final skill structure with an available Agent Skills validator. Record models, prompts, outputs, criteria, result, and human notes.
