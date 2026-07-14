# 03 — Role, profile, and Conductor configuration

Status: completed

**What to build:** A developer can configure portable roles and agent profiles, select workflow-level profile overrides, retain machine-specific execution details locally, and optionally enable a read-only Conductor for context and handoffs.

**Blocked by:** 01 — Minimal workflow validation foundation.

- [x] Agent nodes resolve a role or intent through a portable agent profile and provider/model policy.
- [x] A workflow can override a selected profile while validation identifies unavailable local providers or profiles.
- [x] Credentials, executable paths, and comparable machine-specific settings are stored outside Git-tracked shared configuration.
- [x] Conductor configuration can be enabled per workflow and is limited to context preparation, prompt refinement, handoff summaries, and escalation advice.
- [x] Automated tests cover resolution, overrides, missing local profiles, and the Conductor read-only boundary.

## Comments

- 2026-07-15: Added portable role/profile policy, external app-data local execution configuration, workflow profile resolution and diagnostics, and a hard read-only Conductor capability boundary. Verified with `npm test` (14 tests) and `npm run typecheck` in `apps/workflow-studio`.
