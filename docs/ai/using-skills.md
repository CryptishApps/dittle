# Using project skills

Skills are reusable work routines. They are not permanent repository rules and do not mechanically enforce code quality.

## Shared source and adapters

The canonical source is `.agents/skills/<name>/SKILL.md`. Codex reads that location directly. Claude Code reads symlinks under `.claude/skills`. Do not copy and edit the same skill in both places.

`AGENTS.md` points every coding agent to `.agents/PROJECT.md`. `CLAUDE.md` imports `AGENTS.md`. Product rules and workflow steps belong in the shared files. Harness-specific metadata and settings stay in thin adapters.

## Automatic and explicit use

Both tools first discover a skill's name and description. They may load the full `SKILL.md` automatically when a request clearly matches. Automatic matching is best-effort.

Use explicit invocation when verification is required, the task is high risk, several skills might match, or the skill is explicit-only.

- Codex: `$verify-project`
- Claude Code: `/verify-project`
- Portable prompt: `Use the verify-project skill to reproduce this behavior and return runtime evidence.`

## Installed project skills

| Skill | Invocation | Use |
| --- | --- | --- |
| `verify-project` | Automatic or explicit | Bugs, completed behavior, workflows, integrations, performance, and proof requests |
| `inspect-project-architecture` | Automatic or explicit | Changes crossing modules, packages, processes, providers, persistence, or durable-state ownership |
| `create-verification-map` | Explicit | First setup or a new runnable artifact |
| `maintain-verification-map` | Explicit | Routes, commands, selectors, fixtures, or ownership changed |
| `capture-agent-lesson` | Explicit | A failure recurred or one incident was costly |
| `evaluate-agent-skill` | Explicit | A material skill revision needs a blind comparison |
| `open-pr` | Explicit | The user asks for a PR: checks, evidence, template, review verdict, push, open, label. One PR per thread |
| `review` | Explicit | The user asks for a review: a fresh subagent reviews the branch locally, before the PR, and records its verdict |
| `merge` | Explicit | The user asks to merge: the good-to-go PRs go into the integration branch together, and integration CI checks them |
| `release` | Explicit | The user asks for a release: the release PR from the newest proven integration commit |

Packs add their own skills to `.agents/skills`. Each pack's skill description says when it applies. See [the change workflow](change-workflow.md) for how the PR skills fit together.

Use the smallest set that covers the work. Loading every skill wastes context and pulls the agent toward irrelevant procedures.

## Put each rule in the right place

| Need | Location |
| --- | --- |
| One task's constraint | Current prompt |
| Always-needed project fact or rule | `.agents/PROJECT.md` or `.agents/project-profile.md` |
| Package-specific rule | The nearest nested instruction file |
| Repeatable workflow | Skill |
| Detectable bad pattern | Compiler, lint, dependency check, schema, or CI |
| Live external data or action | Purpose-built tool or connector |

Use review to discover rules. Move a recurring rule into architecture or CI instead of repeating the same review comment.
