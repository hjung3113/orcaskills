# Agent Instructions

## Working rules

### Read in this order

Before changing a feature, read `AGENTS.md`, the root `CONTEXT.md`, applicable `docs/adr/` records, then that feature's `.scratch/<feature>/spec.md`. Read its `prd.md` and `design.md` when present, followed by the assigned issue. Only then inspect the smallest relevant code and tests.

### Keep work economical and consistent

- Use targeted searches and bounded reads; reuse cited findings instead of re-reading or pasting large files.
- Treat one issue as one work unit: keep its scope, non-goals, acceptance evidence, exact `Status:`, and `## Comments` current. Each numeric ticket prefix identifies exactly one canonical ticket; keep planning notes outside `issues/`.
- State the files changed and focused verification result in the issue comment or handoff. Escalate a conflict with `CONTEXT.md`, an ADR, or the feature design instead of silently redefining it.

### Preserve UI consistency

For renderer work, read `docs/agents/ui.md`, `apps/workflow-studio/src/renderer/main.tsx`, and `styles.css` before adding a pattern. Reuse the Studio shell, outline/canvas/Inspector composition, existing action and status treatments, accessible labels, and the staged → review → confirm-save boundary. Prototype competing interaction structures before committing to a new cross-cutting UI pattern; record the verdict in the feature design or issue.

## Agent skills

### Issue tracker

Issues and specifications are local Markdown files under `.scratch/`.
See `docs/agents/issue-tracker.md`.

### Domain docs

This is a single-context repository.
See `docs/agents/domain.md`.

### Design docs

Feature designs live at `.scratch/<feature>/design.md` when a change is cross-cutting, multi-ticket, or interaction-shaping. See `docs/agents/design.md`.

### UI consistency

Workflow Studio UI conventions and validation expectations are documented in `docs/agents/ui.md`.
