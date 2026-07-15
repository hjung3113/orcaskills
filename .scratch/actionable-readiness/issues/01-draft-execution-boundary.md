# 01 — Draft execution boundary

Status: complete

Replace raw renderer run requests with server-owned Draft execution request assembly for both preview and run.

## Acceptance criteria

- [x] Client, IPC, and loopback APIs accept project path plus source for preview and run.
- [x] Service loads local configuration and handles absent local configuration as a blocked preflight.
- [x] No renderer-facing type imports `WorkflowRunnerRequest`.
- [x] Tests verify invalid source and run/preview boundary shape.

## Comments

- 2026-07-16: Completed with server-owned `draftRequest` assembly for both preview and run.
