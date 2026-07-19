import type { WorkflowConfiguration } from "../shared/config";
import type { WorkflowNode } from "../shared/workflow";
import { inputMappings, selectedBranchNodeIds, worktreeMode } from "./parallel";
import type { DispatchInput, StructuredHandoff, WorkflowRunnerRequest } from "./types";

export function nodeRoleId(node: WorkflowNode): string | undefined {
  return typeof node.roleId === "string" ? node.roleId : typeof node.role === "string" ? node.role : undefined;
}

function asStrings(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (value && typeof value === "object") return Object.keys(value as Record<string, unknown>);
  return [];
}

function nodesInDependencyOrder(request: WorkflowRunnerRequest, include: (node: WorkflowNode, selected: Set<string>) => boolean): WorkflowNode[] {
  const byId = new Map(request.workflow.nodes.map((node) => [node.id, node]));
  const selected = selectedBranchNodeIds(request.workflow, request.conditionOutputs);
  const visited = new Set<string>();
  const ordered: WorkflowNode[] = [];
  const visit = (node: WorkflowNode): void => {
    if (visited.has(node.id)) return;
    visited.add(node.id);
    for (const dependency of node.dependsOn ?? []) {
      const upstream = byId.get(dependency);
      if (upstream) visit(upstream);
    }
    if (include(node, selected)) ordered.push(node);
  };
  for (const node of request.workflow.nodes) visit(node);
  return ordered;
}

export function agentNodesInOrder(request: WorkflowRunnerRequest): WorkflowNode[] {
  return nodesInDependencyOrder(request, (node, selected) => node.type === "agent" && selected.has(node.id));
}

export function executableNodesInOrder(request: WorkflowRunnerRequest): WorkflowNode[] {
  return nodesInDependencyOrder(request, (node, selected) => (node.type === "agent" && selected.has(node.id)) || node.type === "approval");
}

export function structuredContext(node: WorkflowNode, allNodes: Map<string, WorkflowNode>): StructuredHandoff[] {
  const seen = new Set<string>();
  const agents: WorkflowNode[] = [];
  const visit = (id: string): void => {
    if (seen.has(id)) return;
    seen.add(id);
    const upstream = allNodes.get(id);
    if (!upstream) return;
    if (upstream.type === "agent") agents.push(upstream);
    else for (const dependency of upstream.dependsOn ?? []) visit(dependency);
  };
  for (const dependency of node.dependsOn ?? []) visit(dependency);
  return agents.map((upstream) => ({
    fromNodeId: upstream.id,
    fields: asStrings(upstream.outputs),
    artifactReferences: asStrings(upstream.artifactReferences),
  }));
}

export function dispatchInput(
  node: WorkflowNode,
  nodes: Map<string, WorkflowNode>,
  workflowConfiguration: WorkflowConfiguration,
  request: WorkflowRunnerRequest,
): DispatchInput {
  return {
    structuredContext: structuredContext(node, nodes),
    ...(inputMappings(node).length ? { inputMappings: inputMappings(node) } : {}),
    ...(workflowConfiguration.conductor?.enabled && request.conductorHandoffSummary
      ? { conductorHandoffSummary: request.conductorHandoffSummary }
      : {}),
  };
}

export function commandFor(node: WorkflowNode, executablePath?: string): string {
  return typeof node.command === "string" ? node.command : executablePath ?? "orca-agent";
}

export function promptFor(node: WorkflowNode, roleIntent: string): string {
  // A persisted legacy prompt remains a full replacement until the author
  // explicitly stages its migration in the Inspector.
  if (typeof node.prompt === "string") return node.prompt;
  const additionalInstructions = typeof node.additionalInstructions === "string" ? node.additionalInstructions : "";
  return additionalInstructions.trim() ? `${roleIntent}\n\n${additionalInstructions}` : roleIntent;
}

export { worktreeMode };
