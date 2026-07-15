# Orca Workflow Studio

> Design reusable multi-agent development workflows visually, then run them in Orca.

Orca Workflow Studio is an Electron desktop editor for project-local, Git-tracked workflow DAGs. It offers an n8n-style canvas for composing agent work, approvals, conditions, parallel branches, and terminal states—without replacing Orca as the place where agents actually run.

## What it does

- Edits `.orca/workflows/*.yaml` inside an existing Git project.
- Provides a canvas-first DAG editor with a collapsible step outline and persistent inspector.
- Supports **Start**, **Agent**, **Approval**, **Condition**, **Parallel**, and **End** nodes.
- Validates YAML, graph structure, role/profile resolution, structured handoffs, and unsafe concurrent Worktree writes before execution.
- Resolves a portable workflow role through an agent profile and provider/model policy, while keeping executables and credentials machine-local.
- Discovers reviewed local CLI capabilities through bounded, non-interactive probes; discovery never logs in, uses credentials, or calls remote catalogs.
- Guides Agent-node configuration through Role → Profile → Model policy, with explicit preset application and review-before-save.
- Previews and runs validated workflows through an Orca adapter, preserving a local run manifest.
- Uses Orca Decision Gates for approvals and pauses failures/escalations for explicit retry, profile replacement, or termination choices.
- Includes a first-class **Agent Workflow** template for ARCHITECT → contained CODEX → independent REVIEWER → independent VERIFIER → Release Captain decision, backed by a reviewed local runner profile and current-head evidence gate.

Workflow Studio is an editor, validator, and preview surface. **Orca remains the source of truth for live task state, dispatches, approval records, and recovery decisions.**

## Architecture

```text
Workflow DAG -> role / intent -> agent profile -> provider / runtime / model
       |                                      |
       +-- Studio edits and validates          +-- local-only machine settings

Validated workflow -> WorkflowRunner -> Orca tasks, dispatches, gates, Worktrees
```

The runner forwards structured outputs and artifact references between nodes. Full raw agent output is deliberately opt-in, so handoffs stay reviewable and bounded.

## Quick start

Prerequisites: Node.js and npm. Running a workflow additionally requires a running Orca environment.

```bash
git clone https://github.com/hjung3113/orcaskills.git
cd orcaskills
npm install
npm run build
npm --workspace @orca/workflow-studio start
```

For renderer development:

```bash
npm run dev
```

### WSL-friendly web development

Avoid WSLg/Electron while iterating on the UI: run the local API and Vite in two WSL terminals, then open `http://localhost:5173` from a Windows browser.

```bash
# terminal 1
npm --workspace @orca/workflow-studio run web:server

# terminal 2
npm --workspace @orca/workflow-studio run dev
```

Enter a WSL absolute Git-project path and choose **Open path**. The browser uses the same client contract as Electron but talks only to a loopback local API; it never receives filesystem or Orca CLI authority directly. See [web-first development](docs/web-first-development.md) for permitted-root configuration and Windows-native Electron verification.

Run checks:

```bash
npm run test
npm run typecheck
npm run build
```

## Workflow configuration

Workflow definitions live beside the code they automate:

```text
your-project/
├── .orca/
│   ├── workflows/
│   │   └── feature-delivery.yaml
│   ├── roles.yaml
│   └── agent-profiles.yaml
└── .agents/
    └── skills/
        └── orca-workflow/
```

An initial workflow can be as small as:

```yaml
id: feature-delivery
name: Feature delivery
nodes:
  - id: start
    type: start
  - id: end
    type: end
    dependsOn: [start]
```

Agent nodes then add an explicit role, prompt, access mode, Worktree policy, and structured inputs/outputs. The full product contract is in [the Workflow Studio specification](.scratch/orca-workflow-studio/spec.md).

### Guided configuration

Open a Git project, select an **Agent** node, then use the Inspector to select its Role and Profile. The Studio refreshes only reviewed local capability adapters at project open or when you choose **Refresh capabilities**. A capability that cannot be used remains explainable; Studio never invents models or changes project configuration in the background.

Profiles and presets remain portable in `.orca/workflow-config.yaml`; executable paths, credentials, and discovery data remain local. Selecting **Review configuration** lists the portable values that would change. **Confirm save** is the only action that writes the configuration. Applying a preset copies its role/profile selection into the current draft—later preset edits do not silently rewrite existing nodes.

Conductor is an optional, read-only workflow advisor: it can prepare context, refine prompts, summarize handoffs, and advise escalation. It cannot edit code or manage Orca tasks, terminals, dispatches, or decision gates. See [the drill-down PRD](.scratch/workflow-studio-drilldown-configuration/prd.md) and [discovery ADR](docs/adr/0001-bounded-local-capability-discovery.md) for the full boundary.

### Agent Workflow mode

Choose **✦ Agent Workflow** from the workflow list to create the fixed visual multi-agent flow. The template requires distinct ARCHITECT, CODEX, REVIEWER, and VERIFIER roles; CODEX uses an isolated worktree and an allowlisted local toolkit dispatch. The runner accepts release readiness only from a current-head `VERIFIER` PASS artifact, then opens an Orca Decision Gate for the human Release Captain. It never auto-resolves the gate, merges, pushes, or releases.

The template is portable; the toolkit root stays in the machine-local configuration. See the complete [Agent Workflow UI and setup example](docs/agent-workflow-example.md), [PRD](.scratch/agent-workflow-mode/prd.md), and [ADR](docs/adr/0002-agent-workflow-template-and-runner-profile.md).

### Run Readiness and execution preview

Choose **Check readiness** before a run to evaluate the exact draft against its workflow diagnostics, role/profile and Conductor configuration, required local toolkit, Orca CLI, and Orca runtime. The Inspector reports **Not checked**, **Blocked**, or **Ready to preview**. Every blocker names its scope, reason, and next action; changing the draft, project, or saved portable configuration invalidates an earlier result.

Only a Ready result enables **Preview execution**. Preview lists the planned Orca operations but creates no task, terminal, worktree, manifest, or Decision Gate. The renderer never receives machine-local paths or credentials; Electron or the loopback local API builds the runner request from server-owned configuration. See [Run Readiness](docs/run-readiness.md) for the complete behavior and boundary.

## Running workflows from Orca

The project-local [`orca-workflow`](.agents/skills/orca-workflow/SKILL.md) skill exposes the same command boundary to Codex and Claude terminals:

```text
/workflow list <project-path>
/workflow validate <project-path> <workflow-id>
/workflow run <project-path> <workflow-id>
/workflow status <project-path> [run-id]
```

The invoking terminal is only the launcher; each Agent node uses the profile selected by the workflow. Status reports Orca-backed gates and paused paths but never resolves them automatically.

## Safety model

- Same-Worktree Agent nodes that could write concurrently are rejected.
- Independent concurrent writes require explicit isolated Worktrees.
- Approval nodes become Orca Decision Gates.
- Failures and escalations pause the affected path. There is no automatic retry or agent switching in the MVP.
- Credentials, executable paths, and other machine-specific settings are excluded from shared project configuration.

## Project layout

```text
apps/workflow-studio/     Electron app, renderer, validation, and runner
.agents/skills/           Project-local Codex/Claude skills
.scratch/orca-workflow-studio/
  spec.md                 Approved product specification
  issues/                 Dependency-aware local implementation tickets
docs/plans/               Product and delivery plan
prototype/workflow-studio/ Throwaway UI exploration; not production code
examples/agent-workflow/   Portable Agent Workflow example
```

## Verification status

The test suite covers workflow parsing and round trips, configuration resolution, the runner adapter boundary, approvals/failure pauses, parallel Worktree safety, command operations, and representative mock end-to-end workflows.

```text
53 tests passing
TypeScript typecheck passing
Production build passing
Electron startup uses the production CommonJS Electron entrypoint
```

The Electron visual-authoring smoke is recorded in [the smoke-test results](apps/workflow-studio/tests/e2e/SMOKE-RESULTS.md). The drill-down implementation adds unit coverage for safe discovery, staged review, preset copying, and node-level profile resolution.

## Roadmap

See the [open issues](https://github.com/hjung3113/orcaskills/issues), the local [base implementation tickets](.scratch/orca-workflow-studio/issues/), and the [Agent Workflow tickets](.scratch/agent-workflow-mode/issues/). Live runtime monitoring in Studio, loops, schedules, webhooks, automatic retries, and autonomous recovery are intentionally out of scope for the first release.

## References

The README structure takes inspiration from well-maintained workflow and desktop projects, especially [n8n](https://github.com/n8n-io/n8n), [Electron](https://github.com/electron/electron), and [React Flow](https://github.com/xyflow/xyflow). Orca Workflow Studio is not affiliated with them.
