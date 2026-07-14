# 07 — Project-local Orca workflow skill

Status: completed

**What to build:** A developer can use the same project-local workflow commands from Codex or Claude terminals inside Orca to list workflows, validate one, start a run, and inspect its Orca-backed status.

**Blocked by:** 04 — Sequential WorkflowRunner; 05 — Approval and failure pauses; 06 — Branching, parallelism, and Worktree safety.

- [x] The project contains an installable or generated Agent Skill that exposes `list`, `validate`, `run`, and `status` operations.
- [x] Commands clearly report validation, preflight, run identifiers, active decision gates, and paused failure state without presenting Studio as the live runtime dashboard.
- [x] The initiating Codex or Claude terminal is not assumed to be the provider selected for any workflow Agent node.
- [x] Command-level tests verify each operation against controlled workflow and Orca adapter inputs.

## Comments

- 2026-07-15: Added the project-local `orca-workflow` Agent Skill and `ProjectWorkflowCommands` boundary. Active pauses are persisted while a gate is pending and `status` joins that local run state with read-only Orca gate inspection; verified with `npm --workspace @orca/workflow-studio run typecheck`, `npm --workspace @orca/workflow-studio test` (30 tests), and `npm --workspace @orca/workflow-studio run build`.
