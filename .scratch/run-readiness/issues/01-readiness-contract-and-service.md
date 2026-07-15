# 01 — Readiness contract and server-owned request assembly

Status: complete

## What to build

Expose a preview endpoint/client method that accepts `projectPath` plus workflow source, parses and validates it in the service boundary, then loads portable and machine-local configuration server-side before calling runner preview.

## Acceptance criteria

- [x] The renderer never sends or receives `LocalConfiguration`.
- [x] Missing local configuration produces runner diagnostics rather than an unhandled file error.
- [x] Electron IPC and local web API implement the same preview contract.
- [x] Tests cover request assembly and failure behavior.

## Comments

- Depends on no other ticket.
- 2026-07-16: Implemented server-owned preview request assembly, IPC/API contract, and local API test coverage.
