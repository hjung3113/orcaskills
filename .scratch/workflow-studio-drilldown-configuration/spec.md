# Workflow Studio drill-down configuration

## Goal

Replace free-form workflow-node configuration with guided drill-down selection, safely surface locally usable capabilities, and make configuration and Conductor responsibilities understandable at the point of use.

## Agreed model

- Local capability discovery is limited to reviewed integration adapters for already installed and configured providers or CLIs. It runs on Studio startup and on an explicit refresh only.
- Adapters may run only fixed, non-interactive, read-only local probes with short timeouts. They never log in, consume credentials, install or change configuration, call external catalogs, or scan arbitrary executables.
- Discovery produces candidates only. A user explicitly registers a selected candidate as a portable project profile or preset; discovery never writes project configuration.
- An Agent is the execution identity made from a Role and selected Profile. A discovered CLI or provider is a local capability, not an Agent.
- A node is configured Role -> Profile -> inherited Model policy. A node-level policy differs from its profile only through an explicit override.
- A Profile stores either an exact discovered model identifier or an explicit provider-default policy. Labels and advertised capabilities are display metadata, not execution authority.
- A portable preset is a project-stored role/profile/model-policy template with no paths, credentials, or local installation state. Applying it copies values into the node; later preset edits do not mutate existing nodes.
- Missing local capabilities leave registered project configuration intact, but disable it for selection and explain how to recover. Nothing is silently deleted, substituted, or repaired.
- Edits are staged. Apply/Save persists only a fully validated change and shows the affected values first.
- Human-authored input is limited to semantic names and descriptions. Technical provider, model, profile, and execution values are selected from candidates; generated IDs are collision-checked.
- Conductor remains an optional workflow-level, read-only advisor selected through the existing profile mechanism. The UI permanently explains its allowed responsibilities and that it cannot change code, tasks, dispatches, terminals, or decision gates.

## UX flow

1. On startup, the Studio displays the last completed discovery state while performing one bounded refresh. The user may invoke `Refresh capabilities` to run it again.
2. Selecting a workflow node opens guided configuration: Role, compatible Profile, inherited Model policy, and an explicit Override control.
3. Candidate pickers expose availability and remediation. Unavailable registered choices remain visible but disabled with the diagnostic reason.
4. The user may register a selected candidate as a named profile or portable preset; this produces a staged change only.
5. The review surface lists added/changed roles, profiles, presets, and overrides. Apply/Save validates both portable references and the current local capability boundary before persisting.
6. The workflow-level Conductor section offers an opt-in toggle, profile picker, and its fixed read-only responsibility statement.

## Implementation plan

1. Add a typed capability-discovery domain and adapter registry in the main-process configuration layer, with deterministic results, availability states, timeouts, and redacted diagnostics.
2. Extend portable configuration and resolution validation for portable presets, explicit model policies, node overrides, staged-change validation, and unavailable configuration diagnostics. Keep all local discovery data out of portable files.
3. Build the renderer drill-down controls and capability refresh state: node selection flow, preset registration/application, review-before-save, unavailable states, and the Conductor explainer.
4. Add unit, integration, and Electron visual tests covering adapter safety, persistence boundaries, selection/override behavior, unavailable remediation, and Conductor authority messaging.

## Non-goals

- Remote provider or model catalog discovery.
- Credential management, login, provider installation, or provider configuration from Studio.
- Automatic profile/preset registration, deletion, substitution, or synchronization.
- Changing Conductor authority or Orca lifecycle ownership.
