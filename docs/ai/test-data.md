# Test data

An empty database is a bad test. Seed your worktree's local backend with the seeded world instead of pointing at live state:

- Copy in, never symlink. Data flows one way: into your sandbox, never back out.

The backend package's own instructions name its seed files and commands, such as `packages/backend/AGENTS.md` from the backend pack.

## Shape

- Typed builders, one per table, with defaults. Tests and seeds both use them, so a schema change breaks one place at compile time.
- A base world: the smallest data that fills every screen. One or two records per kind, not dozens.
- Named, opt-in scenarios for clicking through one case.
- An idempotent `ensure` that builds the world once, keyed by a stable test-user key. The backend service's `afterReady` step runs it.

## Growth rules

- A feature that adds a screen or table extends the world just enough that the screen is not empty.
- Bug data lives in its failing test first. It becomes a scenario only when someone needs to click through it.
- A test caps the world: records per table and in total. Raising the cap is a reviewed change.
- Every scenario runs in a test, so a stale scenario fails and gets fixed or deleted.
- Never copy production user data.

## Where data lives

- Each worktree's local backend keeps its own state. Data survives a restart.
- To reset, stop the backend, delete its local state, and start it again. `ensure` rebuilds the world.
