# 04 — Sequential WorkflowRunner

Status: completed

**What to build:** A developer can preview and run a validated sequential workflow through Orca, with resolved profiles, explicit preflight feedback, injected lifecycle context, and a local manifest that maps graph nodes to Orca operations.

**Blocked by:** 01 — Minimal workflow validation foundation; 03 — Role, profile, and Conductor configuration.

- [x] The runner rejects execution when the workflow, required local profile, Orca CLI, or running Orca runtime fails preflight.
- [x] A valid sequential Agent workflow produces the expected task and dispatch operations through a replaceable Orca CLI adapter.
- [x] Dispatch inputs contain only the required structured context, artifact references, and optional Conductor handoff summary rather than raw output by default.
- [x] Every run writes a local, Git-ignored manifest mapping workflow nodes to created Orca task, dispatch, terminal, and run identifiers.
- [x] Tests exercise the runner using a recording adapter fake and verify its preview, dispatch ordering, and manifest behavior.

## Comments

- 2026-07-15: Added the sequential WorkflowRunner, production and recording Orca CLI adapters, preflight/preview/run IPC, structured handoffs, and local ignored run manifests. Verified with `npm test` (17 tests), `npm run typecheck`, and `npm run build` in `apps/workflow-studio`.
