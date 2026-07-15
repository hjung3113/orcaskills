---
name: orca-workflow
description: List, validate, run, and inspect project-local Orca Workflow Studio workflows.
---

# Orca Workflow

Use this project-local skill from either Codex or Claude terminals. The terminal
that invokes this skill is only the launcher; workflow Agent nodes still use
their resolved role/profile/provider configuration.

Use the project workflow command boundary with one of these operations:

- `list <project-path>` — lists `.orca/workflows/*.yaml` definitions.
- `validate <project-path> <workflow-id>` — reports YAML/graph diagnostics and
  runner preflight diagnostics before any Orca operation is created.
- `run <project-path> <workflow-id>` — starts a validated workflow through the
  Orca adapter and returns the local run manifest path and run identifier.
- `status <project-path> [run-id]` — reads the local run manifest and current
  Orca Decision Gate state for that run.

Status is an Orca-backed command response, not a Workflow Studio live
dashboard. Report a pending gate or an active failure/escalation pause, but
never resolve a Decision Gate, retry a node, or replace an agent profile on a
user's behalf. Those actions remain explicit resolutions in Orca.

The command reads portable workflow configuration from the project and
machine-local provider configuration from the Workflow Studio local-data path.
Do not put executable paths, credentials, or local profile settings in the
project workflow file.

## Agent Workflow mode

When a workflow declares `runnerProfile: agent-workflow` and the
`agent-workflow` template reference, the command validates the fixed
ARCHITECT -> CODEX -> REVIEWER -> VERIFIER -> Release Captain flow in addition
to ordinary graph and profile checks. The Agent Workflow toolkit root is
machine-local; the portable YAML never supplies a shell command or path.

The dedicated runner profile dispatches CODEX only through its reviewed
`codex-safe.sh`/cmux toolkit boundary, keeps CODEX isolated, records role pane
and worktree resources in the manifest, and evaluates the canonical current
head `.review/ISSUE-<N>-VERIFY.json` evidence artifact. A valid VERIFIER PASS
artifact enables an Orca Release Captain Decision Gate. This skill, the
Conductor, and the runner must never resolve that gate, merge, push, or release
on the user's behalf.

For the UI creation and local setup flow, see
`docs/agent-workflow-example.md`.
