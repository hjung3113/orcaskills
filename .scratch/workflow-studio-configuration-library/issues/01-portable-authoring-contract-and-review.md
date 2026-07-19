# 01 - Portable authoring contract and review

Status: Planned

Define the portable prompt-preset and node additional-instructions contracts, extend validation and the staged configuration review, and make dependency-safe Library mutations available as pure operations.

## Acceptance criteria

- `PortableConfiguration` represents prompt presets without paths, credentials, commands, or discovery data.
- A node represents additional instructions separately from legacy `prompt`; a preset application copies text rather than storing a preset reference.
- Validation detects duplicate prompt-preset IDs and missing/staged references with precise diagnostics.
- Configuration Review identifies changed prompt presets and reports blocked removals with the dependent role, profile, preset, Conductor, or workflow node.
- Pure tests cover add/edit/duplicate/delete planning, copy-on-apply, review diffs, and legacy migration planning.

## Comments

- Do not add provider-specific settings in this issue. Adapter-declared capability evolution is a separate follow-up after this feature.
