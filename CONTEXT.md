# Workflow Studio

Workflow Studio defines portable workflow configuration and resolves it against capabilities available on the developer's machine. It keeps execution authority with Orca.

## Language

### Configuration availability

**Local capability discovery**:
The bounded discovery of providers and CLI capabilities already installed and configured on the local machine, and of their selectable profile and model candidates. It never performs external catalog calls, consumes credentials, initiates login, or automatically registers arbitrary remote models.
_Avoid_: global discovery, automatic provider setup

**Capability refresh**:
The initial local capability discovery performed when Workflow Studio starts, or an explicitly user-requested re-discovery. It is not a continuous background scan or filesystem watch.
_Avoid_: background polling, continuous discovery

**Unavailable configuration**:
A registered profile or preset whose required local capability is not presently available. Its portable configuration is retained, while the Studio disables it for selection and explains the remediation; it is never silently deleted or replaced.
_Avoid_: stale configuration, auto-repaired configuration

**Integration adapter**:
A reviewed, provider-specific component that safely discovers one supported provider or CLI's local capabilities and selectable candidates. Workflow Studio does not scan or execute arbitrary PATH entries.
_Avoid_: generic executable scan, arbitrary CLI discovery

**Capability probe**:
A fixed, non-interactive, read-only local command that an integration adapter runs with a short timeout to establish availability or enumerate candidates. It never logs in, installs, reconfigures, consumes credentials, or calls a remote API.
_Avoid_: provider setup, interactive discovery

**Explicit registration**:
The user-confirmed creation of a named profile or preset from a discovered candidate. Discovery alone never changes project configuration.
_Avoid_: automatic registration, background configuration writes

### Node configuration

**Node configuration flow**:
The ordered selection of a node's role, then its profile, then the model policy inherited from that profile. A node changes the inherited policy only through an explicit override.
_Avoid_: free-form node configuration, implicit overrides

**Staged configuration change**:
An in-editor change that remains temporary until the user explicitly applies or saves it. Persistence occurs only after complete configuration validation succeeds.
_Avoid_: auto-save configuration, partial configuration write

**Guided configuration input**:
Configuration in which people type only semantic names and descriptions, while provider, model, profile identifier, and execution values are selected from discovered candidates. Technical identifiers are derived safely and checked for collisions before saving.
_Avoid_: free-form technical configuration, raw identifier entry

### Execution identities

**Agent**:
A workflow execution identity composed of a portable role and its selected profile. It is not an automatically created record of an installed executable or CLI capability.
_Avoid_: discovered agent, provider agent

**Portable preset**:
A project-stored, shareable named configuration bundle of role, profile, and model policy references. It excludes executable paths, credentials, and local installation state.
_Avoid_: local preset, credential-bearing preset

**Preset application**:
The one-time copying of a portable preset's selected values into a workflow node. A node never remains implicitly linked to the preset that initialized it.
_Avoid_: live preset binding, implicit preset synchronization

### Workflow guidance

**Run Readiness**:
The explicit, point-in-time result of validating the current workflow draft against its project configuration, machine-local capabilities, and Orca availability. It is `ready`, `blocked`, or `unknown`; it is never inferred from a previously saved workflow or a background poll.
_Avoid_: run status, continuous health check, implicit execution permission

**Readiness blocker**:
A specific failed Run Readiness requirement with a human-readable reason, a configuration scope, and a next action. A blocker explains why a run cannot be previewed or launched; it does not automatically modify portable or local configuration.
_Avoid_: generic error, auto-remediation, hidden preflight failure

**Execution preview**:
A side-effect-free list of Orca operations that the runner would create after a ready preflight. It creates no task, terminal, worktree, manifest, or Decision Gate.
_Avoid_: dry run with side effects, partial execution

**Actionable blocker**:
A Readiness blocker that retains the affected node identifier when one exists and offers one explicit corrective destination in Studio. Machine-wide blockers have no node destination and instead identify their local scope.
_Avoid_: generic error list, inferred node match, automatic repair

**Draft execution request**:
The project path and portable workflow source submitted by the renderer for a preview or run. The service boundary parses it and assembles portable and machine-local configuration itself; the renderer never submits a raw runner request.
_Avoid_: renderer-owned local configuration, raw runner request, credential-bearing IPC payload

**Agent Workflow template**:
A first-class, parameterized Workflow Studio template that renders the fixed ARCHITECT -> CODEX -> REVIEWER -> VERIFIER -> Release Captain flow. It selects the Agent Workflow runner profile; it is not a generic preset or an independently executable runner.
_Avoid_: agent-workflow preset, generic review workflow

**Agent Workflow runner profile**:
A reviewed execution contract selected only by the Agent Workflow template. It uses a machine-local toolkit adapter and keeps Orca authoritative for tasks, terminals, decision gates, and manifests.
_Avoid_: portable shell command, generic runner mode

**Verification evidence**:
The canonical current-head `.review/ISSUE-<N>-VERIFY.json` artifact produced by the VERIFIER. A PASS artifact enables the Release Captain decision but never resolves, merges, pushes, or releases on their behalf.
_Avoid_: test-passed prose, implementer verification

**Release Captain**:
The human who makes the final release decision after valid verification evidence is available. Neither the Conductor nor the runner may merge, push, or resolve that decision automatically.
_Avoid_: automatic release, Conductor approval

**Execution resource lease**:
The runner-owned record of an Agent Workflow run's prepared worktree, visible role panes, and evidence directory. The runner reconciles or explicitly cleans these resources only after a release or abandonment decision.
_Avoid_: agent-owned worktree, untracked pane

**Conductor**:
An optional workflow-level, read-only advisor configured with a profile. It may prepare context, refine prompts, summarize handoffs, and advise escalation, but cannot edit code or control tasks, dispatches, terminals, or decision gates.
_Avoid_: orchestrating agent, execution controller

**Model policy**:
The explicit model-selection rule in a profile: either a discovered model identifier or a declared provider-default policy. Display labels and capabilities aid selection but do not control execution.
_Avoid_: implicit provider default, display-name model selection
