import type { Diagnostic, Workflow, WorkflowNode } from "./workflow";

export const agentWorkflowStageIds = ["architect", "implement", "review", "verify", "release"] as const;
export type AgentWorkflowStageId = (typeof agentWorkflowStageIds)[number];

const stages: ReadonlyArray<Pick<WorkflowNode, "id" | "type" | "dependsOn"> & Record<string, unknown>> = [
  { id: "start", type: "start" },
  { id: "architect", type: "agent", roleId: "architect", name: "ARCHITECT", dependsOn: ["start"], outputs: ["design"] },
  { id: "implement", type: "agent", roleId: "implementer", name: "CODEX implementation", dependsOn: ["architect"], worktree: "isolated", outputs: ["implementation"] },
  { id: "review", type: "agent", roleId: "reviewer", name: "REVIEWER", dependsOn: ["implement"], outputs: ["review"] },
  { id: "verify", type: "agent", roleId: "verifier", name: "VERIFIER", dependsOn: ["review"], outputs: ["verification-evidence"] },
  { id: "release", type: "approval", name: "Release Captain decision", dependsOn: ["verify"], prompt: "Release Captain: review valid VERIFIER evidence before deciding." },
  { id: "end", type: "end", dependsOn: ["release"] },
];

export function createAgentWorkflow(issueNumber = 1): Workflow {
  return {
    id: "agent-workflow",
    name: "Agent Workflow",
    runnerProfile: "agent-workflow",
    template: { id: "agent-workflow", version: 1, issueNumber },
    nodes: stages.map((stage) => ({ ...stage, dependsOn: stage.dependsOn ? [...stage.dependsOn] : undefined })),
  };
}

function diagnostic(message: string): Diagnostic {
  return { code: "shape", message, line: 1, column: 1 };
}

/** Semantic constraints for the intentionally non-generic Agent Workflow template. */
export function validateAgentWorkflow(workflow: Workflow): Diagnostic[] {
  if (workflow.runnerProfile !== "agent-workflow" && workflow.template?.id !== "agent-workflow") return [];
  const diagnostics: Diagnostic[] = [];
  if (workflow.runnerProfile !== "agent-workflow" || workflow.template?.id !== "agent-workflow") {
    diagnostics.push(diagnostic("Agent Workflow requires both its template reference and agent-workflow runner profile."));
    return diagnostics;
  }
  if (!Number.isInteger(workflow.template.issueNumber) || workflow.template.issueNumber < 1) {
    diagnostics.push(diagnostic("Agent Workflow requires a positive template issueNumber for verifier evidence."));
  }
  const byId = new Map(workflow.nodes.map((node) => [node.id, node]));
  const required: Record<AgentWorkflowStageId, { type: WorkflowNode["type"]; roleId?: string; dependsOn?: string; }> = {
    architect: { type: "agent", roleId: "architect", dependsOn: "start" },
    implement: { type: "agent", roleId: "implementer", dependsOn: "architect" },
    review: { type: "agent", roleId: "reviewer", dependsOn: "implement" },
    verify: { type: "agent", roleId: "verifier", dependsOn: "review" },
    release: { type: "approval", dependsOn: "verify" },
  };
  for (const [id, contract] of Object.entries(required)) {
    const node = byId.get(id);
    if (!node || node.type !== contract.type) { diagnostics.push(diagnostic(`Agent Workflow requires ${id} as a ${contract.type} stage.`)); continue; }
    if (contract.roleId && node.roleId !== contract.roleId) diagnostics.push(diagnostic(`Agent Workflow ${id} must use roleId ${contract.roleId}.`));
    if (contract.dependsOn && !(node.dependsOn ?? []).includes(contract.dependsOn)) diagnostics.push(diagnostic(`Agent Workflow ${id} must depend on ${contract.dependsOn}.`));
  }
  if (byId.get("implement")?.worktree !== "isolated") diagnostics.push(diagnostic("Agent Workflow CODEX implementation must use an isolated worktree."));
  const roleIds = agentWorkflowStageIds.slice(0, 4).map((id) => byId.get(id)?.roleId);
  if (new Set(roleIds).size !== roleIds.length) diagnostics.push(diagnostic("Agent Workflow ARCHITECT, CODEX, REVIEWER, and VERIFIER must use separate roles."));
  return diagnostics;
}
