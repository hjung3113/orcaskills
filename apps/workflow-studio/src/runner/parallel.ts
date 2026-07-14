import type { Workflow, WorkflowNode } from "../shared/workflow";
import type { RunnerDiagnostic, StructuredFieldMapping } from "./types";

type AccessMode = "read" | "write";
type WorktreeMode = "current" | "isolated";

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function outputNames(node: WorkflowNode): string[] {
  if (Array.isArray(node.outputs)) return node.outputs.filter((value): value is string => typeof value === "string");
  return asRecord(node.outputs) ? Object.keys(node.outputs as Record<string, unknown>) : [];
}

export function accessMode(node: WorkflowNode): AccessMode { return node.access === "write" ? "write" : "read"; }
export function worktreeMode(node: WorkflowNode): WorktreeMode {
  return node.worktree === "isolated" || node.worktreePolicy === "isolated" ? "isolated" : "current";
}

function children(workflow: Workflow): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const node of workflow.nodes) for (const dependency of node.dependsOn ?? []) {
    const next = result.get(dependency) ?? [];
    next.push(node.id); result.set(dependency, next);
  }
  return result;
}

function reaches(from: string, to: string, graph: Map<string, string[]>): boolean {
  const pending = [from]; const seen = new Set<string>(pending);
  while (pending.length) for (const child of graph.get(pending.shift()!) ?? []) {
    if (child === to) return true;
    if (!seen.has(child)) { seen.add(child); pending.push(child); }
  }
  return false;
}

/** Parses declarative input mappings, allowing only named structured outputs. */
export function inputMappings(node: WorkflowNode): StructuredFieldMapping[] {
  const inputs = asRecord(node.inputMappings) ?? asRecord(node.inputs);
  if (!inputs) return [];
  return Object.entries(inputs).flatMap(([input, value]) => {
    if (typeof value === "string") {
      const parts = value.split(".");
      return parts.length === 2 && parts.every(Boolean) ? [{ input, fromNodeId: parts[0], output: parts[1] }] : [];
    }
    const source = asRecord(value);
    const fromNodeId = typeof source?.fromNodeId === "string" ? source.fromNodeId : typeof source?.nodeId === "string" ? source.nodeId : undefined;
    const output = typeof source?.output === "string" ? source.output : typeof source?.field === "string" ? source.field : undefined;
    return fromNodeId && output ? [{ input, fromNodeId, output }] : [];
  });
}

interface ConditionRule { fromNodeId: string; field: string; equals: unknown; }
function conditionRule(node: WorkflowNode): ConditionRule | undefined {
  const source = asRecord(node.condition) ?? asRecord(node);
  const operand = asRecord(source?.operand);
  const fromNodeId = typeof operand?.fromNodeId === "string" ? operand.fromNodeId : typeof operand?.nodeId === "string" ? operand.nodeId : undefined;
  const field = typeof operand?.field === "string" ? operand.field : undefined;
  return fromNodeId && field && source && "equals" in source ? { fromNodeId, field, equals: source.equals } : undefined;
}

interface BranchRule { conditionId: string; equals: unknown; }
function branchRule(node: WorkflowNode): BranchRule | undefined {
  const branch = asRecord(node.branch);
  return branch && typeof branch.conditionId === "string" && "equals" in branch ? { conditionId: branch.conditionId, equals: branch.equals } : undefined;
}

/** Returns only branches whose condition has selected them; unknown results keep the graph previewable. */
export function selectedBranchNodeIds(workflow: Workflow, outputs: Record<string, Record<string, unknown>> = {}): Set<string> {
  const selected = new Map<string, unknown>();
  for (const condition of workflow.nodes.filter((node) => node.type === "condition")) {
    const rule = conditionRule(condition);
    if (rule && outputs[rule.fromNodeId]) selected.set(condition.id, outputs[rule.fromNodeId][rule.field] === rule.equals);
  }
  return new Set(workflow.nodes.filter((node) => {
    const branch = branchRule(node);
    return !branch || !selected.has(branch.conditionId) || selected.get(branch.conditionId) === branch.equals;
  }).map((node) => node.id));
}

/** Covers condition operands, auditable mappings, parallel joins, and concurrent writes. */
export function validateParallelWorkflow(workflow: Workflow): RunnerDiagnostic[] {
  const diagnostics: RunnerDiagnostic[] = [];
  const nodes = new Map(workflow.nodes.map((node) => [node.id, node]));
  const graph = children(workflow);
  for (const node of workflow.nodes) {
    if (node.type === "condition") {
      const rule = conditionRule(node);
      const source = rule && nodes.get(rule.fromNodeId);
      if (!rule || !source || source.type !== "agent" || !outputNames(source).includes(rule.field)) {
        diagnostics.push({ code: "condition", nodeId: node.id, message: `Condition \"${node.id}\" must compare a declared upstream structured output.` });
      }
    }
    for (const mapping of inputMappings(node)) {
      const source = nodes.get(mapping.fromNodeId);
      if (!source || source.type !== "agent" || !outputNames(source).includes(mapping.output)) {
        diagnostics.push({ code: "mapping", nodeId: node.id, message: `Input \"${mapping.input}\" references undeclared output \"${mapping.fromNodeId}.${mapping.output}\".` });
      } else if (!reaches(source.id, node.id, graph)) {
        diagnostics.push({ code: "mapping", nodeId: node.id, message: `Input \"${mapping.input}\" must reference an upstream node.` });
      }
    }
    const branch = branchRule(node);
    if (branch && nodes.get(branch.conditionId)?.type !== "condition") {
      diagnostics.push({ code: "condition", nodeId: node.id, message: `Branch references missing condition \"${branch.conditionId}\".` });
    }
  }
  for (const parallel of workflow.nodes.filter((node) => node.type === "parallel")) {
    const branchIds = Array.isArray(parallel.branches) ? parallel.branches.filter((value): value is string => typeof value === "string") : [];
    if (branchIds.length > 0 && (branchIds.length < 2 || branchIds.some((id) => !nodes.get(id)?.dependsOn?.includes(parallel.id)))) {
      diagnostics.push({ code: "parallel", nodeId: parallel.id, message: `Parallel \"${parallel.id}\" needs at least two declared direct branches.` });
    }
    if (branchIds.length > 1 && !workflow.nodes.some((node) => branchIds.every((id) => node.dependsOn?.includes(id)))) {
      diagnostics.push({ code: "parallel", nodeId: parallel.id, message: `Parallel \"${parallel.id}\" needs a join depending on every branch.` });
    }
  }
  const agents = workflow.nodes.filter((node) => node.type === "agent");
  for (let index = 0; index < agents.length; index += 1) for (const other of agents.slice(index + 1)) {
    const node = agents[index];
    const concurrent = workflow.nodes.some((parallel) => parallel.type === "parallel" && reaches(parallel.id, node.id, graph) && reaches(parallel.id, other.id, graph)
      && !reaches(node.id, other.id, graph) && !reaches(other.id, node.id, graph));
    if (concurrent && accessMode(node) === "write" && accessMode(other) === "write" && (worktreeMode(node) !== "isolated" || worktreeMode(other) !== "isolated")) {
      diagnostics.push({ code: "worktree-safety", nodeId: node.id, message: `Concurrent write nodes \"${node.id}\" and \"${other.id}\" must each use an isolated Worktree.` });
    }
  }
  return diagnostics;
}
