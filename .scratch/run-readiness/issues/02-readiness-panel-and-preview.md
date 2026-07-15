# 02 — Readiness panel and side-effect-free execution preview

Status: complete

## What to build

Add the explicit Run Readiness panel to the editor, render actionable blockers, invalidate stale checks, and show planned operations only after a ready result.

## Acceptance criteria

- [x] `Unknown`, `Blocked`, and `Ready` are visually and textually distinguishable.
- [x] Each blocker shows reason, scope, and next action.
- [x] Editing source, changing project, or changing portable configuration clears the result.
- [x] Preview is disabled unless readiness is ready and presents planned operations without running them.
- [x] Helper tests cover state classification and invalidation.

## Comments

- Depends on `01-readiness-contract-and-service.md`.
- 2026-07-16: Added the Inspector readiness panel, explicit check action, stale-result guard, scoped blocker mapping, and side-effect-free operation preview.
