---
name: maintain-verification-map
description: Keep a repository's runnable-artifact feature map accurate after routes, commands, authentication, fixtures, selectors, ownership, or launch procedures change. Use explicitly after such changes or when verification discovers stale instructions.
---

# Maintain the verification map

Update the map from observed behavior, not from an intended design.

1. Read `.agents/skills/verify-project/references/feature-map.md` and the current source owner.
2. Launch the affected artifact with the command recorded in `.agents/project-profile.md`.
3. Run the mapped path and note each stale command, route, state requirement, selector, or expected result.
4. Replace stale entries. Do not keep historical alternatives in the active map.
5. Add a new entry only after operating the path successfully.
6. Remove entries for deleted features.
7. Run one nearby mapped path to catch accidental drift.

Keep the map short. Record the user's language, the shortest path, stable selectors or typed inputs, required fixture state, source owner, and evidence channel. Keep secrets and human data out of it.
