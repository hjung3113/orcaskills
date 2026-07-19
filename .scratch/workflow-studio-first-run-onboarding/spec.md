# Workflow Studio first-run portable configuration onboarding

## Problem

A Git project with no `.orca/workflow-config.yaml` opens with an intentionally empty portable configuration. Agent nodes can only select existing roles and profiles, so a new user has no path from bounded local discovery to a reviewable configuration draft.

## Decision

The Agent Inspector owns the first-run entry point because it is the immediate corrective destination for the blocked role selector. It creates only in-memory portable role/profile drafts from available candidates returned by reviewed local discovery. Existing Configuration Review and Confirm Save remain the sole persistence path.

When a reviewed adapter cannot safely enumerate models, its available provider may be selected with the explicit `provider-default` model policy. This is not an invented model candidate.

For the Agent Workflow template, the same surface can stage the four required role IDs against one user-reviewed portable profile. The separate local toolkit prerequisite is explained, but no toolkit path or command crosses into portable YAML.

## Acceptance criteria

- Empty configuration exposes a semantic role name, intent, profile name, and only discovered available local candidates.
- Creating a draft does not write `.orca/workflow-config.yaml`; review and confirmation are required.
- Generated portable identifiers are safe and collision-free.
- Agent Workflow can stage `architect`, `implementer`, `reviewer`, and `verifier` role mappings.
- Unavailable discoveries cannot be selected; Conductor authority remains unchanged.
