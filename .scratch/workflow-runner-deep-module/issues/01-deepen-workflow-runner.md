# Deepen WorkflowRunner behind a stable interface

Status: Done

## Slice

Refactor the existing runner in behavior-preserving, test-green steps. Extract cohesive internal lifecycle collaborators only where they reduce navigation and concentrate invariants; keep the public runner interface small. Strengthen behavior-level tests through that interface, especially failure, pause/recovery, manifest/evidence, and cleanup paths.

## Acceptance

- Existing behavior and schemas are unchanged.
- `workflow-runner.ts` no longer coordinates unrelated lifecycle mechanics inline.
- Extracted modules have a clear, domain-named responsibility and remain internal.
- Tests assert observable runner outcomes rather than private helper calls.
- Test, typecheck, build, and diff checks pass.

## Comments

- Selected as the strongest candidate from independent research because it is 309 lines, changed in 5 of the last 30 commits, and mixes topology, preflight, preview, dispatch, recovery, gates, manifests, and cleanup.
- Refactored behind the unchanged `WorkflowRunner` interface into internal `RunReadiness`, `WorkflowTopology`, and `WorkflowExecution` responsibilities.
- Added public-interface coverage for resource cleanup after invalid verification evidence terminates an Agent Workflow run.
- Focused runner tests, full test suite, typecheck, build, and diff checks pass.
- A fresh, read-only evaluator scored the result 99/100; the only deduction was missing persisted per-slice gate evidence.
