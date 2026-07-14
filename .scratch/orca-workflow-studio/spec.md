# Orca Workflow Studio

Status: ready-for-agent

## Problem Statement

Developers using Orca can coordinate multiple CLI agents through tasks, dispatches, messages, worker completion events, and decision gates. Today, defining that process requires knowing the Orca orchestration commands and keeping the intended sequence in prose or memory. It is difficult to see a complete multi-agent workflow, reuse it across projects, vary which agent and model performs a role, or safely preserve the same process in Git.

The developer needs a visual, n8n-style way to design reusable multi-agent development workflows while continuing to perform actual work in the Orca application. The design tool must not replace Orca's agent terminals or runtime state. It must generate a portable project configuration that an Orca Agent Skill can run.

## Solution

Provide Workflow Studio: a standalone Electron desktop application that opens a Git project and visually edits a workflow DAG. It stores version-controlled workflow definitions, roles, and shared policies in the project. It also installs or updates a project-local Agent Skill that lets Codex and Claude invoke a workflow from inside Orca.

Workflow Studio is an editor, validator, and execution preview surface. Orca remains the source of truth for live execution. A project-local WorkflowRunner translates a validated workflow into Orca tasks, dispatches, terminals, and decision gates. A workflow may optionally enable a read-only Conductor that prepares context and handoffs without editing code or owning runtime lifecycle state.

The editing layout is canvas-first, with a collapsible step outline and a persistent node inspector. This combines the most useful pieces of the three tested UI directions.

## User Stories

1. As a developer, I want to open an existing Git project in Workflow Studio, so that workflow definitions live beside the code they automate.
2. As a developer, I want to create a named workflow from a blank canvas, so that I can model a new multi-agent process without manually writing orchestration commands.
3. As a developer, I want to see my workflow as a directed graph, so that task ordering and branching are immediately visible.
4. As a developer, I want to drag supported node types onto the canvas, so that the workflow is assembled visually.
5. As a developer, I want to connect node outputs to downstream nodes, so that dependencies are explicit.
6. As a developer, I want the canvas to be the primary editing surface, so that it retains the directness of n8n-style workflow tools.
7. As a developer, I want a collapsible linear step outline, so that I can quickly navigate long workflows and inspect their order.
8. As a developer, I want a persistent inspector for the selected node, so that roles, prompts, dependencies, inputs, and worktree policy are edited without leaving the graph.
9. As a developer, I want each workflow to start from a manual trigger, so that the first release runs only when I explicitly request it.
10. As a developer, I want to add agent nodes, so that an assigned role can perform a bounded task.
11. As a developer, I want to add approval nodes, so that a human can explicitly approve consequential transitions.
12. As a developer, I want to add condition nodes, so that structured upstream results can select the next branch.
13. As a developer, I want to add parallel nodes, so that independent read-only work can proceed concurrently.
14. As a developer, I want to add end nodes, so that success and failure paths are unambiguous.
15. As a developer, I want each agent node to reference a role or intent, so that workflows describe responsibility rather than a hard-coded CLI command.
16. As a developer, I want roles to resolve through agent profiles, so that a workflow can use an architect, implementer, or reviewer consistently.
17. As a developer, I want profiles to select provider and model policy, so that I can change an agent or model without rebuilding the DAG.
18. As a developer, I want a workflow to override an agent profile when needed, so that one workflow can deliberately use a stronger planner or stricter reviewer.
19. As a developer, I want machine-specific executable paths and credentials to remain local, so that shared workflow files do not leak or assume personal environment details.
20. As a developer, I want write access to be explicit for agent nodes, so that the workflow can prevent unsafe concurrent edits.
21. As a developer, I want same-Worktree write branches to be rejected when they can run concurrently, so that agents do not overwrite each other.
22. As a developer, I want independent write work to select an isolated Worktree, so that parallel work has a safe checkout boundary.
23. As a developer, I want agents to pass structured summaries and artifact references downstream, so that later work has concise, reproducible context.
24. As a developer, I want raw agent output to remain opt-in, so that prompts do not grow uncontrollably.
25. As a developer, I want input-to-output mappings to be visible on connections and in the inspector, so that handoffs can be audited.
26. As a developer, I want to optionally enable a Conductor for a workflow, so that complex multi-stage work gets coherent context and handoff summaries.
27. As a developer, I want the Conductor to be read-only, so that it cannot compete with implementation agents for code ownership.
28. As a developer, I want the Conductor to improve prompts, summarize handoffs, and advise on escalation, so that agents receive focused context at each stage.
29. As a developer, I want to save workflow definitions in Git, so that team members can review, share, and restore workflow changes.
30. As a developer, I want Workflow Studio to report YAML, graph, profile, and safety errors before execution, so that invalid workflows do not reach Orca.
31. As a developer, I want diagnostics to identify the relevant configuration location, so that I can fix invalid workflow definitions quickly.
32. As a developer, I want to preview the Orca actions a workflow will produce, so that I can understand its execution before launching agents.
33. As a developer, I want to invoke a workflow from a Codex terminal in Orca, so that I stay in my normal working environment.
34. As a developer, I want to invoke the same workflow from a Claude terminal in Orca, so that the launcher does not force a particular initiating model.
35. As a developer, I want a command to list available workflows, so that I can discover project-local automation.
36. As a developer, I want a command to validate a named workflow, so that I can check it from Orca before running it.
37. As a developer, I want a command to run a named workflow, so that the runner can create tracked Orca lifecycle state.
38. As a developer, I want a command to inspect workflow run status, so that I can find the Orca execution associated with a workflow.
39. As a developer, I want approval nodes to create Orca Decision Gates, so that approval history and control remain in Orca.
40. As a developer, I want a workflow to pause on agent failure or escalation, so that a risky path never silently proceeds.
41. As a developer, I want to choose retry, agent-profile replacement, or termination after a failure, so that recovery remains under human control.
42. As a developer, I want run-specific manifests and Conductor artifacts to remain local, so that transient runtime state does not pollute Git history.
43. As a developer, I want the initial product to avoid schedules and external triggers, so that manual Orca execution is reliable before automation expands.

## Implementation Decisions

- The product is a standalone Electron application using React and TypeScript. It does not modify Orca application code or runtime internals.
- The workflow editor directly opens a project folder. Workflow configuration is project-local and Git-trackable; there is no export/import step between the editor and the project.
- The primary workflow configuration uses YAML. It has a stable graph representation that supports round-tripping between visual edits and source diagnostics.
- The supported first-release node types are Start, Agent, Approval, Condition, Parallel, and End. Loops, foreach, schedules, webhooks, and external triggers are deferred.
- The configuration model has three explicit resolution layers: workflow DAG, role or intent, and agent profile/provider/model policy. Workflow-level profile overrides are supported.
- Shared role and model policy are portable project configuration. Local executable commands, credentials, and machine setup are not shared configuration.
- Agent nodes specify read-only or write access and select current or isolated Worktree execution. Validation rejects potentially concurrent same-Worktree writes.
- Connections carry named structured result fields and artifact references. Automatic forwarding of full raw agent output is not the default.
- A workflow-level Conductor is optional. Its responsibilities are context preparation, prompt refinement, handoff summaries, and escalation advice. It does not edit code and does not create or complete Orca lifecycle events.
- The WorkflowRunner is the single high-level execution boundary. It receives a validated workflow plus resolved local profiles and translates it into Orca CLI/runtime operations.
- The WorkflowRunner is the authoritative mapping layer between graph node identifiers and Orca task, dispatch, gate, terminal, and run-manifest identifiers.
- The WorkflowRunner performs runtime preflight, resolves profiles, creates required worktree/terminal surfaces, creates tasks, dispatches agent work with injected lifecycle context, creates decision gates, and supervises only the active workflow run.
- The project-local Agent Skill exposes list, validate, run, and status operations to both Codex and Claude. The invoking terminal is not necessarily the model that performs a workflow node.
- Orca Decision Gates are the authoritative approval record. Agent messages may describe a waiting gate but do not replace or resolve it.
- Failure and escalation pause the affected path. Automatic retries and automatic agent switching are not part of the first release.
- Workflow Studio does not show live execution state in its first release. Live status, approval, retry, and agent work happen in Orca. A read-only runtime monitor may be added later.
- The editor layout is canvas-first with a collapsible step outline and persistent inspector. The stage-oriented prototype is reserved for possible read-only preview work rather than editing.
- ForgeRoom is a reference for separating workflow, role/intent, profile/provider, validation, and Conductor concerns. The implementation targets Orca orchestration rather than ForgeRoom's OpenClaw runtime.

## Testing Decisions

- The primary behavioral seam is WorkflowRunner. Tests must exercise validated workflow input through the runner and observe emitted Orca operations, run manifests, pause behavior, and terminal/worktree policy decisions.
- The runner uses an Orca CLI adapter interface. Integration tests use a controlled adapter fake that records task creation, dispatches, decision gates, waits, and lifecycle events without starting real agents.
- Schema and graph tests cover parsing, YAML round trips, invalid node references, cycles, unreachable terminal nodes, invalid profiles, incompatible input/output mappings, and write-concurrency conflicts.
- Editor tests cover externally visible behavior: opening a workflow, adding supported nodes, connecting nodes, updating inspector values, surfacing diagnostics, and saving a valid configuration. They do not assert internal component structure.
- Role/profile resolution tests cover workflow overrides, portable configuration, and rejection of unavailable local provider profiles.
- Conductor tests verify that generated context snapshots and handoff summaries are supplied to the runner's prompt inputs while Conductor never receives write ownership or lifecycle authority.
- Runner integration tests verify sequential agent dispatch, isolated parallel write branches, decision-gate creation and resolution, paused failure paths, retry/profile-change requests, and mapping of structured outputs to downstream inputs.
- End-to-end validation first uses mock or safe agents, then exercises a representative design-to-approval-to-implementation-to-review workflow in an actual Orca project.

## Out of Scope

- Modifying Orca's source code, UI, or runtime internals.
- A live execution dashboard in Workflow Studio.
- Automatic retries, automatic agent switching, and autonomous recovery.
- Loop, foreach, schedule, webhook, and external event trigger nodes.
- Direct sharing of executable paths, credentials, or user-specific CLI configuration through Git.
- Forwarding full raw agent output between nodes by default.
- Using ForgeRoom's OpenClaw execution runtime as a production dependency.
- Productionizing the throwaway UI prototype without a deliberate implementation pass.

## Further Notes

- Workflow Studio is a project configuration authoring tool. Orca is the actual work environment and live orchestration runtime.
- Runtime manifests, logs, and Conductor artifacts are local transient data and should be ignored by Git.
- The feature should be delivered in vertical slices: schema and validation, editor, profile/configuration, runner, Agent Skill, then integrated Orca validation.
- The visual prototype settled the editor composition: central DAG canvas, collapsible linear outline, and a persistent right-side inspector.
