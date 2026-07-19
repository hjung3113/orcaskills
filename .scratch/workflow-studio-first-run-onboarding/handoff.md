# Handoff: Workflow Studio first-run configuration onboarding

Status: First-run onboarding and Configuration Library (Issues 01–02) are implemented in the current uncommitted worktree. Continue with Issue 03, then Issue 04.

## 2026-07-19 continuation handoff

### Delivered since the original handoff

- First-run onboarding remains implemented: local, bounded candidate discovery; staged role/profile creation; explicit review before the only save path; four Agent Workflow role drafts; toolkit paths stay local.
- Configuration Library now supports staged create, edit, duplicate, and delete-request flows for portable roles, profiles, configuration presets, and prompt presets.
- Deletion is reference-aware. Staged removal is blocked while roles, presets, Conductor, workflow overrides, or nodes still refer to the removed role/profile.
- Prompt presets are portable text-only, copy-on-apply templates. They carry no provider data or live binding.
- `WorkflowNode` now has `additionalInstructions?: string`; legacy `prompt?: string` remains intentionally present until Issue 03 provides explicit migration behavior.
- Configuration review lists changed roles, profiles, configuration presets, and prompt presets. No Library action persists before **Review configuration → Confirm save**.

### Library UI refactor completed

The initial Library implementation was corrected after review for not reusing existing UI patterns enough.

- [configuration-library.tsx](../../apps/workflow-studio/src/renderer/configuration-library.tsx) now owns `ConfigurationLibraryPanel`, `ConfigurationLibraryEditor`, and `ConfigurationReviewPanel`.
- [main.tsx](../../apps/workflow-studio/src/renderer/main.tsx) owns orchestration and staged mutations only; it no longer contains the Library's large panel/editor/review JSX blocks.
- The Outline entry reuses the existing `new-workflow` treatment. Shared secondary actions use the unified `quiet-action` treatment. Library-specific styles are limited to the genuinely unique tabs, table, and availability/reference rows.
- Existing profiles that are no longer available from local discovery do not silently switch to the first available candidate.

### Current artifacts

- Specification: `.scratch/workflow-studio-configuration-library/spec.md`
- Issue 01 contract/review slice: implementation landed; its Markdown status was not updated and should be corrected to Done when touching issue metadata.
- Issue 02 UI slice: Done. Detail and evidence are in `.scratch/workflow-studio-configuration-library/issues/02-configuration-library-ui.md`.
- Issue 03 additive prompt composition: Planned, with implementation plan at `.scratch/workflow-studio-configuration-library/issues/03-additive-prompt-composition-and-migration-plan.md`.
- Issue 04 readiness/Electron acceptance: Planned.
- Domain additions: `CONTEXT.md` and `docs/adr/0003-additive-prompt-composition.md`.

### Exact next work: Issue 03

Implement the approved plan, keeping its safety decisions literal:

1. Compose agent execution prompts as role base instruction plus `additionalInstructions`; structured upstream handoff remains separate.
2. Keep legacy agent `prompt` replacement behavior until the staged editor migration is deliberately implemented and tested; do not silently reinterpret existing workflows.
3. Apply prompt presets by copying instructions onto a node; never create a runtime live link.
4. Preserve approval prompts and the Agent Workflow four-role/evidence contract.
5. Add focused runner/composition/migration tests before moving to Issue 04.

### Verification already green

- `npm --workspace @orca/workflow-studio test -- --run src/config/onboarding.test.ts src/config/staging.test.ts src/config/config.test.ts` — 17 tests passed.
- `npm --workspace @orca/workflow-studio run typecheck` — passed.
- `npm --workspace @orca/workflow-studio run build` — passed.
- `git diff --check` — passed.
- Electron inspection (before the UI refactor) confirmed the Library entry point, four sections, Inspector empty state, and disabled review action before staging. The post-refactor build/typecheck gate is green; re-run the same Electron inspection as part of Issue 04's broader acceptance rather than relying on an old window.

### Worktree constraints

- Do not commit unless the user explicitly requests it.
- Preserve untracked `.orca/`; it is manual test material. Do not delete, modify, or commit it without an explicit decision.
- The worktree was already dirty before this feature. Avoid reverting or bundling unrelated first-run onboarding changes.
- Do not add remote catalogs, login flows, credentials, executable paths, toolkitRoot, commands, discovery snapshots, or arbitrary PATH scans to portable configuration.
- Keep Conductor read-only and keep Agent Workflow's four-role/evidence contract unchanged.

## 2026-07-19 implementation delivered

The first-run gap described below is now closed in the current uncommitted worktree.

- `apps/workflow-studio/src/config/onboarding.ts` provides pure, in-memory draft creation from discovered available candidates.
- The Agent Inspector shows the first-run form when portable roles are empty. It accepts semantic role name/intent and profile name, then uses only an available discovered provider/model candidate.
- If an adapter cannot safely enumerate models, its available provider is represented by the explicit `provider-default` model policy; no model is invented.
- Agent Workflow can stage the required `architect`, `implementer`, `reviewer`, and `verifier` roles against one reviewed portable profile.
- Draft creation remains non-persistent. Existing **Review configuration → Confirm save** is the only write path.
- The UI explains that Agent Workflow toolkitRoot remains a separate machine-local prerequisite and never enters portable YAML.

Verification completed: focused onboarding tests, full Workflow Studio suite (61 passing), typecheck, production build, `git diff --check`, and local Electron inspection. Electron verification confirmed the empty-configuration Inspector form, Codex CLI/provider-default candidate, four-role draft creation, role selection, and that only Review—not save—became available after draft creation.

## Historical pre-implementation notes — superseded

Do not use this section as the current plan. It records the gap that led to the completed onboarding and Library slices; the continuation handoff above is authoritative.

The user requested a read-only review of richer configuration authoring and chose to defer implementation. These are not implemented yet.

### Current gaps confirmed

- Existing roles and profiles have no UI library for list/edit/duplicate/delete. The first-run UI creates drafts only.
- Node Prompt is editable, but it **replaces** `role.intent` when present; it is not an additive instruction field.
- Upstream DAG context is delivered separately as structured handoff metadata (declared output fields and artifact references), not raw output text pasted into the prompt.
- Configuration presets currently contain only role/profile/model-policy references and are copy-on-apply. Prompt presets do not exist.
- The portable schema supports only exact-model or provider-default model policy. There is no model picker/editor in the UI and no `effort`, `fast`, or other provider-specific execution setting in schema, UI, discovery, or runner adapter.

### Recommended design direction

1. Add a **Configuration Library** surface for portable roles, profiles, and prompt presets. All mutations must be staged and use the same review/confirmation write boundary.
2. Make prompt composition explicit and additive:

   `role base instruction + applied prompt preset + node additional instructions + structured upstream handoff`

   Keep structured handoff separate from arbitrary raw-output interpolation. Rename or replace the current node `prompt` semantics so an authored node instruction cannot silently discard the role base instruction.
3. Add portable prompt presets as copy-on-apply templates, consistent with existing configuration preset semantics; do not introduce live implicit bindings.
4. Define provider settings through reviewed adapter-declared capabilities, not free-text key/value fields. Candidate settings include model, reasoning effort, and fast/service-tier behavior. A portable selection must be validated against machine-local adapter capabilities during Run Readiness.
5. Extend discovery/adapter contracts before adding model, effort, or fast UI. The current Codex adapter intentionally performs only `codex --version`, so it cannot honestly expose a model or effort list yet.

## Constraints to preserve

- Bounded local discovery only: reviewed adapters, startup or explicit refresh, no remote catalog/login/credential use/background writes/arbitrary PATH scanning.
- Portable configuration never contains executable paths, credentials, toolkitRoot, or commands.
- Conductor stays read-only with no task, terminal, dispatch, code-write, or Decision Gate authority.
- Preserve Agent Workflow template plus runner-profile separation and its four fixed roles/evidence contract.
- Preserve existing untracked `.orca/`; it is manual test material and must not be deleted, committed, or modified without an explicit decision.

## User-visible problem

In the local Electron app, opening the current Git project and creating an **Agent Workflow** left every role/profile/preset/Conductor drill-down empty. Run Readiness then blocked the draft.

## Reproduction completed

1. Build and start the Electron app from the repository root:

   ~~~bash
   npm run build
   npm --workspace @orca/workflow-studio start
   ~~~

2. Open /Users/hyojung/orca/projects/orcaskills as the Git project.
3. Choose **Agent Workflow** and save it.
4. Select ARCHITECT (or any agent node) in the Inspector.

Observed state:

- Role reads **Select a role** with no available options.
- Profile override is disabled and says **Use role profile (none)**.
- Preset and Conductor profile selectors have no entries.
- Run Readiness reports missing roles architect, implementer, reviewer, and verifier, plus the missing machine-local Agent Workflow toolkitRoot.

## Confirmed root cause

This is a first-run product gap, not a broken dropdown:

- WorkflowStudioService.readPortableConfiguration() deliberately returns an empty roles/profiles/presets configuration when .orca/workflow-config.yaml does not exist.
- The renderer initializes the same empty shape.
- The Inspector only selects existing roles, profiles, and presets; it has no UI to create the first portable role/profile/configuration.
- createAgentWorkflow() produces a valid portable graph that references four conventional role IDs, but it does not seed matching portable configuration.

Relevant implementation points:

- apps/workflow-studio/src/service/workflow-studio-service.ts
- apps/workflow-studio/src/renderer/main.tsx
- apps/workflow-studio/src/config/storage.ts
- apps/workflow-studio/src/config/resolution.ts
- apps/workflow-studio/src/shared/config.ts

## Required product direction

Design and implement a first-run **portable configuration onboarding** flow in Studio. It must let a user create roles and profiles from discovered local candidates before selecting them in an Agent node.

Keep these boundaries:

- Guided input: users enter semantic role names and intent, while provider/model/profile technical values come from bounded local discovery.
- Portable configuration is written only after an explicit review and confirmation.
- Executable paths, credentials, and discovery data remain machine-local.
- Discovery stays reviewed-adapter only, startup/explicit-refresh only; no remote catalog calls, login, auto-registration, or background writes.
- Agent Workflow still requires a separately configured local toolkitRoot; portable workflow YAML must never contain toolkit paths or commands.
- Conductor remains read-only and may not receive task, terminal, dispatch, or Decision Gate authority.

## Suggested vertical slices

1. **Configuration state and validation**
   - Define the empty/first-run state explicitly.
   - Add behavioral tests for an empty portable configuration and the transition to a valid role/profile pair.
2. **First profile creation UI**
   - Surface discovered, available providers/models as selectable inputs.
   - Create a named portable profile and role draft in the Inspector or a dedicated setup panel.
   - Do not persist until review/confirm.
3. **Agent Workflow onboarding**
   - Offer an intentional way to create or map the four required roles.
   - Explain the separate toolkitRoot prerequisite without exposing a raw toolkit path in project YAML.
4. **Verification**
   - Test a new project from no configuration through a populated role selector.
   - Test unavailable candidates and missing toolkit remediation.
   - Perform local Electron UI verification with Orca Computer Use.

## Current local state

- The Electron app was successfully built and opened.
- A real test workflow was saved at .orca/workflows/agent-workflow.yaml.
- .orca/ is untracked in the current worktree. It was created for this manual test; do not commit, delete, or modify it without deciding whether it should become an intentional example/fixture.
- The documentation branch is agent/korean-workflow-studio-docs; the Korean documentation PR was reported merged by the user.

## Historical next action — superseded

The current next action is Issue 03 in the continuation handoff above.
