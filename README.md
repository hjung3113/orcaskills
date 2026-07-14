# Orca Workflow Studio

> Design reusable multi-agent development workflows visually, then run them in Orca.

Orca Workflow Studio is an Electron desktop editor for project-local, Git-tracked workflow DAGs. It offers an n8n-style canvas for composing agent work, approvals, conditions, parallel branches, and terminal states—without replacing Orca as the place where agents actually run.

## What it does

- Edits `.orca/workflows/*.yaml` inside an existing Git project.
- Provides a canvas-first DAG editor with a collapsible step outline and persistent inspector.
- Supports **Start**, **Agent**, **Approval**, **Condition**, **Parallel**, and **End** nodes.
- Validates YAML, graph structure, role/profile resolution, structured handoffs, and unsafe concurrent Worktree writes before execution.
- Resolves a portable workflow role through an agent profile and provider/model policy, while keeping executables and credentials machine-local.
- Previews and runs validated workflows through an Orca adapter, preserving a local run manifest.
- Uses Orca Decision Gates for approvals and pauses failures/escalations for explicit retry, profile replacement, or termination choices.

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
```

## Verification status

The test suite covers workflow parsing and round trips, configuration resolution, the runner adapter boundary, approvals/failure pauses, parallel Worktree safety, command operations, and representative mock end-to-end workflows.

```text
30 tests passing
TypeScript typecheck passing
Production build passing
Electron startup smoke passing
```

The remaining manual visual-authoring verification is tracked in [Issue #6](https://github.com/hjung3113/orcaskills/issues/6): the local desktop accessibility provider currently denies inspection of Electron despite reporting that permission as granted. Details are recorded in [the smoke-test results](apps/workflow-studio/tests/e2e/SMOKE-RESULTS.md).

## Roadmap

See the [open issues](https://github.com/hjung3113/orcaskills/issues) and the local [implementation tickets](.scratch/orca-workflow-studio/issues/). Near-term work focuses on completing the visual smoke check; live runtime monitoring in Studio, loops, schedules, webhooks, automatic retries, and autonomous recovery are intentionally out of scope for the first release.

## References

The README structure takes inspiration from well-maintained workflow and desktop projects, especially [n8n](https://github.com/n8n-io/n8n), [Electron](https://github.com/electron/electron), and [React Flow](https://github.com/xyflow/xyflow). Orca Workflow Studio is not affiliated with them.
