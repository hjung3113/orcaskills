# PRD: Actionable Readiness

## Problem

Run Readiness identifies preflight failures, but workflow-specific blockers do not take an author to their node. The canvas does not expose which nodes are blocked, so authors must translate a diagnostic into a search through the graph. Separately, preview now protects machine-local configuration at the service boundary while the unused renderer `run(request)` contract can still carry a raw runner request across IPC or HTTP.

## Outcome

An author can check the current workflow draft, identify every blocked node on the canvas, select a blocker to focus its node and Inspector, and understand machine-wide blockers without a false node link. Preview and execution accept only a Draft execution request; server-side code assembles all local configuration.

## Scope

- Replace renderer-facing raw runner preview/run payloads with `projectPath + source` Draft execution requests.
- Preserve `RunnerDiagnostic.nodeId` in a renderer Readiness blocker.
- Make node-specific blockers select and focus their canvas node; machine-wide blockers remain clearly non-navigable.
- Display a compact blocked/ready badge on each affected canvas node.
- Add keyboard-independent, accessible button labels and text equivalents for the badges.

## Non-goals

- Running workflows from the UI, live execution monitoring, automatic remediation, or automatic capability refresh.
- Guessing a node from diagnostic text when `nodeId` is absent.
- Turning readiness into release evidence or a Release Captain decision.

## Acceptance criteria

1. Client preview and run methods accept only `(projectPath, source)`; local configuration is read only within Electron main/local API service code.
2. A source or runner diagnostic with `nodeId` produces an Actionable blocker linked to that exact existing canvas node.
3. Clicking an Actionable blocker selects and focuses the node, then exposes the Inspector; non-node blockers are visibly disabled from navigation.
4. Every currently blocked node displays a text-backed `Blocked` badge; a ready checked Agent node may display `Ready`.
5. Workflow edits, project changes, and saved portable configuration changes invalidate readiness and remove stale badges.
6. Automated tests prove request-boundary shape, node linkage, stale invalidation, navigation behavior, and badge classification.
7. Accessibility labels describe readiness status and navigation intent without relying on color alone.

## Quality scorecard

The feature must achieve at least **90/100** and no security criterion may score below its minimum.

| Dimension | Points | Quantitative evidence | Qualitative review |
| --- | ---: | --- | --- |
| Execution boundary | 25 | 25 when no renderer client method accepts `WorkflowRunnerRequest`; 0 otherwise. Minimum 25. | Local path/credential authority is understandable and centralized. |
| Blocker traceability | 25 | 5 points per tested path: agent role, profile resolution, parallel/worktree, static graph, and machine-wide non-link. | A user can identify the right destination without interpreting diagnostic text. |
| Canvas feedback | 15 | 10 for tested node badges; 5 for stale result removal. | Blocked graph areas are scannable without visual clutter. |
| Preview safety | 15 | 10 for side-effect-free preview tests; 5 for disabled preview while blocked. Minimum 10. | The difference between preview and run is unambiguous. |
| Accessibility and interaction | 10 | 5 for semantic labels/disabled state; 5 for navigation behavior test. | Status is not color-only and actions have predictable focus. |
| Regression/documentation | 10 | 5 for typecheck/build; 5 for full automated suite and docs. | Guide explains correction flow in plain language. |

## Evaluation scenarios

1. Missing role on an Agent node: the author checks readiness, chooses its blocker, and lands on that node.
2. Missing profile resolved from an Agent node: the badge and blocker lead to the same node.
3. Parallel Worktree collision: the blocker focuses the participating node when the runner provides one; otherwise it stays machine/workflow scoped without a guessed link.
4. Orca runtime unavailable: the blocker stays non-navigable and gives the local remediation.
5. After correcting any draft field, previous readiness, preview, and badges disappear until re-check.
