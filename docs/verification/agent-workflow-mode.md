# Agent Workflow mode verification

Date: 2026-07-15

## Requirement evidence

| Requirement | Evidence |
| --- | --- |
| Fixed visual template and constrained topology | `src/shared/agent-workflow.ts`; `src/shared/validation.test.ts` validates factory, broken CODEX isolation, and the checked-in example. |
| Separate roles and isolated CODEX | Template validation rejects role collapse and non-isolated implementation. |
| Machine-local allowlisted toolkit boundary | `src/config/local.ts` and `src/runner/agent-workflow.ts`; no portable type contains toolkit fields. |
| Current-head VERIFIER PASS gate | `validateVerificationEvidence` plus `agent-workflow.test.ts` cover producer, PASS classifier, verdict, issue, branch, and HEAD. |
| Human-only Release Captain decision | `WorkflowRunner` opens an Orca approval gate only after valid evidence; stale evidence opens recovery. Recording-adapter tests cover both. |
| Pane/worktree/evidence lifecycle | Agent Workflow manifest stores resource lease; tests assert isolated worktree, role terminal handles, archive invocation, and cleanup operations. |
| UI creation and user guidance | `renderer/main.tsx` exposes `✦ Agent Workflow`; `docs/agent-workflow-example.md` documents setup and workflow creation; `examples/agent-workflow` is parsed by test. |

## Commands executed

```text
npm --workspace @orca/workflow-studio run typecheck
npm --workspace @orca/workflow-studio test
npm --workspace @orca/workflow-studio run build
npm --workspace @orca/workflow-studio start
git diff --check
```

All static checks, the 44-test suite, and the production build passed. Electron started and remained running without startup output. The Computer Use provider listed the `Orca Workflow Studio` Electron window but could not expose its accessibility tree in this run because macOS accessibility needed re-enabling; no UI interaction was claimed from that unavailable tree. The existing manual smoke checklist includes the Agent Workflow creation assertion.

## Deliberate boundary

No real toolkit dispatch, worktree cleanup, Git push, merge, or Decision Gate resolution was performed during verification. Those are external lifecycle effects; recording-adapter tests exercise the runner contract without creating external Orca resources. A real run remains a user-authorized operational action after configuring the machine-local toolkit root.
