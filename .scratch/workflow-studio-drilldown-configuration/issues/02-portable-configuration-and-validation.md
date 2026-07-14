# Portable configuration and validation

Status: In progress

Model portable presets, explicit model policies, staged changes, and unavailable configuration diagnostics. Preserve the separation between project configuration and machine-only discovery/provider state.

## Acceptance criteria

- Profiles persist exact model identifiers or explicit provider-default policies only.
- Applying a preset copies node values and creates no live binding.
- Validation blocks persistence for invalid staged changes without writing partial configuration.
- Missing local capabilities preserve portable configuration and report remediation.
