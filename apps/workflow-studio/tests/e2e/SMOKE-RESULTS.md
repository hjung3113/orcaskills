# Electron smoke test results

Status: passed

Date: 2026-07-15

Commands executed from `apps/workflow-studio`:

```text
npm run build
npm start
```

The original Electron entrypoint issue was fixed by emitting CommonJS bundles as `.cjs` and pointing the package entrypoint and preload path at those files. The following rerun succeeded: the Electron process remained running for more than ten seconds with no startup error output.

```text
npm run build
npm start
# @orca/workflow-studio@0.1.0 start
# electron .
```

Electron is launchable. During visual verification, the renderer initially displayed a blank page because the production Vite build emitted absolute `/assets/...` URLs while Electron opened the renderer with `file://`. Setting Vite `base` to `"./"` fixed that production-only load failure.

Visual authoring verification passed through the local Computer Use provider:

- Canvas, outline, Inspector, and the `Workflow is valid and ready to save` diagnostic were visible.
- `+ Agent` added an agent node. Selecting it and editing the Inspector changed the name to `Visual smoke agent` and the prompt to `Verify the visual authoring flow.`; the outline and canvas reflected the changes.
- The Studio opened `/Users/hyojung/orca/projects/orcaskills` as a Git project, saved `.orca/workflows/new-workflow.yaml`, exposed `new-workflow` in the Workflows list, and reloaded it. The temporary saved workflow was removed after verification.

Repeatable mocked end-to-end coverage completed successfully with `npm test -- --run tests/e2e/representative-workflows.test.ts`: 2 tests passed. `npm run typecheck` also passed after the visual verification.

## Agent Workflow regression — 2026-07-15

`npm --workspace @orca/workflow-studio run build`, `typecheck`, and the full Vitest suite completed successfully after adding the Agent Workflow template/profile. The suite contains 48 tests, including the fixed-template validation, documented-example validation, workflow configuration round trips, allowlisted local toolkit preflight, current-head verifier-evidence contract, release-gate authority, and resource-lease cleanup.

`npm --workspace @orca/workflow-studio start` again launched an Electron window titled `Orca Workflow Studio` and stayed running without startup errors. The local Computer Use provider could list that window but did not expose its accessibility tree during this run because macOS accessibility permission needed re-enabling; no UI action was inferred from that unavailable tree. The manual checklist now includes the Agent Workflow creation surface.
