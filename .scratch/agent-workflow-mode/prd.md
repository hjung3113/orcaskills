# PRD: Agent Workflow mode

## Status

Approved design: implement as a first-class template plus a dedicated runner profile.

## Problem

Workflow Studio can compose generic Orca workflows, but a user cannot visually author or safely execute the disciplined Agent Workflow operating model. Recreating its node names alone would lose the contained CODEX dispatch, independent review and verification, current-head evidence gate, visible role panes, and human-only release authority.

## Outcome

A user can choose **Agent Workflow** in Workflow Studio, see and configure an intuitive ARCHITECT -> CODEX -> REVIEWER -> VERIFIER -> Release Captain flow, save a portable workflow without local secrets or paths, and run it through Orca with a reviewed local adapter. A release becomes eligible only after valid verifier evidence; the user remains Release Captain.

## Users and jobs

### Workflow author

When I start a code-change workflow, I want a visual Agent Workflow template with only meaningful choices exposed, so I can use a safe multi-role process without rebuilding its DAG and safety constraints from memory.

### Release Captain

When verification finishes, I want the Studio and run status to show evidence validity and the remaining Orca Decision Gate, so I can make a release decision without trusting prose or granting automation merge authority.

### Project collaborator

When I open the workflow elsewhere, I want its intended roles and topology preserved while local toolkit availability is diagnosed clearly, so portable project configuration never embeds paths, credentials, or hidden execution behavior.

## In scope

- A first-class `agent-workflow` template with fixed stages: ARCHITECT, CODEX implementation, REVIEWER, VERIFIER, and Release Captain decision.
- An Agent Workflow runner profile with a reviewed, allowlisted machine-local toolkit adapter.
- Preflight validation for toolkit availability, role separation, sandboxed CODEX dispatch, isolated worktree requirements, and evidence contract.
- A versioned run-manifest profile section that records execution resource leases and verifier evidence state.
- Canonical verifier-artifact validation for current issue, branch, and live HEAD.
- An Orca Decision Gate that becomes available only after valid PASS evidence and is never auto-resolved.
- Runner-owned creation, reconciliation, and cleanup of isolated worktrees, visible role panes, and evidence resources.
- Template-specific UI: creation entry point, stage cards, selected role/profile configuration, local readiness diagnostics, evidence state, and explicit Release Captain boundary.
- A project-local example workflow and user documentation.

## Out of scope

- Importing ForgeRoom/OpenClaw runtime code or autonomous effects.
- Arbitrary shell commands, arbitrary toolkit paths, or a portable command field.
- Running the Agent Workflow toolkit from generic workflows.
- Automatic gate resolution, merge, push, release, or Conductor lifecycle authority.
- Replacing visible roles with invisible subagents.
- A Studio live execution dashboard; Orca remains live-state authority.

## Functional requirements

1. Creating Agent Workflow mode produces the fixed, readable five-stage DAG and stores `runnerProfile: agent-workflow` plus template metadata.
2. The template must reject missing or reordered required stages, a shared CODEX/REVIEWER/VERIFIER execution identity, an implementation node that is not isolated, and a release node that is not an approval gate.
3. The CODEX stage must dispatch only via the reviewed toolkit adapter's `codex-safe.sh` path using `workspace-write`; review and verification execute outside that sandbox in separate visible panes.
4. Local adapter configuration must be machine-local, validated, and limited to an explicit toolkit root and allowlisted operations. No path, command, credential, or discovered result may enter portable workflow YAML.
5. The manifest must identify the runner profile, template version, resource lease, issue/branch/head identity, and evidence validation state.
6. A valid verifier artifact must be `.review/ISSUE-<N>-VERIFY.json` with `producer_role: VERIFIER`, `classifier: PASS`, `verdict.exit_code: 0`, `verdict.failed: 0`, `verdict.passed >= 1`, matching issue and branch, and a `head_sha` equal to the live worktree HEAD.
7. Missing, stale, malformed, failing, or identity-mismatched evidence must create a recovery Decision Gate and must not expose the Release Captain gate as resolved or eligible.
8. Valid evidence creates an Orca Decision Gate for the Release Captain. The runner and Conductor must never resolve it, merge, push, or release.
9. The runner owns lifecycle records for prepared worktree, ARCHITECT/CODEX/REVIEWER/VERIFIER pane handles, and evidence directory. It must reconcile orphaned records on status/startup and clean them only after release or abandonment.
10. The UI must make the sandbox boundary, independent roles, verification result, and human-only release authority visible without offering unsafe overrides.

## Acceptance scenarios

1. Given a supported local toolkit, when an author chooses Agent Workflow, then Studio creates the fixed visual DAG and displays required role/profile slots, worktree isolation, and the Release Captain boundary.
2. Given an incomplete local adapter configuration, when an author attempts a run, then preflight explains the missing machine-local capability and creates no Orca task or terminal.
3. Given a run, when CODEX is dispatched, then the adapter records an allowlisted `codex-safe.sh` operation and the manifest records the isolated worktree and CODEX pane.
4. Given implementation completion, when review and verification run, then their distinct panes and roles are recorded and verifier evidence is evaluated against the live worktree HEAD.
5. Given a stale or failing verifier artifact, when status is inspected, then evidence is invalid and the run pauses at an Orca recovery gate rather than a release gate.
6. Given valid PASS evidence, when status is inspected, then the Release Captain gate is pending and no auto-merge/push/release operation occurred.
7. Given a resolved release or abandonment decision, when cleanup runs, then the runner closes recorded panes, archives evidence, and removes the prepared worktree according to the recorded lease.

## Evidence sources

- Agent Workflow skill: `/Users/hyojung/.claude/skills/agent-workflow/SKILL.md`.
- Handoff: `/var/folders/6t/ddmgth_n47j1dq_mwk8lm6700000gn/T/orca-workflow-studio-agent-workflow-forgeroom-handoff-2026-07-15.md`.
- ForgeRoom references: `Docs/concepts/workflow-dsl.md`, `Docs/concepts/conductor-model.md`, `apps/orchestrator/src/core/engine/runtime-profile-compiler.ts`, and `apps/orchestrator/src/core/worktree/worktree-manager.ts` in `hjung3113/ForgeRoom`.
