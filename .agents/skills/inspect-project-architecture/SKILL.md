---
name: inspect-project-architecture
description: Inspect project architecture before a feature or refactor crosses an application, package, process, provider, persistence, public API, or durable-state boundary. Use for new modules, shared APIs, ownership changes, cross-package imports, and structural refactors. Do not use for isolated copy or styling changes.
---

# Inspect project architecture

Settle the contract before adding code across a boundary. Make the conventional implementation require fewer decisions than a shortcut.

## Inspect first

1. Read the active instructions, `.agents/project-profile.md`, and the architecture or security document nearest the change.
2. Search the relevant code, callers, tests, and recent Git history. Do not infer a subsystem from the file already open.
3. Describe the user outcome and the data shape that crosses the boundary.
4. Identify the current writer for every durable value. Do not introduce a second writer or a mirrored client copy.

## Settle the shape

Name these before implementation:

- the feature-owned directory
- stable public types or discriminated results
- the one module that writes durable state
- the package or process that owns platform and provider details
- allowed import direction
- the old caller or API removed after migration
- the runtime scenario that proves the result

Prefer deletion, colocation, and a smaller public contract over another adapter or central registry. New product work should normally add an owned module instead of another branch in a shared root file.

## Enforce the boundary

Turn import direction, forbidden dependencies, schema rules, and single-writer constraints into compiler, lint, dependency, or CI checks when they are mechanically detectable.

Run the boundary checks recorded in `.agents/project-profile.md`. Use `verify-project` when the change is ready for runtime proof. If this architectural mistake has recurred, invoke `capture-agent-lesson` explicitly.
