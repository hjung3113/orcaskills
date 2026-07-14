# 06 — Branching, parallelism, and Worktree safety

Status: completed

**What to build:** A developer can model conditional and parallel paths with auditable structured handoffs, while validation and the runner prevent unsafe concurrent writes in the same Worktree and support explicitly isolated parallel writes.

**Blocked by:** 04 — Sequential WorkflowRunner.

- [x] Condition nodes select a valid downstream branch using declared structured outputs, and invalid operands or mappings have actionable diagnostics.
- [x] Parallel nodes fan out and join required paths while preserving named outputs and artifact references for downstream inputs.
- [x] Validation rejects agent nodes that may write concurrently in the same Worktree.
- [x] Parallel write branches proceed only when each explicitly uses an isolated Worktree, which the runner prepares before dispatch.
- [x] Integration tests cover structured mappings, condition selection, parallel joins, rejected shared-Worktree writes, and successful isolated writes.

## Comments

- 2026-07-15: Added parallel/condition validation, structured input mappings, branch selection, concurrent-write Worktree safety checks, and isolated Worktree preparation through the Orca adapter. Verified with `npm test` (24 tests), `npm run typecheck`, and `npm run build` in `apps/workflow-studio`.
