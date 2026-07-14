# Orca Workflow Studio Implementation Plan

## Goal

Build a standalone Electron desktop application that lets a developer visually compose reusable, n8n-style multi-agent workflow DAGs for use inside the Orca app.

The desktop application is an editor and validator. It writes project-local workflow files. Actual agent work, task dispatch, approval gates, retries, and terminal activity remain inside Orca.

## Product Boundary

### Workflow Studio

- Opens a project folder directly.
- Creates and edits Git-tracked workflow definitions under `.orca/`.
- Uses a graph canvas to create nodes and connections.
- Validates the workflow and previews the Orca operations it will produce.
- Does not own a live execution dashboard in the first release.

### Orca Integration

- A project-local runner reads a workflow definition and invokes the `orca orchestration` CLI.
- A project-local `/workflow` Agent Skill lets both Codex and Claude start and inspect workflows while working in Orca.
- Orca remains the source of truth for live tasks, dispatches, worker status, messages, decision gates, and completion.

## Primary User Flow

1. Open a Git project in Workflow Studio.
2. Create a DAG with role-aware agent nodes, approval nodes, branching, and parallel work.
3. Save it as `.orca/workflows/<workflow-id>.yaml`.
4. Commit the generated workflow configuration with the project.
5. Open the same project in Orca.
6. Ask a Codex or Claude terminal to run `/workflow run <workflow-id>`.
7. The project-local skill invokes the runner.
8. The runner validates the workflow, then creates Orca tasks, dispatches agents, and creates decision gates.
9. The user works in Orca, resolving gates and failure decisions there.

## Configuration Model

Use the ForgeRoom-inspired three-layer model:

```text
Workflow DAG -> role or intent -> agent profile -> provider/runtime/model
```

The workflow can select or override profiles for that workflow. Machine-specific executable paths, credentials, and CLI bootstrap details remain local and untracked.

```text
.orca/
  workflows/
    feature-delivery.yaml
  roles.yaml
  agent-profiles.yaml
  workflow-runner/
    run.mjs
.agents/
  skills/
    orca-workflow/
      SKILL.md
```

### Example Workflow

```yaml
id: feature-delivery
name: Feature delivery

conductor:
  enabled: true
  profile: workflow-conductor
  responsibilities:
    - prepare-context
    - refine-prompts
    - summarize-handoffs
    - advise-on-escalation

profiles:
  design:
    role: architect
    provider: claude
    modelPolicy: opus
    access: read-only
  implementation:
    role: implementer
    provider: codex
    modelPolicy: coding-high
    access: write

nodes:
  - id: start
    type: start
  - id: design
    type: agent
    uses: design
    dependsOn: [start]
  - id: approve-design
    type: approval
    dependsOn: [design]
    question: Approve the design?
  - id: implement
    type: agent
    uses: implementation
    dependsOn: [approve-design]
  - id: end
    type: end
    dependsOn: [implement]
```

## Node Contract

The initial palette contains only these node types:

- `start`: creates a runnable workflow entry point.
- `agent`: executes a role/profile with an explicit prompt and access policy.
- `approval`: creates an Orca Decision Gate.
- `condition`: branches using a structured upstream result.
- `parallel`: fans out independent branches and joins only when all required branches finish.
- `end`: terminates successfully or unsuccessfully.

The validator must reject concurrent `access: write` agent nodes that target the same Worktree. Independent write branches require explicit isolated Worktrees.

Agent results are structured values plus artifact paths. Connections map a named output to a named downstream input. Full raw output is never forwarded by default.

```text
design.summary -> implementation.design
review.findings -> refine.review
```

## Conductor

Conductor is a workflow-level optional read-only role, not an editable worker node.

- Produces a run context snapshot before dispatch.
- Builds concise handoff summaries between nodes.
- Refines prompt context using upstream structured outputs.
- Advises on escalation and condition interpretation.
- Does not edit code or become lifecycle authority.

The runner remains the deterministic owner of Orca task, dispatch, gate, and completion state. Per-run conductor artifacts belong under `.orca/runs/<run-id>/` and must be Git-ignored.

## Runner and Agent Skill

The runner is the bridge from declarative YAML to Orca's runtime API. It must:

1. Load and validate project-local configuration.
2. Confirm `orca status --json` has a running runtime.
3. Resolve role/profile/provider settings.
4. Create necessary current-Worktree or isolated-Worktree terminals.
5. Translate agent nodes into `task-create` plus `dispatch --inject`.
6. Translate approval nodes into `gate-create`.
7. Wait on `worker_done`, `escalation`, and gate events only while supervising a workflow run.
8. Preserve an execution manifest that maps YAML node IDs to Orca task and dispatch IDs.

The project-local Agent Skill exposes:

```text
/workflow list
/workflow validate <workflow-id>
/workflow run <workflow-id>
/workflow status [run-id]
```

Both Codex and Claude use the same commands. The runtime-selected agents are defined by the workflow, not by the terminal used to invoke `/workflow`.

## Failure and Approval Policy

- Approval nodes use Orca Decision Gates as the authoritative approval record.
- Agent chat may report an approval wait but does not substitute for the gate.
- On `escalation` or failure, the affected path pauses.
- The user chooses retry, switch agent profile, or terminate from Orca.
- Automatic retry, loops, foreach, schedules, webhooks, and external triggers are excluded from the initial release.

## Architecture

### Desktop Application

- Electron main process: filesystem access, workflow validation IPC, and local profile access.
- React renderer: project picker, graph editor, node inspector, YAML/source diagnostics, and execution preview.
- React Flow or equivalent: canvas, typed ports, drag/drop, pan/zoom, selection, and graph validation feedback.
- Shared TypeScript package: workflow schema, graph-to-YAML compiler, YAML-to-graph parser, and validation rules.

### Chosen Editor Layout

The primary editing view combines the validated prototype directions:

- **Canvas first:** the central canvas is the default surface for composing and connecting a DAG.
- **Collapsible steps panel:** a left-side workflow outline provides fast navigation and a linear reading order for long graphs.
- **Persistent inspector:** the right-side panel edits the selected node's role, profile, prompt, dependencies, inputs, and worktree policy.

The stage-oriented prototype is retained only as a possible read-only workflow preview, not as the editing surface.

### Validation Layers

1. YAML syntax and schema validation with file/line diagnostics.
2. DAG validation: unique IDs, no cycles, valid endpoints, reachable end node.
3. Semantic validation: profile resolution, output/input compatibility, Worktree write conflicts, valid condition operands.
4. Orca preflight: CLI available, runtime running, required providers present.

## Delivery Slices

### Slice 1: Workspace and schema

- Scaffold Electron, React, and TypeScript.
- Define shared workflow, role, profile, and run-manifest schemas.
- Add YAML parser/emitter that preserves readable output.
- Add schema and DAG validation tests.

### Slice 2: Visual workflow editor

- Project-folder open flow.
- Workflow list backed by `.orca/workflows/`.
- Canvas with the six initial node types.
- Inspector for node, profile, prompts, dependencies, and output mappings.
- Save/open round-trip tests for graph and YAML.

### Slice 3: Profiles, roles, and Conductor configuration

- Role/profile editor and project-local shared configuration.
- Local-only machine profile configuration.
- Workflow-level profile overrides.
- Optional conductor panel and run-context configuration.

### Slice 4: Orca runner

- Implement preflight, manifest creation, task creation, dispatch injection, and gate creation.
- Implement current Worktree and isolated Worktree selection.
- Implement event waiting and paused failure state.
- Add a mocked Orca CLI integration suite.

### Slice 5: Agent Skill integration

- Generate/install the project-local `orca-workflow` skill.
- Implement `list`, `validate`, `run`, and `status` command paths.
- Verify the commands from both Codex and Claude terminals in Orca.

### Slice 6: End-to-end validation

- Build a sample design -> approval -> implementation -> review workflow.
- Run it in Orca with mock/safe agents first.
- Verify task dependency order, gate pause/resolution, output mappings, and failure pause behavior.
- Run an isolated parallel write-branch workflow and verify Worktree safety validation.

## Explicit Non-Goals for Initial Release

- A live execution dashboard in Workflow Studio.
- Workflow loops, foreach, schedules, webhooks, and external event triggers.
- Automatic retries or automatic agent switching.
- Automatic forwarding of raw agent output.
- Direct modification of Orca application source code or runtime internals.
- Reusing ForgeRoom's OpenClaw runtime implementation as a dependency.

## Reference Used

ForgeRoom is a design reference for its YAML DSL, registry separation, workflow validation, role/profile/provider resolution, review-loop modeling, and conductor boundary. This project uses Orca as its execution runtime instead of ForgeRoom's OpenClaw-based runtime.
