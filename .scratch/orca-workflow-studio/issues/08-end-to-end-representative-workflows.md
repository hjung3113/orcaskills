# 08 — End-to-end representative workflows

Status: blocked

**What to build:** A developer can verify the complete Studio-to-Orca path using representative safe workflows, demonstrating visual authoring, validation, execution ordering, approvals, handoffs, failure pauses, and isolated parallel writes.

**Blocked by:** 02 — Canvas-first DAG editor; 07 — Project-local Orca workflow skill.

- [ ] A design-to-approval-to-implementation-to-review workflow can be authored in Studio, saved in a project, validated, and run with mock or safe agents. (Automated save/validation/mock-run evidence and actual Electron application startup pass; visual Studio interaction remains blocked by the desktop accessibility provider.)
- [x] The verification proves task ordering, structured output mapping, approval pause and resolution, and failure pause behavior in Orca.
- [x] A separate isolated parallel-write workflow proves Worktree safety behavior end to end.
- [x] The test guide clearly distinguishes repeatable mocked validation from any manual live-Orca verification required by the local environment.

## Comments

- 2026-07-15: Added representative mock end-to-end fixtures/tests plus manual smoke instructions and results under `apps/workflow-studio/tests/e2e/`. Mock coverage and Electron startup pass after the CommonJS entrypoint fix, but visual Studio interaction is blocked because the local desktop accessibility provider denies Electron inspection despite reporting permission granted; see `SMOKE-RESULTS.md`.
