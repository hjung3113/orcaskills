# Workflow Studio Configuration Library and additive prompt composition

## Problem

First-run onboarding can create an initial staged role/profile draft, but existing portable configuration has no authored library. In addition, an agent node's `prompt` currently replaces its role intent, making the role contract invisible and fragile. Workflow authors need reusable, portable instructions without implicit live links or unreviewed provider settings.

## Decision

Add a Configuration Library beside the existing Studio authoring surfaces. It stages CRUD changes for portable roles, profiles, and prompt presets, then uses the existing Configuration Review -> Confirm Save boundary as its only persistence path.

Replace new node authoring with **additional instructions**. The runner composes role base instruction followed by the node's additional instructions, while structured upstream handoff remains a separate dispatch input. Applying a prompt preset copies its text into the node's additional-instructions field. It never stores a preset ID on the node and never back-propagates later preset edits.

Treat existing `node.prompt` as a legacy replacement instruction. The Library offers an explicit staged migration that shows the changed behavior before save; it must not silently reinterpret persisted workflows at run time. The first delivery does not add reasoning effort, fast/service-tier, free-form provider settings, remote discovery, or model enumeration beyond each reviewed adapter's declared capabilities.

## Scope

- Library views and staged CRUD for portable roles, profiles, configuration presets, and prompt presets.
- Role/profile reference protection with clear remediation before a staged removal can be confirmed.
- Additive agent prompt composition, legacy-prompt migration, and prompt-preset copy-on-apply.
- Configuration Review diffs that show prompt-preset changes alongside role/profile/preset changes.
- Focused renderer, config, runner, readiness, and Electron verification.

## Out of scope

- Remote model catalogs, authentication, credential use, arbitrary PATH discovery, or background capability scans.
- Free-text model IDs or provider-specific execution settings.
- Live bindings from nodes to configuration or prompt presets.
- Raw upstream-output interpolation into a prompt.
- Changes to Conductor authority, Agent Workflow's four-role/evidence contract, or local toolkit configuration.

## Invariants

- Portable configuration contains no executable paths, credentials, toolkitRoot, commands, or discovery snapshots.
- All configuration mutations stay in memory until a complete validation passes and the user confirms save.
- Provider/model choices remain limited to currently available candidates exposed by reviewed adapters; provider-default remains valid when enumeration is unavailable.
- Unavailable configuration is retained, visible, disabled for new selection, and actionable; it is never silently substituted or deleted.
- The composed prompt order is: role base instruction, node additional instructions. Structured upstream handoff is delivered separately as declared fields and artifact references.
- A prompt preset is copy-on-apply. Preset update or deletion does not change an existing node.

## Acceptance criteria

- Users can list, create, edit, duplicate, and request deletion of roles, profiles, configuration presets, and prompt presets in one staged Library surface.
- The Library prevents confirmable deletion of a role/profile/preset while a staged workflow or configuration still references it, and explains the reference.
- New or edited profile technical values are selected only from reviewed available capabilities; the Codex adapter may expose only provider-default until it can safely enumerate models.
- A new additional-instructions field is visibly additive; runner tests prove the role intent is retained.
- Applying a prompt preset copies instructions to the selected node and leaves no preset reference in portable workflow YAML.
- A legacy node prompt is surfaced as requiring an explicit staged migration decision; no hidden runtime reinterpretation occurs.
- Review lists changed prompt presets and migration effects before Confirm Save.
- Run Readiness continues to validate selected portable profiles against local availability and never gains provider-setting guesses.
