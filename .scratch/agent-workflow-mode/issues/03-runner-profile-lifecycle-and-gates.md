# 03 — Runner profile lifecycle and gates

Status: Completed

## Scope

Integrate Agent Workflow profile execution into the runner, persist resource leases/evidence state, create recovery and release gates, and add recording-adapter tests.

## Done when

- Distinct visible role panes and an isolated prepared worktree are recorded.
- Invalid evidence pauses at recovery; valid evidence opens but never resolves a Release Captain gate.
- Cleanup/reconciliation uses the recorded lease and no automatic merge/push occurs.

## Comments

- Orca remains authoritative for tasks, terminals, gates, and live status.
- Implemented by `WorkflowRunner` and recording-adapter coverage for lease, evidence, release gate, and cleanup.
