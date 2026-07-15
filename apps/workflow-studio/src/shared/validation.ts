import { parseDocument, stringify } from "yaml";
import type { Diagnostic, Workflow, WorkflowDocument, WorkflowNode } from "./workflow";
import { nodeTypes } from "./workflow";
import { validateAgentWorkflow } from "./agent-workflow";
import type { NodeProfileOverride } from "./config";

const nodeTypeSet = new Set<string>(nodeTypes);

function location(source: string, needle?: string): Pick<Diagnostic, "line" | "column"> {
  const offset = needle ? source.indexOf(needle) : 0;
  const before = source.slice(0, Math.max(0, offset));
  return { line: before.split("\n").length, column: before.length - before.lastIndexOf("\n") };
}

function diagnostic(
  source: string,
  code: Diagnostic["code"],
  message: string,
  needle?: string,
): Diagnostic {
  return { code, message, ...location(source, needle) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsedWorkflowConfiguration(value: Record<string, unknown>): Pick<Workflow, "conductor" | "profileOverrides" | "nodeProfileOverrides"> {
  const profileOverrides = isRecord(value.profileOverrides)
    ? Object.fromEntries(Object.entries(value.profileOverrides).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
    : undefined;
  const nodeProfileOverrides = isRecord(value.nodeProfileOverrides)
    ? Object.fromEntries(Object.entries(value.nodeProfileOverrides).flatMap(([nodeId, override]) => {
      if (!isRecord(override) || typeof override.profileId !== "string") return [];
      const modelPolicy = isRecord(override.modelPolicy) && (override.modelPolicy.kind === "provider-default" || (override.modelPolicy.kind === "exact" && typeof override.modelPolicy.modelId === "string"))
        ? override.modelPolicy as NodeProfileOverride["modelPolicy"] : undefined;
      return [[nodeId, { profileId: override.profileId, ...(modelPolicy ? { modelPolicy } : {}) }]];
    }))
    : undefined;
  const conductor = isRecord(value.conductor) && typeof value.conductor.enabled === "boolean"
    ? { enabled: value.conductor.enabled, ...(typeof value.conductor.profileId === "string" ? { profileId: value.conductor.profileId } : {}) }
    : undefined;
  return {
    ...(profileOverrides && Object.keys(profileOverrides).length ? { profileOverrides } : {}),
    ...(nodeProfileOverrides && Object.keys(nodeProfileOverrides).length ? { nodeProfileOverrides } : {}),
    ...(conductor ? { conductor } : {}),
  };
}

function validateGraph(workflow: Workflow, source: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const byId = new Map<string, WorkflowNode>();

  for (const node of workflow.nodes) {
    if (!node.id || typeof node.id !== "string") {
      diagnostics.push(diagnostic(source, "shape", "Each node needs a non-empty string id."));
      continue;
    }
    if (byId.has(node.id)) {
      diagnostics.push(diagnostic(source, "shape", `Node id "${node.id}" is duplicated.`, node.id));
      continue;
    }
    byId.set(node.id, node);
    if (!nodeTypeSet.has(node.type)) {
      diagnostics.push(diagnostic(source, "shape", `Node "${node.id}" has unsupported type "${String(node.type)}".`, node.id));
    }
    if (node.dependsOn !== undefined && (!Array.isArray(node.dependsOn) || node.dependsOn.some((id) => typeof id !== "string"))) {
      diagnostics.push(diagnostic(source, "shape", `Node "${node.id}" must use a list of dependency ids.`, node.id));
    }
  }

  for (const node of workflow.nodes) {
    for (const dependency of node.dependsOn ?? []) {
      if (!byId.has(dependency)) {
        diagnostics.push(diagnostic(source, "reference", `Node "${node.id}" depends on missing node "${dependency}".`, dependency));
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): void => {
    if (visiting.has(id)) {
      diagnostics.push(diagnostic(source, "cycle", `Cycle detected through node "${id}".`, id));
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of byId.get(id)?.dependsOn ?? []) if (byId.has(dependency)) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of byId.keys()) visit(id);

  const starts = [...byId.values()].filter((node) => node.type === "start");
  const ends = [...byId.values()].filter((node) => node.type === "end");
  if (starts.length === 0) diagnostics.push(diagnostic(source, "reachability", "A workflow needs a Start node."));
  if (ends.length === 0) diagnostics.push(diagnostic(source, "reachability", "A workflow needs an End node."));

  const children = new Map<string, string[]>();
  for (const node of byId.values()) {
    for (const dependency of node.dependsOn ?? []) {
      const next = children.get(dependency) ?? [];
      next.push(node.id);
      children.set(dependency, next);
    }
  }
  const reachable = new Set<string>(starts.map((node) => node.id));
  const queue = [...reachable];
  while (queue.length) {
    const id = queue.shift()!;
    for (const child of children.get(id) ?? []) {
      if (!reachable.has(child)) {
        reachable.add(child);
        queue.push(child);
      }
    }
  }
  for (const end of ends) {
    if (!reachable.has(end.id)) {
      diagnostics.push(diagnostic(source, "reachability", `End node "${end.id}" is not reachable from a Start node.`, end.id));
    }
  }
  diagnostics.push(...validateAgentWorkflow(workflow));
  return diagnostics;
}

export function parseWorkflow(source: string): WorkflowDocument {
  const document = parseDocument(source);
  if (document.errors.length > 0) {
    return {
      diagnostics: document.errors.map((error) => {
        const position = typeof error.pos?.[0] === "number" ? error.pos[0] : 0;
        const before = source.slice(0, position);
        return {
          code: "yaml" as const,
          message: error.message,
          line: before.split("\n").length,
          column: position - before.lastIndexOf("\n"),
        };
      }),
    };
  }
  const value: unknown = document.toJS();
  if (!isRecord(value) || typeof value.id !== "string" || !Array.isArray(value.nodes)) {
    return { diagnostics: [diagnostic(source, "shape", "A workflow needs a string id and a nodes list.")] };
  }
  if (!value.nodes.every(isRecord)) {
    return { diagnostics: [diagnostic(source, "shape", "Each workflow node must be an object.")] };
  }
  const workflow: Workflow = {
    id: value.id,
    ...(typeof value.name === "string" ? { name: value.name } : {}),
    nodes: value.nodes.map((node) => ({ ...node, id: String(node.id ?? ""), type: String(node.type ?? "") as WorkflowNode["type"] })),
    ...(value.runnerProfile === "generic" || value.runnerProfile === "agent-workflow" ? { runnerProfile: value.runnerProfile } : {}),
    ...(isRecord(value.template) && value.template.id === "agent-workflow" && value.template.version === 1 && typeof value.template.issueNumber === "number"
      ? { template: { id: "agent-workflow", version: 1, issueNumber: value.template.issueNumber } } : {}),
    ...parsedWorkflowConfiguration(value),
  };
  return { workflow, diagnostics: validateGraph(workflow, source) };
}

export function serializeWorkflow(workflow: Workflow): string {
  return stringify(workflow, { lineWidth: 0 });
}
