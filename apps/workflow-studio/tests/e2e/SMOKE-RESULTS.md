# Electron smoke test results

Status: application-start smoke passed; visual authoring verification blocked

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

Electron is therefore launchable. Visual authoring interaction is still unverified because the local Computer Use provider rejects every Electron accessibility-tree request with `permission_denied`, even though its permissions endpoint reports Accessibility and Screenshots as granted. The in-app browser is unavailable in this session, so no alternative browser surface can be used for the renderer interaction pass.

Repeatable mocked end-to-end coverage completed successfully with `npm test -- --run tests/e2e/representative-workflows.test.ts`: 2 tests passed. A functioning desktop accessibility provider is required to complete the remaining visual authoring steps in `MANUAL-SMOKE.md`.
