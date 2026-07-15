# Run Readiness delivery specification

## Contract

`WorkflowStudioClient.preview(projectPath, source)` submits only the project path and current portable workflow source. The Electron main process or local loopback API parses the source and constructs the runner request using server-owned portable and machine-local configuration. The renderer never receives local configuration, executable paths, or credential references.

The service returns `WorkflowPreview`, whose `preflight.valid` determines readiness. Source diagnostics are returned locally by parser validation and are not submitted to the runner.

## Readiness model

| State | Meaning | Preview |
| --- | --- | --- |
| `unknown` | The current input has not been checked. | Disabled |
| `blocked` | Static validation or runner preflight failed. | Disabled |
| `ready` | Current draft and local preflight passed. | Enabled |

Any source, project-path, or portable-configuration change clears the last runner result to `unknown`.

## Action mapping

| Diagnostic code | Scope | Next action |
| --- | --- | --- |
| `workflow` | Workflow canvas or YAML | Fix the highlighted workflow diagnostic. |
| `configuration` | Role, profile, or Conductor configuration | Select an available profile or correct the referenced configuration. |
| `agent-node` | Machine-local Agent Workflow toolkit | Configure the reviewed local toolkit, then re-check. |
| `orca-cli` | Orca CLI | Install or expose the reviewed Orca CLI, then re-check. |
| `orca-runtime` | Orca runtime | Start Orca, then re-check. |
| `condition`, `mapping`, `parallel`, `worktree-safety` | Workflow canvas or YAML | Correct the affected node configuration, then re-check. |

## Verification

- No readiness operation invokes `run`.
- Service tests prove local configuration is read server-side and missing local configuration becomes a blocker rather than an API failure.
- Renderer helper tests prove a stale readiness result is cleared after input changes.
