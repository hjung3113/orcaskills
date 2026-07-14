# Verification and regression coverage

Status: Planned

Add automated coverage for discovery safety and configuration behavior, then verify the complete workflow in Electron.

## Acceptance criteria

- Unit tests cover adapter restrictions, timeout/failure states, and no-candidate behavior.
- Resolution tests cover presets, overrides, model policy, staged persistence, and unavailable remediation.
- Renderer tests cover guided selection, review-before-save, and Conductor authority messaging.
- An Electron visual smoke verifies the complete drill-down path and refresh behavior.
