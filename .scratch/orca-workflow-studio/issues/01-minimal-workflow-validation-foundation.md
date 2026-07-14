# 01 — Minimal workflow validation foundation

Status: completed

**What to build:** A developer can open a standalone Workflow Studio project, create or load a minimal Start-to-End workflow, receive actionable YAML and graph diagnostics, and save a valid project-local workflow definition that round-trips without losing its meaning.

**Blocked by:** None — can start immediately.

- [x] The desktop application can open a Git project and discover workflow definitions stored with that project.
- [x] A minimal Start-to-End workflow can be parsed, validated, displayed as valid, saved, and loaded again with equivalent graph semantics.
- [x] Validation reports YAML syntax, unsupported node shape, invalid references, cycles, and unreachable terminal paths with a configuration location.
- [x] Automated tests cover valid round trips and the supported validation failures.

## Comments

- 2026-07-15: Implemented the Electron/React/TypeScript foundation, project-local workflow storage, YAML parsing and graph validation, and automated validation/project-storage coverage.
