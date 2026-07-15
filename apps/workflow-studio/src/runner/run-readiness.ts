import { createReadOnlyConductor } from "../config/conductor";
import { resolveNodeAgentProfile, validateConfiguration } from "../config/resolution";
import type { WorkflowConfiguration } from "../shared/config";
import { parseWorkflow, serializeWorkflow } from "../shared/validation";
import { AgentWorkflowToolkitAdapter } from "./agent-workflow";
import { validateParallelWorkflow } from "./parallel";
import { agentNodesInOrder, dispatchInput, nodeRoleId, worktreeMode } from "./workflow-topology";
import type { OrcaCliAdapter, PlannedOperation, PreflightResult, RunnerDiagnostic, WorkflowPreview, WorkflowRunnerRequest } from "./types";

export function isAgentWorkflow(request: WorkflowRunnerRequest): boolean {
  return request.workflow.runnerProfile === "agent-workflow" && request.workflow.template?.id === "agent-workflow";
}

export function resolvedWorkflowConfiguration(request: WorkflowRunnerRequest): WorkflowConfiguration {
  return {
    ...(Object.keys({ ...request.workflow.profileOverrides, ...request.workflowConfiguration.profileOverrides }).length
      ? { profileOverrides: { ...request.workflow.profileOverrides, ...request.workflowConfiguration.profileOverrides } } : {}),
    ...(Object.keys({ ...request.workflow.nodeProfileOverrides, ...request.workflowConfiguration.nodeProfileOverrides }).length
      ? { nodeProfileOverrides: { ...request.workflow.nodeProfileOverrides, ...request.workflowConfiguration.nodeProfileOverrides } } : {}),
    ...(request.workflowConfiguration.conductor ?? request.workflow.conductor
      ? { conductor: request.workflowConfiguration.conductor ?? request.workflow.conductor }
      : {}),
  };
}

export class RunReadiness {
  constructor(private readonly adapter: OrcaCliAdapter) {}

  async check(request: WorkflowRunnerRequest): Promise<PreflightResult> {
    const workflowConfiguration = resolvedWorkflowConfiguration(request);
    const diagnostics: RunnerDiagnostic[] = [];
    const parsed = parseWorkflow(serializeWorkflow(request.workflow));
    diagnostics.push(...parsed.diagnostics.map((diagnostic) => ({ code: "workflow" as const, message: diagnostic.message })));
    diagnostics.push(...validateConfiguration(request.portableConfiguration, workflowConfiguration, request.localConfiguration)
      .map((diagnostic) => ({ code: "configuration" as const, message: diagnostic.message })));
    diagnostics.push(...validateParallelWorkflow(request.workflow));
    if (!(await this.adapter.checkCli())) diagnostics.push({ code: "orca-cli", message: "Orca CLI is unavailable." });
    if (!(await this.adapter.checkRuntime())) diagnostics.push({ code: "orca-runtime", message: "Orca runtime is unavailable." });

    const resolvedProfileIds: Record<string, string> = {};
    for (const node of agentNodesInOrder(request)) {
      const roleId = nodeRoleId(node);
      if (!roleId) {
        diagnostics.push({ code: "agent-node", nodeId: node.id, message: `Agent node \"${node.id}\" needs a roleId.` });
        continue;
      }
      try {
        resolvedProfileIds[node.id] = resolveNodeAgentProfile(
          node.id, roleId, request.portableConfiguration, workflowConfiguration, request.localConfiguration,
        ).profile.id;
      } catch (error) {
        diagnostics.push({ code: "configuration", nodeId: node.id, message: error instanceof Error ? error.message : "Agent profile resolution failed." });
      }
    }
    if (workflowConfiguration.conductor?.enabled) {
      try { createReadOnlyConductor(workflowConfiguration.conductor); }
      catch (error) { diagnostics.push({ code: "configuration", message: error instanceof Error ? error.message : "Conductor configuration is invalid." }); }
    }
    if (isAgentWorkflow(request)) {
      const toolkit = new AgentWorkflowToolkitAdapter(request.localConfiguration.agentWorkflow);
      diagnostics.push(...(await toolkit.preflight()).map((message) => ({ code: "agent-node" as const, message })));
    }
    return { diagnostics, resolvedProfileIds, valid: diagnostics.length === 0 };
  }

  async preview(request: WorkflowRunnerRequest): Promise<WorkflowPreview> {
    const preflight = await this.check(request);
    if (!preflight.valid) return { preflight, operations: [] };
    const nodes = new Map(request.workflow.nodes.map((node) => [node.id, node]));
    const workflowConfiguration = resolvedWorkflowConfiguration(request);
    const operations: PlannedOperation[] = [];
    for (const node of agentNodesInOrder(request)) {
      const profileId = preflight.resolvedProfileIds[node.id];
      if (worktreeMode(node) === "isolated") operations.push({ kind: "prepare-worktree", nodeId: node.id, profileId });
      operations.push({ kind: "create-terminal", nodeId: node.id, profileId });
      operations.push({ kind: "create-task", nodeId: node.id, profileId, dependsOn: (node.dependsOn ?? []).filter((id) => nodes.get(id)?.type === "agent") });
      operations.push({ kind: "dispatch", nodeId: node.id, profileId, input: dispatchInput(node, nodes, workflowConfiguration, request) });
    }
    return { preflight, operations };
  }
}
