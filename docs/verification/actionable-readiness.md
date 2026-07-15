# Actionable Readiness verification

## Independent evaluation

An independent read-only evaluator assessed the implementation against the scorecard in [the PRD](../../.scratch/actionable-readiness/prd.md).

| Dimension | Score | Evidence |
| --- | ---: | --- |
| Execution boundary | 25 / 25 | Renderer-facing preview/run contracts accept only `(projectPath, source)`; service-owned `draftRequest` reads portable and local configuration. |
| Blocker traceability | 25 / 25 | Tests cover role, profile, worktree, static, and machine-wide blocker destinations; a node ID is retained only if it exists in the current workflow. |
| Canvas feedback | 15 / 15 | Tests cover Blocked/Ready badge classification and draft/project/config-revision invalidation. |
| Preview safety | 15 / 15 | Valid runner preview test asserts the recording Orca adapter receives no operations; blocked UI cannot open Preview execution. |
| Accessibility and interaction | 5 / 10 | Text-backed badge labels, native disabled controls, and `Go to node` actions are implemented. No DOM-level click/focus assertion exists. |
| Regression and documentation | 10 / 10 | Typecheck, full test suite, production build, diff check, and correction-flow documentation pass. |
| **Total** | **95 / 100** | **Pass: required threshold is 90; mandatory boundary and preview floors pass.** |

## Scenario evidence

1. Missing Agent role: the retained node identifier produces a linked blocker and Blocked badge.
2. Missing profile: profile-resolution diagnostics retain the existing node identifier.
3. Worktree conflict: a `worktree-safety` diagnostic focuses its reported node; a diagnostic without one never invents a link.
4. Orca runtime unavailable: the blocker is machine-scoped, has remediation, and is non-navigable.
5. Draft, project, and saved configuration changes invalidate readiness and remove derived badges.

## Remaining polish

The only recorded deduction is a missing DOM/component test that clicks **Go to node** and observes the selected Inspector plus canvas focus. It is a non-blocking follow-up; no unsupported visual verification is claimed. An Electron accessibility-tree inspection was attempted during this verification but macOS denied access to Electron's accessibility window.
