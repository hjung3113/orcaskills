# 01 — First-run onboarding domain and Inspector

Status: Done

Implement a pure onboarding draft builder and show it in the Agent Inspector when portable roles are empty. Reuse the existing review/confirm persistence path.

## Comments

- Added available-candidate filtering with explicit provider-default policy when a reviewed adapter cannot enumerate models.
- Added ordinary role/profile and Agent Workflow four-role staging paths; both remain in-memory until configuration review confirmation.
- Added focused behavior tests.
