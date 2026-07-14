# 05 — Approval and failure pauses

Status: completed

**What to build:** A running workflow pauses at human approvals and failures, preserving Orca as the authoritative place to resolve a Decision Gate or choose retry, profile replacement, or termination.

**Blocked by:** 04 — Sequential WorkflowRunner.

- [x] An Approval node creates an Orca Decision Gate and the downstream path does not proceed until its result is available.
- [x] A failure or escalation pauses only the affected path and records the reason in the run manifest.
- [x] Resume choices support explicit retry, agent-profile replacement, and termination; automatic retry and automatic agent switching are absent.
- [x] Agent-facing updates can describe a waiting approval or failure decision but never resolve the authoritative Orca gate.
- [x] Runner integration tests verify gate creation and resolution plus each paused failure outcome with the adapter fake.

## Comments

- 2026-07-15: Added authoritative Orca gate creation/waiting to the runner adapter, pause records in local manifests, and explicit recovery actions only. Verified with `npm --workspace @orca/workflow-studio run typecheck`, `npm --workspace @orca/workflow-studio test` (21 tests), and `npm --workspace @orca/workflow-studio run build`.
