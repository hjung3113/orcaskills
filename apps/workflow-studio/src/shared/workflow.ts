export const nodeTypes = ["start", "agent", "approval", "condition", "parallel", "end"] as const;

export type WorkflowNodeType = (typeof nodeTypes)[number];

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  dependsOn?: string[];
  [key: string]: unknown;
}

export interface Workflow {
  id: string;
  name?: string;
  nodes: WorkflowNode[];
}

export interface Diagnostic {
  code: "yaml" | "shape" | "reference" | "cycle" | "reachability";
  message: string;
  line: number;
  column: number;
}

export interface WorkflowDocument {
  workflow?: Workflow;
  diagnostics: Diagnostic[];
}

export interface WorkflowFile {
  id: string;
  path: string;
}
