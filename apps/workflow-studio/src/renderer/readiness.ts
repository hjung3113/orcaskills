import type { Diagnostic } from "../shared/workflow";
import type { RunnerDiagnostic, WorkflowPreview } from "../runner";

export type ReadinessState = "unknown" | "blocked" | "ready";

export interface ReadinessBlocker {
  message: string;
  scope: string;
  nextAction: string;
  nodeId?: string;
}

export interface ReadinessView {
  state: ReadinessState;
  blockers: ReadinessBlocker[];
}

export interface CheckedPreview {
  projectPath: string;
  source: string;
  configurationRevision: number;
  preview: WorkflowPreview;
}

/** A previous check must never claim readiness for a changed draft or project. */
export function currentPreview(result: CheckedPreview | undefined, projectPath: string | undefined, source: string, configurationRevision = 0): WorkflowPreview | undefined {
  if (!result || result.projectPath !== projectPath || result.source !== source || result.configurationRevision !== configurationRevision) return undefined;
  return result.preview;
}

const remediation: Record<RunnerDiagnostic["code"], Pick<ReadinessBlocker, "scope" | "nextAction">> = {
  workflow: { scope: "Workflow draft", nextAction: "Fix the highlighted workflow diagnostic, then check again." },
  configuration: { scope: "Role, profile, or Conductor", nextAction: "Select an available profile or correct the referenced configuration." },
  "agent-node": { scope: "Machine-local Agent Workflow toolkit", nextAction: "Configure the reviewed local toolkit, then check again." },
  "orca-cli": { scope: "Orca CLI", nextAction: "Install or expose the reviewed Orca CLI, then check again." },
  "orca-runtime": { scope: "Orca runtime", nextAction: "Start Orca, then check again." },
  condition: { scope: "Workflow draft", nextAction: "Correct the affected condition, then check again." },
  mapping: { scope: "Workflow draft", nextAction: "Correct the affected input or output mapping, then check again." },
  parallel: { scope: "Workflow draft", nextAction: "Correct the affected parallel branch, then check again." },
  "worktree-safety": { scope: "Workflow draft", nextAction: "Correct the affected Worktree configuration, then check again." },
};

export function staticReadiness(diagnostics: Diagnostic[]): ReadinessView | undefined {
  if (!diagnostics.length) return undefined;
  return { state: "blocked", blockers: diagnostics.map((diagnostic) => ({ message: diagnostic.message, ...remediation.workflow })) };
}

export function previewReadiness(preview: WorkflowPreview | undefined, nodeIds: Iterable<string> = []): ReadinessView {
  if (!preview) return { state: "unknown", blockers: [] };
  if (preview.preflight.valid) return { state: "ready", blockers: [] };
  const nodes = new Set(nodeIds);
  return { state: "blocked", blockers: preview.preflight.diagnostics.map((diagnostic) => ({ message: diagnostic.message, ...remediation[diagnostic.code], ...(diagnostic.nodeId && nodes.has(diagnostic.nodeId) ? { nodeId: diagnostic.nodeId } : {}) })) };
}

export function blockedNodeIds(readiness: ReadinessView): Set<string> {
  return new Set(readiness.blockers.flatMap((blocker) => blocker.nodeId ? [blocker.nodeId] : []));
}

export function nodeReadiness(nodeId: string, nodeType: string, readiness: ReadinessView): "blocked" | "ready" | undefined {
  if (blockedNodeIds(readiness).has(nodeId)) return "blocked";
  return readiness.state === "ready" && nodeType === "agent" ? "ready" : undefined;
}

/** Returns a destination only for an existing, explicitly identified workflow node. */
export function blockerDestination(blocker: ReadinessBlocker, nodeIds: Iterable<string>): string | undefined {
  return blocker.nodeId && new Set(nodeIds).has(blocker.nodeId) ? blocker.nodeId : undefined;
}
