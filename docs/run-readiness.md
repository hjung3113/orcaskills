# Run Readiness

Run Readiness answers one question for the workflow draft currently open in Workflow Studio: **can this draft be previewed on this machine now?**

Choose **Check readiness** in the header or the Inspector. The result is explicit and applies only to the current project, workflow draft, and saved portable configuration.

| State | Meaning | What to do |
| --- | --- | --- |
| Not checked | No check has been run for this exact draft. | Choose **Check readiness**. |
| Blocked | A static workflow diagnostic or local runner preflight failed. | Read each blocker’s scope, reason, and next action, correct it, then check again. |
| Ready to preview | The workflow draft and local preflight passed. | Choose **Preview execution** to inspect planned Orca operations. |

Changing the workflow, opening another project, or saving changed portable configuration invalidates the prior result. Workflow Studio never treats an old check as readiness for a changed draft.

## What is checked

Readiness combines the existing workflow validation with runner preflight: role/profile and Conductor resolution, the reviewed machine-local Agent Workflow toolkit when needed, Orca CLI availability, and Orca runtime availability. The UI uses focused blockers rather than a generic failure message.

The renderer submits only the project path and workflow source. Electron or the local loopback API loads machine-local configuration itself. Toolkit paths, executable paths, credentials, and the raw local configuration do not enter the browser renderer.

## Correcting a blocker

When a blocker names a workflow node, it provides **Go to _node-id_**. Selecting it focuses that exact node on the canvas and opens its Inspector; Workflow Studio never guesses a destination from message text. The canvas also shows a text-backed **Blocked** badge on every affected node, so the blocked area is identifiable before reading the list. Machine-wide blockers, such as an unavailable Orca runtime, intentionally have no node link and instead give their local remediation.

Any draft edit, project change, or saved portable-configuration change clears the previous result and its node badges. Check readiness again after the correction.

## Preview boundary

**Preview execution** is available only after a Ready result. It shows the Orca operations that the runner would create, but creates no task, terminal, worktree, manifest, or Decision Gate. It is not an execution command, a release decision, or a live runtime dashboard.

For an Agent Workflow, Run Readiness is distinct from the VERIFIER’s current-head PASS artifact: the former is pre-run machine and configuration readiness; the latter enables the human Release Captain decision after verification.
