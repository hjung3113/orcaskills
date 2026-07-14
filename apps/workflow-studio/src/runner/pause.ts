import type { DecisionGateInput, GateResolution, RunManifestPause } from "./types";

export const approvalGate = (taskId: string, nodeId: string, question?: string): DecisionGateInput => ({
  taskId,
  nodeId,
  question: question || `Approve workflow transition at ${nodeId}?`,
  options: ["approved", "terminate"],
});

export const recoveryGate = (taskId: string, nodeId: string, reason: string): DecisionGateInput => ({
  taskId,
  nodeId,
  question: `Workflow node ${nodeId} needs a recovery decision: ${reason}`,
  options: ["retry", "replace-profile", "terminate"],
});

export function pauseRecord(nodeId: string, kind: RunManifestPause["kind"], reason: string, gateId: string, resolution: GateResolution): RunManifestPause {
  return { nodeId, kind, reason, gateId, resolution: resolution.action, ...(resolution.action === "replace-profile" ? { profileId: resolution.profileId } : {}) };
}
