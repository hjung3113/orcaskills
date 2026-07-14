# 02 — Canvas-first DAG editor

Status: implementation-complete

**What to build:** A developer can visually compose and maintain a workflow using the canvas as the primary surface, a collapsible step outline for navigation, and a persistent inspector for the selected node.

**Blocked by:** 01 — Minimal workflow validation foundation.

- [x] The editor supports adding, selecting, connecting, and removing Start, Agent, Approval, Condition, Parallel, and End nodes.
- [x] The steps outline navigates to graph nodes and can be collapsed without hiding the editing canvas.
- [x] The inspector edits the selected node's applicable name, prompt, dependencies, inputs, outputs, and worktree fields.
- [x] Invalid graph edits surface diagnostics without allowing an invalid saved workflow to be mistaken for valid.
- [ ] Automated UI tests cover opening a workflow, composing a supported graph, editing the inspector, and saving a valid result.

## Comments

- 2026-07-15: Implemented the React Flow canvas editor, outline, inspector, validation-gated save, and build/typecheck verification. Existing Vitest coverage remains limited to shared validation/project modules; this package has no DOM/UI-test harness, so the ticket's automated UI-test item remains for a follow-up.
