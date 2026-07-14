# Capability discovery and adapters

Status: Planned

Create the typed local capability discovery result model and reviewed adapter registry. Implement bounded read-only probes, startup/manual refresh orchestration, deterministic availability states, short timeouts, and diagnostics that never expose credentials or local secrets.

## Acceptance criteria

- Only registered adapters can be probed.
- Probe execution is non-interactive, time-bounded, and read-only.
- Discovery never calls remote catalogs or mutates provider configuration.
- A failed or incomplete probe returns an explainable state without invented models.
