---
name: create-verification-map
description: Create the first runnable-artifact verification workflow and feature map for a repository. Use explicitly when setting up Astack in a new project, adding a new web, desktop, mobile, CLI, extension, or service artifact, or replacing an unverified launch path.
---

# Create the verification map

Build the control workflow locally where its behavior can be watched. The result must let a future agent launch the artifact, reach a feature, operate it, and collect evidence without guessing.

## Discover the artifacts

1. Read the active instruction chain, `.agents/project-profile.md`, package manifests, task runners, CI, and nearby architecture or security docs.
2. Identify every user-operable artifact and its real start command.
3. Launch each in-scope artifact. Do not infer commands or routes only from source.
4. Record required services, test identities, fixtures, ports, simulators, and safe non-production boundaries.

## Map features from the user's view

For each reliable feature, record:

- what the user calls it
- the shortest route or command to reach it
- required authentication and fixture state
- stable accessible names, roles, protocol inputs, or CLI arguments
- the source-owned directory
- the evidence channel, such as screenshot, trace, network result, stdout, or stored record

Prefer accessible names and typed protocol inputs. Avoid coordinates and fragile CSS selectors.

## Write and prove

1. Use [the feature-map template](references/feature-map-template.md).
2. Write the completed map to `../verify-project/references/feature-map.md` relative to this skill.
3. Run one representative path through each artifact locally.
4. Correct every command, route, selector, and required state that fails.
5. Update `.agents/project-profile.md` with the canonical launch and verification commands.

Do not put secrets, human account data, production identifiers, or copied provider payloads in the map.
