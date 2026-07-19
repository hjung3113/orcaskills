# Workflow Studio UI Consistency

## Read before renderer work

Read `CONTEXT.md`, the relevant feature design and issue, then `apps/workflow-studio/src/renderer/main.tsx` and `styles.css`. Treat current rendered behavior and its focused tests as the implementation baseline; do not introduce a parallel visual system for a local feature.

## Shared composition and vocabulary

- The primary Studio composition is a header above a three-column workspace: collapsible outline, canvas or central work surface, and persistent Inspector.
- Reuse the existing vocabulary and primitives: `eyebrow` for contextual labels, `quiet-action` for secondary actions, `save-action` for the primary persist action, status/readiness surfaces for validation, and explicit unavailable, blocked, empty, and not-yet-checked states.
- Keep technical values derived or selected from known candidates; people should interact with semantic names, roles, and explanations rather than raw identifiers where the product already supports this.
- Configuration changes are staged first, then reviewed, then confirmed before persistence. A new flow must not bypass this boundary or hide the next action after a blocked or unavailable state.

## Interaction and accessibility

- Preserve a visible primary action and a clear status or remediation path for every state.
- Use real labels, `aria-label`s for icon-only or ambiguous controls, and `aria-live` for status that changes asynchronously. Keep keyboard and focus behavior coherent with the surrounding surface.
- Prefer extending an existing component, class, and action hierarchy over adding a one-off button, panel, colour meaning, or notification pattern.

## Prototype and validation

Prototype only a genuine structural choice. Put the question and materially different variants near the candidate UI, use read-only/stubbed mutations by default, and record the winning verdict in `design.md` or the relevant issue before production implementation.

For an implemented UI change, run the focused tests and typecheck. Manually verify the default, empty, unavailable/blocked, validation-error, and success/review states affected by the ticket; build when the changed surface warrants it.
