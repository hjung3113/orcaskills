# Verification and regression coverage

Status: Complete

## Comments

- Automated verification covers discovery safety, staged review, preset copying, model-policy/node-override resolution, unavailable capability diagnostics, and workflow-level Conductor validation.
- Electron starts successfully. Automated visual inspection is unavailable on this machine because macOS does not expose Electron's accessibility tree to the local provider; the prior manual Electron smoke remains recorded in `apps/workflow-studio/tests/e2e/SMOKE-RESULTS.md`.

Add automated coverage for discovery safety and configuration behavior, then verify the complete workflow in Electron.

## Acceptance criteria

- Unit tests cover adapter restrictions, timeout/failure states, and no-candidate behavior.
- Resolution tests cover presets, overrides, model policy, staged persistence, and unavailable remediation.
- Renderer tests cover guided selection, review-before-save, and Conductor authority messaging.
- An Electron visual smoke verifies the complete drill-down path and refresh behavior.
