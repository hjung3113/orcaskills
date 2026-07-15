import { RunReadiness } from "./run-readiness";
import type { OrcaCliAdapter, PreflightResult, RunManifest, WorkflowPreview, WorkflowRunnerRequest } from "./types";
import { WorkflowExecution } from "./workflow-execution";

export class WorkflowPreflightError extends Error {
  constructor(readonly preflight: PreflightResult) {
    super(preflight.diagnostics.map((diagnostic) => diagnostic.message).join(" "));
    this.name = "WorkflowPreflightError";
  }
}

/** Stable execution interface; lifecycle mechanics remain internal collaborators. */
export class WorkflowRunner {
  private readonly readiness: RunReadiness;
  private readonly execution: WorkflowExecution;

  constructor(adapter: OrcaCliAdapter) {
    this.readiness = new RunReadiness(adapter);
    this.execution = new WorkflowExecution(adapter);
  }

  preflight(request: WorkflowRunnerRequest): Promise<PreflightResult> {
    return this.readiness.check(request);
  }

  preview(request: WorkflowRunnerRequest): Promise<WorkflowPreview> {
    return this.readiness.preview(request);
  }

  async run(request: WorkflowRunnerRequest): Promise<{ manifest: RunManifest; manifestPath: string }> {
    const preview = await this.preview(request);
    if (!preview.preflight.valid) throw new WorkflowPreflightError(preview.preflight);
    return this.execution.execute(request);
  }
}
