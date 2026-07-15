import type { WorkflowStudioClient } from "./types";

export function createElectronClient(): WorkflowStudioClient {
  if (!window.workflowStudio) throw new Error("Electron Workflow Studio bridge is unavailable.");
  return { kind: "electron", ...window.workflowStudio };
}
