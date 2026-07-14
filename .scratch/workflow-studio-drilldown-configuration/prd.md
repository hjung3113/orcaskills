# PRD: Workflow Studio drill-down configuration

## Status

Draft for product confirmation. This PRD is derived from the agreed domain model in `CONTEXT.md` and the discovery boundary in `docs/adr/0001-bounded-local-capability-discovery.md`.

## Problem

Workflow Studio currently asks people to type provider, model, profile, and related technical configuration directly. That is error-prone, obscures which options are usable on the current machine, and makes the Conductor's deliberately limited role difficult to understand.

## Product outcome

People can configure an agent workflow node by choosing valid local candidates through a guided flow, understand why a saved configuration is temporarily unavailable, and understand exactly what an optional Conductor may and may not do.

## Users and jobs

### Workflow author

When I configure an agent node, I want to select a role, a usable profile, and its model policy rather than type technical identifiers, so I can make a valid workflow quickly and confidently.

### Project collaborator

When I open a workflow on a different machine, I want its portable configuration retained and any unavailable local capability explained, so I can repair my environment or deliberately select an alternative without losing project intent.

### Workflow reviewer

When I review a pending configuration change, I want to see every affected role, profile, preset, and override before it is saved, so workflow behavior does not change invisibly.

### Conductor user

When I enable Conductor, I want its responsibilities and authority limits stated beside its configuration, so I do not mistake it for an implementation agent or execution controller.

## In scope

- Bounded local discovery of already installed and configured capabilities through reviewed integration adapters.
- Automatic discovery at Studio startup and user-triggered `Refresh capabilities`.
- Guided node configuration in the order Role -> Profile -> inherited Model policy, with an explicit override control.
- Candidate availability states and remediation guidance.
- Explicit registration of discovered candidates as portable profiles or portable presets.
- One-time preset application to a node, staged editing, review-before-save, and validation before persistence.
- A workflow-level, optional, profile-selected Conductor surface with fixed read-only guidance.

## Out of scope

- Remote provider or model catalog calls.
- Credential management, login, provider installation, or provider configuration from Studio.
- Scanning or running arbitrary PATH executables.
- Automatic registration, deletion, substitution, repair, or synchronization of profiles and presets.
- Any change to Conductor authority or Orca lifecycle ownership.

## Functional requirements

1. Studio must query only registered integration adapters. An adapter may run fixed, non-interactive, read-only local probes with a short timeout.
2. Discovery must never consume credentials, initiate login, install or reconfigure software, call a remote API, or invent unavailable model candidates.
3. The Studio must show the current discovery status and allow a user to refresh it explicitly.
4. Agent-node configuration must guide selection through Role, Profile, and Model policy. The node inherits the profile model policy unless the author explicitly enables an override.
5. A profile must persist either an exact discovered model identifier or an explicit provider-default policy. Display names are not execution values.
6. A user may register a selected candidate only through an explicit action. Discovery by itself must never write project configuration.
7. A portable preset must contain only shareable role/profile/model-policy references. Applying it copies values to a node and does not create a live link.
8. If a required local capability is unavailable, Studio must retain the portable configuration, disable the affected selectable choice, and state the reason and remediation. It must not silently delete, replace, or repair it.
9. Configuration edits must remain staged until Apply/Save. Studio must show a change review and persist only when full validation succeeds.
10. Direct input is reserved for human-readable names and descriptions. Technical values come from discovery candidates; generated IDs must be collision-checked before save.
11. Conductor must be optional and configured at workflow level through an existing profile. The UI must state that it only prepares context, refines prompts, summarizes handoffs, and advises escalation; it cannot change code, tasks, dispatches, terminals, or decision gates.

## UX requirements

- Keep the canvas as the primary workspace; expose guided node configuration in the existing Inspector.
- Preserve the current visual density and allow the author to tell inherited values from explicit overrides at a glance.
- Keep unavailable saved choices visible and actionable rather than hiding them.
- Keep all discovery and persistence effects legible through status, diagnostics, and review states.
- Explain Conductor adjacent to its opt-in control, not in a separate help destination.

## Acceptance scenarios

1. Given an available local capability, when an author selects an agent node, then they can choose Role -> Profile -> Model policy without typing a provider, profile ID, or model ID.
2. Given an unavailable saved profile, when a collaborator opens the workflow, then the profile remains visible but disabled with a reason and recovery guidance.
3. Given a discovered candidate, when an author registers it, then the result is staged and no project file changes until Apply/Save succeeds.
4. Given an applied preset, when the preset later changes, then the already configured node remains unchanged.
5. Given a failed or incomplete adapter probe, when an author opens the candidate picker, then Studio reports the unavailable or unknown state and does not fabricate model options.
6. Given an enabled Conductor, when an author views its configuration, then its read-only responsibilities and prohibited lifecycle/code authority are visible.

## Success signals

- The primary agent-node setup path does not require typing a provider, model, or profile identifier.
- All unavailable configurations have a visible diagnostic and remediation action or instruction.
- No portable configuration file contains an executable path, credential reference, or discovery result.
- Validation and Electron visual tests cover the acceptance scenarios.

## Delivery sequence

The delivery plan and independently reviewable tickets are in `spec.md` and `issues/01` through `issues/04`. A UI prototype must be evaluated against this PRD before production implementation begins.
