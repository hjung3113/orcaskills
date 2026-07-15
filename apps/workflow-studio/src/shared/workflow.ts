export const nodeTypes = ["start", "agent", "approval", "condition", "parallel", "end"] as const;

export type WorkflowNodeType = (typeof nodeTypes)[number];

export const runnerProfiles = ["generic", "agent-workflow"] as const;
export type RunnerProfile = (typeof runnerProfiles)[number];

export interface WorkflowTemplateReference {
  id: "agent-workflow";
  version: 1;
  /** GitHub/local issue number used to bind verifier evidence. */
  issueNumber: number;
}

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  dependsOn?: string[];
  [key: string]: unknown;
}

export interface Workflow extends WorkflowConfiguration {
  id: string;
  name?: string;
  nodes: WorkflowNode[];
  runnerProfile?: RunnerProfile;
  template?: WorkflowTemplateReference;
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
import type { WorkflowConfiguration } from "./config";
