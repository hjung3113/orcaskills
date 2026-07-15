# WorkflowRunner deep-module refactor

Status: Complete (fresh-context evaluation: 99/100)

## Goal

Deepen the WorkflowRunner module so callers use one stable execution interface while topology, readiness, dispatch, pause, recovery, manifest, evidence, and cleanup complexity remain internal. Preserve all observable behavior and every authority boundary in `CONTEXT.md` and ADR 0002.

## Workflow

This refactor follows Matt Pocock's architecture workflow: establish domain and ADR constraints, rank candidates from recurring-change evidence, choose one deepening opportunity, implement in small green slices, and evaluate from a fresh context.

## Invariants

- Orca remains authoritative for tasks, terminals, worktrees, Decision Gates, and manifests.
- Agent Workflow verification evidence remains the only current-head readiness signal.
- Release remains a human decision.
- Portable workflow data never gains local toolkit paths or commands.
- Public behavior and schemas do not change.

## Exit criteria

- All existing tests, typecheck, and build pass.
- Behavior tests exercise the stable runner interface and survive internal extraction.
- No new circular dependency or transport-to-runner leakage is introduced.
- A fresh, read-only evaluator scores the result at least 99/100 using `rubric.md`.
