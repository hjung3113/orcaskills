# Refactor evaluation rubric

The evaluator must start in a fresh agent context, remain read-only, inspect the current HEAD and working tree, run the baseline gates, and cite evidence for every deduction.

## Score (100)

- Recurring-change pressure: 20 (commit-touch evidence 10; branch-diff concentration 10)
- Current friction removed: 20 (navigation 5; mixed lifecycle responsibilities 5; locality leakage 5; deletion-test improvement 5)
- Target module depth: 20 (simple interface 5; hidden complexity 5; leverage 5; concentrated complexity 5)
- Testability: 15 (interface as test surface 5; refactor-resistant behavior tests 5; exercisable failures 5)
- Domain and ADR fit: 15 (domain language 5; ADR preservation 5; authority boundary preservation 5)
- Migration safety: 10 (incremental green slices 4; no behavior/schema drift 3; reviewable rollback 3)

## Caps and disqualifiers

- Maximum 98 if any qualitative point rests only on intuition.
- Maximum 94 without repeated hotspot evidence.
- Maximum 89 for a hypothetical seam with one real consumer.
- Maximum 79 if tests do not exercise the proposed public interface.
- Maximum 69 if an ADR is contradicted without an explicit reopen decision.
- Score 0 for disguised behavior change, portable local commands/paths, weakened Orca or Release Captain authority, background/auto-remediation discovery, credential or remote-catalog access, an unclean verification baseline, or evaluator participation in implementation.

## Mandatory gates

`npm test`, `npm run typecheck`, and `npm run build` must pass. The evaluator must also inspect `git diff --check` and report the exact working-tree scope.

