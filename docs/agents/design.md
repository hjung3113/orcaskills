# Feature Design Docs

## Purpose and location

Use `.scratch/<feature-slug>/design.md` as the living technical bridge from product intent to implementation. Create it before implementation when a change is cross-cutting, spans multiple tickets, changes a user interaction or information architecture, introduces a state model, or needs a prototype to settle a question. Do not create one for a small, local fix with an already-clear design.

The design doc complements existing sources of truth:

- `prd.md` explains the user and product problem when it exists.
- `spec.md` defines delivery scope and ticket-level acceptance.
- `design.md` explains the selected approach and its trade-offs.
- `docs/adr/` records an accepted, durable architectural decision that would be costly or surprising to reverse.

Keep the document short and current. Link instead of copying requirements, ticket checklists, or implementation code.

## Consumer rules

Before a design-affecting change, read `CONTEXT.md`, applicable ADRs, the feature's `spec.md`, and its `design.md` when present. A ticket should link to the exact design section it implements. Update the design when the selected approach, interaction, invariant, or verification plan changes; use an ADR rather than rewriting history when the change settles a durable architectural trade-off.

When a prototype is used, state the question, its location or branch, variants considered, and the verdict. Only the validated decision enters production work; the prototype itself remains disposable.

## Template

```md
# <Feature> design

Status: Draft | Accepted | Superseded

## Links

- PRD: [prd.md](./prd.md) (if present)
- Spec: [spec.md](./spec.md)
- Related issues: [01-...](./issues/01-...md)
- Context and ADRs: `CONTEXT.md`, `docs/adr/<id>.md`
- Prototype: path or branch (if used)

## Decision summary

One paragraph: the chosen approach, the user outcome, and the principal trade-off.

## Goals and non-goals

- Goals: observable outcomes this design must achieve.
- Non-goals: nearby work deliberately excluded from this feature.

## Constraints and invariants

List domain, compatibility, authority, accessibility, persistence, or performance boundaries that must remain true.

## Options considered

| Option | Benefits | Costs | Decision |
| --- | --- | --- | --- |
| <option> | <benefits> | <costs> | Chosen / Rejected |

## Proposed design

Describe only the applicable parts: boundaries and ownership; state/data/API changes; user flows and UI states; failure, unavailable, and empty states; migration or compatibility behavior. Include a small diagram only when it clarifies a relationship.

## Prototype question and verdict

State the question, alternatives, evidence, and decision. Omit this section when no prototype was needed.

## Delivery and verification

Map design sections to issues, focused tests, manual UI checks, and any migration or rollout evidence.

## Open questions and ADR triggers

List unresolved questions with an owner or next action. Identify any decision that needs an ADR once accepted.
```

## References

This compact form follows the same separation used by GitLab's versioned, living design documents and by ADR guidance: describe motivation, goals, proposal, details, and alternatives in the feature design; preserve the context, decision, and consequences of durable architecture choices in ADRs.

- [GitLab design-document template](https://handbook.gitlab.com/handbook/engineering/architecture/design-documents/_template/)
- [GitLab architecture workflow](https://handbook.gitlab.com/handbook/engineering/architecture/workflow/)
- [AWS ADR process](https://docs.aws.amazon.com/prescriptive-guidance/latest/architectural-decision-records/adr-process.html)
