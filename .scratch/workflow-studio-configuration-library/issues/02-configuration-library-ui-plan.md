# Implementation handoff: 02 - Staged Configuration Library UI

Status: Ready after Issue 01 lands

## Slice outcome

Add a **Configuration Library** entry point to the Workflow Studio left outline. It opens an ongoing-authoring surface for portable roles, profiles, configuration presets, and prompt presets while keeping the existing first-run Inspector flow unchanged. Every Library mutation is local renderer state until the existing **Configuration Review -> Confirm save** boundary succeeds.

This is deliberately a UI-and-state slice. Issue 01 owns the portable contracts, validation, review shape, reference analysis, and pure staged mutation operations. This issue consumes those operations; it does not invent a second renderer-only validity model.

## Exact placement and interaction model

- In `apps/workflow-studio/src/renderer/main.tsx`, add a `Configuration Library` button in the left `.outline`, immediately after the two new-workflow buttons and before the saved-workflow list.
- Add `activeSurface: "workflow" | "library"` state. The button selects `library`; selecting/creating a workflow returns to `workflow`.
- When `activeSurface === "library"`, replace the center `canvas-panel` with a `.configuration-library` center panel. Keep the right Inspector column visible, but render a Library editor there instead of node controls.
- Library center panel: tab/list controls for `Roles`, `Profiles`, `Configuration presets`, and `Prompt presets`; each row shows its semantic fields, availability (where applicable), inbound-reference summary, and Edit / Duplicate / Delete-request actions.
- Library Inspector: the selected item editor and the create form for the active tab. Use semantic name and role intent inputs; derive technical IDs through Issue 01's pure operations. For profiles, provider/model selectors are populated only from the current `CapabilityDiscovery` and only currently available candidates. Retain and label unavailable existing profiles, but do not offer them as a new/edited binding.
- Keep the current empty-role first-run form inside the agent Inspector exactly where it is. The Library is the ongoing-authoring route, not a replacement empty-state route.
- Put Configuration Review in one shared bottom/action area for both surfaces. Opening review freezes no state; it only renders the Issue 01 review result. Confirm invokes the already-existing `workflowStudioClient.savePortableConfiguration(projectPath, portableConfiguration)` path. Cancel returns to editing without mutation.

## State, events, and persistence boundary

Continue to use the existing top-level state as the single staged source:

```ts
portableConfiguration        // mutable staged draft
savedPortableConfiguration   // last successfully persisted snapshot
capabilities                 // point-in-time capability refresh result
showConfigurationReview
configurationRevision
```

Add only UI selection state (for example `activeSurface`, `librarySection`, `selectedLibraryItemId`, and `libraryEditorMode`). Do not copy a second configuration draft into the Library.

Event rules:

1. Create, edit, duplicate, and delete-request call an Issue 01 pure operation with `portableConfiguration` plus the relevant reference context. On success, set the returned draft with `setPortableConfiguration`, clear/refresh selection as necessary, clear `showConfigurationReview`, and set a staged-draft message.
2. A blocked delete keeps the draft unchanged, keeps the item selectable, and renders the returned inbound references plus a remediation link/message. It must not cascade, substitute IDs, or remove the row optimistically.
3. `Review configuration` computes/renders `reviewPortableConfiguration(savedPortableConfiguration, portableConfiguration)` (extended by Issue 01). It must include role/profile/config-preset/prompt-preset changes and any migration effects supplied by the contract.
4. `Confirm save` remains disabled without `projectPath`, no changes, validation failure, or any blocked removal. Only successful client save updates `savedPortableConfiguration`, increments `configurationRevision`, clears readiness/preview, and closes review.
5. Capability refresh remains explicit via the existing header action. It changes selectability/display only; it must never alter the staged portable configuration or persist registration.

## Issue 01 dependency contract

Before wiring the UI, import the final names from Issue 01 rather than re-implementing them. This UI needs equivalents of:

- `PromptPreset` and the expanded `PortableConfiguration` shape (`roles`, `profiles`, `presets`, `promptPresets`).
- The extended `ConfigurationReview`, including changed prompt presets, blocked removals/inbound references, and legacy-migration review data where applicable.
- Pure staged operations for create/edit/duplicate/delete planning. They must derive collision-safe IDs, validate duplicate/missing references, and return precise diagnostics rather than letting `main.tsx` edit arrays ad hoc.
- A reference-analysis result covering role, profile, configuration preset, Conductor, and workflow-node references. The renderer supplies the current parsed workflow/Conductor context when the operation contract requires it.
- Available-candidate helpers that preserve `provider-default` when an adapter has no enumerable models. Reuse `onboardingCandidates` only if Issue 01 deliberately makes it the shared candidate contract; otherwise promote/replace it in the config layer, not in JSX.

The existing client/service/IPC contract is sufficient: the renderer already reads and saves the complete `PortableConfiguration` through `WorkflowStudioClient`. Do **not** add an IPC channel per Library operation or send local discovery state over IPC.

## Recommended file-level work order

1. Land Issue 01 contracts/tests first; verify its pure operations independently.
2. Add a small renderer-local helper/reducer module such as `src/renderer/configuration-library.ts` plus `configuration-library.test.ts` if needed to keep selection, candidate filtering, and action-to-view-model behavior out of the already-large `main.tsx`.
3. Integrate the outline entry, center panel, inspector editor, and shared review rendering in `src/renderer/main.tsx`.
4. Add narrowly scoped CSS in `src/renderer/styles.css`, reusing existing `.outline`, `.inspector`, `.agent-configuration`, form, status, and action styles before introducing a new visual system.
5. Do not modify `electron/main.ts`, `electron/preload.ts`, `src/client/*`, server routes, or service methods unless Issue 01 changes the save payload contract. The expected path is no transport change.

## Test plan

The current app has Vitest pure-module tests but no React Testing Library setup. Keep this slice testable without introducing a UI framework solely for it:

- `src/config/staging.test.ts` (from Issue 01): create/edit/duplicate/delete planning, precise blocked-reference diagnostics, review diff including prompt presets, and no mutation of input snapshots.
- `src/renderer/configuration-library.test.ts` (new if helper/reducer is extracted): section switching; staged action updates only the draft; unavailable profiles remain displayed but are omitted/disabled for new binding; provider-default remains selectable when a provider has no safe model candidates; delete request surfaces references and does not alter draft; review is required before the save command is enabled.
- Preserve existing `src/config/onboarding.test.ts` behavior: an empty configuration still uses first-run guided setup and a provider with no models yields `provider-default`.
- Focused typecheck/build after renderer integration. Issue 04 owns full readiness and Electron acceptance, including proof that no filesystem write occurs before Confirm save.

## No-go boundaries

- No direct YAML editor, auto-save, per-row persistence, or save-on-tab-change.
- No remote catalogs, login, credentials, executable paths, commands, `toolkitRoot`, arbitrary provider settings, or background capability scans.
- No free-text provider/model identifiers. Do not make unavailable profiles selectable for a new or edited binding; retain them visibly instead.
- No deletion cascade, silent reference repair, or implicit migration. Legacy `node.prompt` migration and node `additionalInstructions` UI belong to Issue 03.
- No prompt-preset live binding; this issue only authors prompt presets. Applying one to a node is Issue 03 and must copy text.
- No changes to Conductor authority, Agent Workflow's role/evidence contract, runner behavior, or Run Readiness semantics.
- Do not remove or alter `.orca/`; it remains user/manual-test material.
