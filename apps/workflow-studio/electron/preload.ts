import { contextBridge, ipcRenderer } from "electron";
import type { WorkflowDocument, WorkflowFile } from "../src/shared/workflow";
import type { WorkflowPreview, WorkflowRunnerRequest } from "../src/runner";
import type { CapabilityDiscovery } from "../src/config/discovery";

contextBridge.exposeInMainWorld("workflowStudio", {
  selectProject: (): Promise<string | undefined> => ipcRenderer.invoke("project:select"),
  listWorkflows: (projectPath: string): Promise<WorkflowFile[]> => ipcRenderer.invoke("workflow:list", projectPath),
  readWorkflow: (path: string): Promise<string> => ipcRenderer.invoke("workflow:read", path),
  validate: (source: string): Promise<WorkflowDocument> => ipcRenderer.invoke("workflow:validate", source),
  save: (projectPath: string, source: string): Promise<string> => ipcRenderer.invoke("workflow:save", projectPath, source),
  preview: (request: WorkflowRunnerRequest): Promise<WorkflowPreview> => ipcRenderer.invoke("workflow:preview", request),
  run: (request: WorkflowRunnerRequest) => ipcRenderer.invoke("workflow:run", request),
  discoverCapabilities: (): Promise<CapabilityDiscovery> => ipcRenderer.invoke("capabilities:discover"),
});
