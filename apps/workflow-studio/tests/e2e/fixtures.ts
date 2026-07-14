import type { Workflow } from "../../src/shared/workflow";
import type { WorkflowRunnerRequest } from "../../src/runner";

export const representativeConfiguration = {
  portableConfiguration: {
    roles: [
      { id: "designer", intent: "Produce a bounded design", profileId: "safe" },
      { id: "implementer", intent: "Implement the approved design", profileId: "safe" },
      { id: "reviewer", intent: "Review the implementation", profileId: "safe" },
    ],
    profiles: [{ id: "safe", provider: "mock-agent", model: "safe-v1" }],
  },
  workflowConfiguration: {},
  localConfiguration: { providers: { "mock-agent": { enabled: true, executablePath: "mock-agent" } } },
};

export const designApprovalWorkflow: Workflow = {
  id: "design-approval-implementation-review",
  nodes: [
    { id: "start", type: "start" },
    { id: "design", type: "agent", roleId: "designer", dependsOn: ["start"], outputs: ["plan"], artifactReferences: ["design.md"] },
    { id: "approval", type: "approval", dependsOn: ["design"], prompt: "Approve the design before implementation?" },
    { id: "implementation", type: "agent", roleId: "implementer", dependsOn: ["approval"], inputs: { approvedPlan: "design.plan" }, outputs: ["summary"], artifactReferences: ["implementation.md"] },
    { id: "review", type: "agent", roleId: "reviewer", dependsOn: ["implementation"], inputs: { implementationSummary: "implementation.summary" } },
    { id: "end", type: "end", dependsOn: ["review"] },
  ],
};

export const isolatedParallelWriteWorkflow: Workflow = {
  id: "isolated-parallel-writes",
  nodes: [
    { id: "start", type: "start" },
    { id: "parallel", type: "parallel", dependsOn: ["start"], branches: ["frontend", "backend"] },
    { id: "frontend", type: "agent", roleId: "implementer", access: "write", worktree: "isolated", dependsOn: ["parallel"], outputs: ["uiSummary"], artifactReferences: ["ui.patch"] },
    { id: "backend", type: "agent", roleId: "implementer", access: "write", worktree: "isolated", dependsOn: ["parallel"], outputs: ["apiSummary"], artifactReferences: ["api.patch"] },
    { id: "integration-review", type: "agent", roleId: "reviewer", dependsOn: ["frontend", "backend"], inputMappings: { ui: "frontend.uiSummary", api: "backend.apiSummary" } },
    { id: "end", type: "end", dependsOn: ["integration-review"] },
  ],
};

export function runnerRequest(projectPath: string, workflow: Workflow): WorkflowRunnerRequest {
  return { projectPath, workflow, ...representativeConfiguration };
}
