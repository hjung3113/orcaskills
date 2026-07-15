import type { LocalConfiguration } from "../config/local";
import type { PortableConfiguration, WorkflowConfiguration } from "../shared/config";
import type { Workflow } from "../shared/workflow";
import type { AgentWorkflowIdentity, VerificationEvidence } from "./agent-workflow";

export interface StructuredHandoff {
  fromNodeId: string;
  fields: string[];
  artifactReferences: string[];
}

/** Explicit input-to-output mapping; raw agent output is never a mapping source. */
export interface StructuredFieldMapping {
  input: string;
  fromNodeId: string;
  output: string;
}

export interface DispatchInput {
  structuredContext: StructuredHandoff[];
  inputMappings?: StructuredFieldMapping[];
  conductorHandoffSummary?: string;
}

export type AgentOutcome =
  | { status: "completed" }
  | { status: "failed"; reason: string }
  | { status: "escalated"; reason: string };

/** Resolution data is read from Orca; the runner never writes a resolution. */
export type GateResolution =
  | { action: "approved" }
  | { action: "retry" }
  | { action: "replace-profile"; profileId: string }
  | { action: "terminate"; reason?: string };

export interface DecisionGateInput {
  taskId: string;
  nodeId: string;
  question: string;
  options: GateResolution["action"][];
}

export interface OrcaCliAdapter {
  checkCli(): Promise<boolean>;
  checkRuntime(): Promise<boolean>;
  prepareWorktree(input: { projectPath: string; name: string }): Promise<{ worktreeId: string }>;
  createTerminal(input: { projectPath: string; nodeId: string; command: string; worktreeId?: string }): Promise<{ terminalId: string }>;
  createTask(input: { workflowId: string; nodeId: string; prompt: string; dependsOn: string[] }): Promise<{ taskId: string }>;
  dispatchTask(input: { taskId: string; terminalId: string; prompt: string; input: DispatchInput }): Promise<{ dispatchId: string }>;
  createDecisionGate(input: DecisionGateInput): Promise<{ gateId: string }>;
  waitForTaskOutcome(input: { taskId: string; dispatchId: string }): Promise<AgentOutcome>;
  waitForGateResolution(input: { gateId: string }): Promise<GateResolution>;
  /** Read-only inspection used by the project-local workflow command. */
  listDecisionGates?(): Promise<DecisionGateStatus[]>;
  closeTerminal?(terminalId: string): Promise<void>;
  removeWorktree?(worktreeId: string): Promise<void>;
}

export interface WorkflowRunnerRequest {
  projectPath: string;
  workflow: Workflow;
  portableConfiguration: PortableConfiguration;
  workflowConfiguration: WorkflowConfiguration;
  localConfiguration: LocalConfiguration;
  /** Supplied by a read-only Conductor; omitted unless Conductor is enabled. */
  conductorHandoffSummary?: string;
  /** Structured results available for condition branch selection. */
  conditionOutputs?: Record<string, Record<string, unknown>>;
  /** Test seam; production loads the canonical `.review` artifact after verification. */
  agentWorkflowEvidence?: VerificationEvidence;
  /** Test seam; production resolves branch and head from the prepared worktree. */
  agentWorkflowIdentity?: AgentWorkflowIdentity;
}

export type RunnerDiagnosticCode = "workflow" | "configuration" | "orca-cli" | "orca-runtime" | "agent-node" | "condition" | "mapping" | "parallel" | "worktree-safety";

export interface RunnerDiagnostic {
  code: RunnerDiagnosticCode;
  message: string;
  nodeId?: string;
}

export interface PreflightResult {
  diagnostics: RunnerDiagnostic[];
  resolvedProfileIds: Record<string, string>;
  valid: boolean;
}

export interface PlannedOperation {
  kind: "prepare-worktree" | "create-terminal" | "create-task" | "dispatch";
  nodeId: string;
  dependsOn?: string[];
  profileId?: string;
  input?: DispatchInput;
}

export interface WorkflowPreview {
  preflight: PreflightResult;
  operations: PlannedOperation[];
}

export interface RunManifestNode {
  nodeId: string;
  profileId: string;
  taskId: string;
  terminalId: string;
  dispatchId: string;
  worktreeId?: string;
}

export interface RunManifestPause {
  nodeId: string;
  kind: "approval" | "failure" | "escalation";
  reason: string;
  gateId: string;
  resolution: GateResolution["action"];
  profileId?: string;
}

export interface RunManifestActivePause {
  nodeId: string;
  kind: RunManifestPause["kind"];
  reason: string;
  gateId: string;
}

export interface DecisionGateStatus {
  gateId: string;
  status: "pending" | "resolved";
  resolution?: GateResolution["action"];
}

export interface RunManifest {
  runId: string;
  workflowId: string;
  createdAt: string;
  nodes: RunManifestNode[];
  pauses: RunManifestPause[];
  activePause?: RunManifestActivePause;
  status: "running" | "completed" | "terminated";
  agentWorkflow?: {
    templateVersion: 1;
    identity: AgentWorkflowIdentity;
    resourceLease: { evidenceDirectory: string; worktreeId?: string; terminalIds: string[] };
    evidence: { valid: boolean; reason?: string; path: string };
    cleanup?: { completedAt: string; releasedResources: boolean; evidenceArchived: boolean };
  };
}
