# 08 — End-to-end representative workflows

Status: complete

**What to build:** A developer can verify the complete Studio-to-Orca path using representative safe workflows, demonstrating visual authoring, validation, execution ordering, approvals, handoffs, failure pauses, and isolated parallel writes.

- [x] A design-to-approval-to-implementation-to-review workflow can be authored in Studio, saved in a project, validated, and run with mock or safe agents. (Automated save/validation/mock-run evidence and actual Electron visual authoring pass.)
- [x] The verification proves task ordering, structured output mapping, approval pause and resolution, and failure pause behavior in Orca.
- [x] A separate isolated parallel-write workflow proves Worktree safety behavior end to end.
- [x] The test guide clearly distinguishes repeatable mocked validation from any manual live-Orca verification required by the local environment.

## Comments

- 2026-07-15: Added representative mock end-to-end fixtures/tests plus manual smoke instructions and results under `apps/workflow-studio/tests/e2e/`. Mock coverage and Electron startup pass after the CommonJS entrypoint fix; the initial production renderer blank-page defect was fixed by using relative Vite asset paths. Visual authoring now passes with the local Computer Use provider: canvas, outline, Inspector, valid diagnostic, Agent editing, Git project selection, save, and Workflows-list reload. See `SMOKE-RESULTS.md`.
