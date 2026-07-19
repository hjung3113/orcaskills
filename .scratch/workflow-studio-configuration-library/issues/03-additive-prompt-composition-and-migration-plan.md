# 03 implementation plan — additive instructions and explicit legacy migration

Status: Ready for implementation

This is the smallest vertical slice that changes new agent-node authoring without changing the meaning of an existing saved `prompt`. It follows the repository's stable boundary: YAML is parsed into `Workflow`, readiness validates the parsed shape, topology derives task/dispatch inputs, and execution sends those inputs through the Orca adapter.

## Outcome and non-goals

Newly authored agent nodes own `additionalInstructions`. At dispatch, their authored prompt is:

```
<role.intent>

<additionalInstructions>  // only when non-empty
```

`DispatchInput` remains the sole handoff channel. In particular, `rawOutput` and any upstream response text must never be concatenated into this prompt.

This issue does **not** reinterpret `node.prompt` at parse, save, readiness, preview, or run time. It does not change approval-node prompt behavior, profile selection, or configuration persistence semantics other than adding prompt-preset text in the follow-up preset contract.

## Minimal persisted contract

### New agent-node field

`additionalInstructions?: string`

- It is portable workflow YAML, node-owned, and is emitted by the existing generic serializer.
- Absent and `""` both mean no extra node instruction.
- It is meaningful only for agent nodes. Do not add it to an approval node as part of migration.
- `node.prompt?: string` remains the legacy replacement-prompt field. Its existing meaning is preserved until an explicit user-selected migration updates that node.

### Prompt presets

Extend `PortablePreset` with `instructions?: string` (or, if Issue 02 has already chosen a different exact field name, use that exact contract consistently). Applying the preset must copy this string to the target agent node's `additionalInstructions`, along with its current copied role/profile/model-policy values. Do not persist `presetId` on the node and do not keep a reference to the preset.

### Legacy migration record

Use a staged editor transformation, not a new runtime state:

1. Detect a legacy agent node when it has own string `prompt` and no own `additionalInstructions`.
2. Show it as a legacy replacement prompt and offer only explicit choices:
   - **Keep legacy prompt**: leave the YAML unchanged; it retains replacement behavior.
   - **Migrate to additional instructions**: stage `{ ...node, additionalInstructions: node.prompt }` and remove `prompt`.
3. Persist only through the normal workflow Save flow after the user applies that transformation.

This yields reviewable YAML diffs, works without a schema-version flag, and prevents accidental double dispatch semantics. Do not offer automatic migration merely on open, readiness, preview, or run.

## Options considered

| Option | Decision | Reason |
| --- | --- | --- |
| Treat legacy `prompt` as additive when present | Reject | Changes saved workflow behavior invisibly and violates ADR 0003. |
| Delete/rewrite legacy `prompt` on parse or save | Reject | Mutates data without user review and makes rollback difficult. |
| Add `promptMode` and migrate automatically | Reject for this slice | Extra persisted state does not solve the explicit-consent requirement. |
| Keep `prompt` legacy, add `additionalInstructions`, offer an explicit staged conversion | Recommend | Minimal, reversible before Save, deterministic, and preserves both agent and approval behavior. |

## Exact implementation seams

Implement in this order; keep each change independently testable.

1. **Shape and round-trip** — `apps/workflow-studio/src/shared/workflow.ts`, `apps/workflow-studio/src/shared/validation.ts`, and `apps/workflow-studio/src/shared/validation.test.ts`.
   - Document the two agent-node keys in `WorkflowNode` comments/type helpers if a typed helper is introduced; its open index otherwise already preserves arbitrary node fields.
   - Confirm `parseWorkflow(serializeWorkflow(workflow))` retains both `additionalInstructions` and an untouched legacy `prompt`.
   - Do not normalize, strip, or infer either field in `parseWorkflow`.

2. **Pure prompt composition** — `apps/workflow-studio/src/runner/workflow-topology.ts` plus focused topology tests (create `workflow-topology.test.ts` if one does not exist).
   - Replace the agent-only `promptFor(node, roleIntent)` branch with role intent plus a non-empty `additionalInstructions` joined using one fixed separator (recommend `"\n\n"`).
   - Its caller in `workflow-execution.ts` is agent-only; leave the two approval uses of `node.prompt` unchanged.
   - Never pass `DispatchInput`, `structuredContext`, `rawOutput`, or a conductor summary into `promptFor`.

3. **Preset copy and inspector** — `apps/workflow-studio/src/shared/config.ts`, `apps/workflow-studio/src/config/staging.ts`, `apps/workflow-studio/src/config/staging.test.ts`, and `apps/workflow-studio/src/renderer/main.tsx`.
   - Add optional preset instruction text and ensure configuration validation/copying preserves it.
   - In `applyPresetToSelectedNode`, write `additionalInstructions: applied.preset.instructions ?? existingNode.additionalInstructions` only if the confirmed product contract says an instruction-less preset must preserve existing instructions. Recommended simpler contract: applying a preset is an intentional full copy, so write its string (including `""`) and document that overwrite in the UI. Pick one behavior and lock it with a test before coding UI.
   - Rename the inspector's agent field to **Additional instructions** and explain that it is appended after the selected role's base instruction. Preserve the generic `Prompt` editor for approval nodes only (or render it conditionally by node type).
   - Add a legacy notice/action only for agent nodes matching the detection rule above. The action calls the normal in-memory `commit`, so it is staged until Save.

4. **End-to-end runner proof** — `apps/workflow-studio/src/runner/workflow-runner.test.ts`.
   - Assert the `create-task` and `dispatch` operation prompt is the composed authored prompt.
   - Assert preview/dispatch `input` remains structured and that serialized operations contain neither `rawOutput` nor instruction text derived from it.
   - Retain current approval prompt assertions or add a dedicated approval case to prevent its legacy contract from drifting.

## Focused behavioral test matrix

| Case | Setup | Expected proof |
| --- | --- | --- |
| Empty new node | role intent; no `additionalInstructions`; no legacy `prompt` | `promptFor` and both task/dispatch prompts equal role intent exactly. |
| Additional instruction | role intent + `additionalInstructions: "Check tests"` | prompt is `role intent + "\n\n" + "Check tests"` in that order. |
| Whitespace edge | empty or whitespace-only additional instructions | no dangling separator; decide whether whitespace is preserved or treated empty, then test the chosen deterministic rule. Recommended: trim only for emptiness but preserve authored non-empty text. |
| Structured handoff isolation | upstream `rawOutput`, outputs, artifacts, and input mappings | `DispatchInput` has only declared structured fields/mappings; task and dispatch prompt omit raw output. |
| Preset application | preset has role/profile/model policy/instructions; selected agent has another value | staged node gets copied values and instructions; node holds no preset id; later preset mutation cannot change node. |
| Legacy detection | agent has `prompt`, lacks `additionalInstructions` | inspector exposes migration choice; opening/checking/running does not mutate workflow. |
| Explicit migration | activate migration action then Save serialization | `prompt` removed, `additionalInstructions` equals original literal string, and subsequent agent execution composes role-first. |
| Keep legacy | decline/ignore migration | YAML and current replacement execution remain unchanged. |
| Approval regression | approval node has `prompt` | task prompt and approval gate continue using that prompt; it is not role-composed. |

## Focused verification sequence

1. Run the new/updated topology and staging tests first.
2. Run `apps/workflow-studio/src/shared/validation.test.ts` and `apps/workflow-studio/src/runner/workflow-runner.test.ts`.
3. Run the Workflow Studio package test/build commands defined in its `package.json`.
4. Check `git diff --check`; manually inspect one saved legacy YAML and one migrated YAML diff.

## Implementation guardrails

- ADR 0003 is the decision source: role base instruction precedes node additions; preset use is copy-on-apply; structured handoff is separate.
- Do not touch `.orca/`, generated outputs, or unrelated configuration onboarding work.
- Keep `promptFor` pure so the same deterministic rule is testable without the renderer or Orca adapter.
- Do not make a legacy workflow newly invalid solely because it uses `prompt`; migration is an authoring decision, not preflight coercion.
