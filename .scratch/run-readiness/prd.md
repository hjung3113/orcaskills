# PRD: Run Readiness

## Problem

Workflow Studio has runner preflight and operation preview APIs, but the editor does not expose them. Authors can save a structurally valid workflow without knowing whether its local profiles, machine-local Agent Workflow toolkit, Conductor profile, Orca CLI, or Orca runtime can support it. The resulting failure occurs too late and offers no focused route back to the relevant configuration.

## Outcome

Before launching a workflow, an author can explicitly check the current in-editor draft and see one of three states:

- **Ready**: all required checks pass and an execution preview is available.
- **Blocked**: one or more named readiness blockers explain the reason, configuration scope, and next action.
- **Unknown**: no check has been performed for the current draft, project, or configuration.

The readiness check and preview are side-effect free. They create no Orca task, terminal, worktree, manifest, or Decision Gate; Orca remains authoritative for live execution.

## Users and jobs

**Workflow author**: “Before I commit to a run, tell me whether this exact draft can execute here and what I must fix if it cannot.”

**Release Captain**: “Let the UI show preparation and planned operations, but never mistake readiness for approval or live state.”

## Non-goals

- Running a workflow from the editor in this slice.
- Continuous polling or a live runtime dashboard.
- Editing machine-local configuration from the browser renderer.
- Automatic remediation, profile substitution, login, installation, or capability discovery beyond explicit refresh.
- Resolving Orca Decision Gates.

## Acceptance criteria

1. The editor presents `Unknown`, `Blocked`, or `Ready` Run Readiness for the current draft.
2. A readiness result is invalidated when the draft, opened project, or portable configuration changes; it never represents a stale draft as ready.
3. Invalid YAML or graph diagnostics are shown as `Blocked` without calling the runner.
4. Runner preflight failures display every diagnostic with a meaningful scope and a next action; they include local profile/provider, Agent Workflow toolkit, Conductor, Orca CLI, and Orca runtime failures where applicable.
5. A check uses the current draft plus project portable configuration and machine-local configuration. Machine-local paths, credentials, and raw configuration contents do not cross into the renderer.
6. Only `Ready` enables **Preview execution**. Preview displays the planned operations and does not create a task, terminal, worktree, manifest, or Decision Gate.
7. The user can re-check explicitly. There is no background polling.
8. Unit tests cover state classification, stale-result invalidation, and preview gating; service/API tests cover a runner preview request built from server-owned local configuration.

## Success measures

- A user can determine whether the current draft is runnable in one explicit check, with zero navigation to a terminal for ordinary configuration failures.
- Every blocked result contains at least one actionable blocker.
- Preview requests remain side-effect free by contract and automated test.

## Constraints

Follow the bounded local capability-discovery rule and the Agent Workflow runner-profile ADR. A current-head verifier PASS artifact remains release readiness, not Run Readiness.
