# Additive prompt composition and copy-on-apply prompt presets

Workflow Studio will preserve role ownership of an agent's base instruction and model node-specific authoring as additional instructions. A prompt preset copies text into that node-owned field, while structured upstream handoff remains a separate runner input; no node retains a live preset binding.

## Consequences

- A node may refine a role but cannot silently discard the role's base instruction.
- Editing or deleting a prompt preset never mutates a workflow that already applied it.
- Legacy `prompt` replacement behavior needs an explicit, reviewable migration rather than an ambiguous reinterpretation at run time.
- Raw upstream output is not concatenated into authored instructions; declared fields and artifact references remain structured handoff metadata.
