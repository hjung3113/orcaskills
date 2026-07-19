# 04 - Readiness and end-to-end verification

Status: Done

Verify the completed Library and additive composition behavior from a clean portable configuration through explicit save, readiness, and a local Electron inspection.

## Acceptance criteria

- Focused config, renderer, runner, and readiness suites cover all prior issue acceptance criteria.
- Full Workflow Studio test suite, typecheck, production build, and `git diff --check` pass.
- Local Electron inspection verifies first-run onboarding remains available, Library edits are staged, review precedes save, prompt-preset application is copy-on-apply, and unavailable candidates are explained.
- The inspection confirms no portable YAML contains machine-local toolkit paths, commands, credentials, or capability snapshots.

## Comments

- Preserve the current untracked `.orca/` manual-test material unless an explicit decision changes its status.
- Local Electron inspection reopened this Git project with no `.orca/workflow-config.yaml`. The Agent Workflow Inspector showed first-run onboarding, only the discovered Codex CLI/provider-default candidate, the separate local toolkitRoot explanation, disabled Review before staging, the new Additional instructions field, and prompt-preset copy control. No save was performed against the preserved manual-test `.orca/` material.
- Earlier Issue 02 Electron evidence remains applicable for the Library's four sections, staged edits/review boundary, and unavailable-profile explanation after the UI refactor.
- Verification: focused composition/config/validation/runner/approval suites (30 tests), full Workflow Studio suite (71 tests), typecheck, production build, and `git diff --check` passed. Storage/config tests keep portable configuration separate from machine-local execution details.
