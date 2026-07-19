# 03 - Additive prompt composition and legacy migration

Status: Done

Make agent prompt construction explicit: role base instruction plus node additional instructions, with structured upstream handoff still passed separately. Provide a reviewable migration path for legacy replacement prompts.

## Acceptance criteria

- New Inspector language calls the field Additional instructions and explains its additive behavior.
- Applying a prompt preset copies its instruction text into the selected node's additional instructions and leaves no live preset binding.
- `promptFor` (or its replacement) composes the role base instruction before additional instructions for newly authored nodes.
- Structured handoff stays in `DispatchInput`; tests prove raw upstream output is not appended to authored instructions.
- A persisted legacy `prompt` is recognized deterministically and the user can choose an explicit staged migration before it receives additive semantics.
- Runner and topology tests cover empty/additional/preset/migrated cases and maintain existing approval-node prompt behavior.

## Comments

- Do not silently change the semantics of an existing saved workflow merely because it is opened or run.
- Implemented additive agent composition as `role intent + "\n\n" + additionalInstructions`, while retaining an existing legacy `prompt` as the replacement instruction until the user stages migration.
- The Inspector now exposes **Additional instructions**, copies prompt-preset text into that node-owned field, and offers a staged legacy migration action. Approval nodes retain the existing `Prompt` editor and behavior.
- Verification: focused topology/staging/validation/runner/approval suite (30 tests), full Workflow Studio suite (71 tests), typecheck, production build, and `git diff --check` all passed.
