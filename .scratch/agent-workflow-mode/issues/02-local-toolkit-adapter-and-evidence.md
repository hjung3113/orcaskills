# 02 — Local toolkit adapter and verification evidence

Status: Completed

## Scope

Create a machine-local Agent Workflow adapter configuration, allowlisted command contract, verifier-artifact parser/validator, and tests.

## Done when

- Only configured toolkit root and reviewed operations are accepted.
- CODEX uses `codex-safe.sh`; review/verify use separate allowlisted operations.
- Evidence validation checks producer, classifier, verdict, issue, branch, and current HEAD.
- No adapter configuration can be serialized into portable workflow YAML.

## Comments

- Do not execute arbitrary shell text from a workflow node.
- Implemented by `src/runner/agent-workflow.ts` with focused evidence/allowlist tests.
