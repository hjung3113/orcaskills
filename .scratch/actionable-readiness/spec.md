# Actionable Readiness delivery specification

## Workflow

```text
Draft edit / project change / saved configuration change
  -> clear checked result and node badges
  -> explicit Check readiness
  -> service parses Draft execution request and reads local configuration
  -> runner preflight returns diagnostics with optional nodeId
  -> renderer classifies blockers and badges
  -> author selects an actionable blocker
  -> canvas focuses the exact node and Inspector opens
```

## Boundary contract

```ts
preview(projectPath: string, source: string): Promise<WorkflowPreview>
run(projectPath: string, source: string): Promise<{ manifest: RunManifest; manifestPath: string }>
```

`WorkflowStudioService` owns source parsing, `readPortableConfiguration`, and `readLocalConfiguration`. It returns invalid-source preflight results rather than constructing a raw runner request in the renderer.

## Readiness view model

```ts
interface ReadinessBlocker {
  message: string;
  scope: string;
  nextAction: string;
  nodeId?: string;
}
```

`nodeId` is retained only when it names a node in the current workflow. Static diagnostics receive a node identifier only when parser validation can identify one deterministically; otherwise they remain workflow-scoped.

## Evaluation method

Score each scorecard row only from committed tests, build output, and the five documented scenarios. If a mandatory minimum fails, the total cannot pass even if the arithmetic exceeds 90.
