# 02 - Staged Configuration Library UI

Status: Done

Add a Library entry point and authoring surface for roles, profiles, configuration presets, and prompt presets. Reuse the existing staged state and Configuration Review -> Confirm Save write boundary.

## Acceptance criteria

- The surface lists existing entries, availability state, and inbound references.
- Create, edit, duplicate, and delete requests change only staged state until confirmation.
- Role/profile technical selections use reviewed capability candidates only; unavailable configuration remains shown and cannot be selected for a new/edited binding.
- A profile can retain explicit provider-default when its adapter exposes no safe model candidates.
- Delete explains and blocks inbound references instead of cascading or silently repairing them.
- Renderer behavior tests cover staged mutations, review-before-save, unavailable state, and no-write-before-confirm.

## Comments

- Keep the first-run Inspector flow intact; it is the corrective route for an empty configuration, while the Library serves ongoing authoring.
- 2026-07-19: Prototype review selected Variant A, **Master-detail library**. The production slice uses Outline entry -> central category/list table -> Inspector editor, with the shared staged review action retained.
- 2026-07-19: Implemented the selected layout using the existing staged portable configuration state and save boundary. Focused config/onboarding tests, typecheck, production build, and diff check are green; remaining Issue 02 work is a dedicated renderer behavior test and local Electron confirmation, before Issue 04's broader end-to-end gate.
- 2026-07-19: Electron inspection confirmed the Library entry point, all four sections, empty-state Inspector, and the disabled review action before a staged change. Existing profiles whose candidate is no longer locally available no longer silently switch to the first available candidate. Focused configuration tests, typecheck, production build, and diff check are green. Broader save/readiness and write-boundary coverage remains Issue 04.
- 2026-07-19: Refactored the Library into panel, editor, and review components. The outline entry now reuses the existing new-workflow treatment; shared secondary actions use one base quiet-action treatment. Focused tests, typecheck, production build, and diff check remain green.
