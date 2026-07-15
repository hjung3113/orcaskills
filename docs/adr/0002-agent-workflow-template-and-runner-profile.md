# Agent Workflow template and runner profile

Workflow Studio will provide Agent Workflow as both a first-class, parameterized template and a reviewed runner profile. The template makes the ARCHITECT -> CODEX -> REVIEWER -> VERIFIER -> Release Captain flow visible and editable within its allowed parameters; the runner profile enforces the corresponding local execution contract.

## Decision

The profile uses a machine-local, allowlisted hybrid adapter for the existing Agent Workflow toolkit. Portable workflow YAML contains neither toolkit paths nor commands. Orca remains authoritative for tasks, terminals, worktrees, Decision Gates, and run manifests; the adapter may invoke only reviewed toolkit operations needed to create the contained CODEX dispatch and to run the independent review and verification roles.

The canonical current-head verifier artifact is the only readiness signal. A valid PASS artifact enables a human Release Captain Decision Gate; it never resolves that gate, merges, pushes, or releases automatically. The runner profile owns and records the isolated worktree, visible role panes, and evidence directory until release or abandonment, then reconciles and cleans them explicitly.

## Consequences

- A generic workflow cannot claim Agent Workflow semantics merely by using similarly named nodes.
- The Studio can explain the fixed flow and evidence state without becoming a live execution dashboard or lifecycle authority.
- The local adapter needs explicit configuration and preflight diagnostics rather than hidden shell escapes.
- ForgeRoom informs the template/profile separation, deterministic resource lifecycle, and output contract only; its OpenClaw runtime and autonomous effects are not adopted.
