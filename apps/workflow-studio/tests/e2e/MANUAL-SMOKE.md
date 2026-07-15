# Workflow Studio manual Electron smoke test

## Repeatable mock coverage

Run `npm test -- --run tests/e2e/representative-workflows.test.ts` from `apps/workflow-studio`. The test uses `RecordingOrcaCliAdapter`; it never creates real terminals, worktrees, tasks, or gates.

It verifies saving/reading/validating the design-to-approval workflow, mock approval and failure-retry pauses, structured mappings, local manifests, and the isolated parallel-write setup.

## Manual Electron coverage

1. Run `npm run build && npm start` from `apps/workflow-studio`.
2. In the Studio window, confirm the canvas, outline, inspector, and valid diagnostic are visible.
3. Click **+ Agent**, select the new node, set a name and prompt, and confirm the inspector changes it.
4. Open a Git project, save a valid workflow, and reopen it from the Workflows list.
5. Click **✦ Agent Workflow** and confirm the canvas contains ARCHITECT, CODEX implementation, REVIEWER, VERIFIER, and Release Captain decision in that order. Select CODEX and confirm its Worktree value remains `isolated`; confirm the Agent Workflow boundary text states that release is human-only.

The Electron smoke confirms authoring surface behavior only. Live Orca task dispatch, Decision Gates, and real Worktree creation require a running Orca runtime and deliberately remain a separately authorized manual integration step; use the mock suite for repeatable evidence.
