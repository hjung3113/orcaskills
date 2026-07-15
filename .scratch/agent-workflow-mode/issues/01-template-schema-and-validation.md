# 01 — Agent Workflow template schema and validation

Status: Completed

## Scope

Add explicit template/profile metadata and a factory for the canonical five-stage DAG. Extend shared validation to enforce the template invariants and add focused tests.

## Done when

- `agent-workflow` template creation emits ARCHITECT, CODEX, REVIEWER, VERIFIER, Release Captain approval, and End topology.
- Template invariants reject role collapse, non-isolated implementation, missing evidence/release boundary, and topology changes.
- Generic workflows remain compatible.

## Comments

- Portable metadata must contain no local path, command, credential, or discovery result.
- Implemented by `src/shared/agent-workflow.ts` and validation coverage.
