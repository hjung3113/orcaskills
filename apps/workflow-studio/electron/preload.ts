import { contextBridge, ipcRenderer } from "electron";
import type { WorkflowDocument, WorkflowFile } from "../src/shared/workflow";
import type { WorkflowPreview, WorkflowRunnerRequest } from "../src/runner";
import type { CapabilityDiscovery } from "../src/config/discovery";
import type { PortableConfiguration } from "../src/shared/config";
import type { WorkflowStudioClient } from "../src/client";

const client: Omit<WorkflowStudioClient, "kind"> = {
  openProject: (): Promise<string | undefined> => ipcRenderer.invoke("project:select"),
  listWorkflows: (projectPath: string): Promise<WorkflowFile[]> => ipcRenderer.invoke("workflow:list", projectPath),
  readWorkflow: (path: string): Promise<string> => ipcRenderer.invoke("workflow:read", path),
  validate: (source: string): Promise<WorkflowDocument> => ipcRenderer.invoke("workflow:validate", source),
  save: (projectPath: string, source: string): Promise<string> => ipcRenderer.invoke("workflow:save", projectPath, source),
  preview: (request: WorkflowRunnerRequest): Promise<WorkflowPreview> => ipcRenderer.invoke("workflow:preview", request),
  run: (request: WorkflowRunnerRequest) => ipcRenderer.invoke("workflow:run", request),
  discoverCapabilities: (): Promise<CapabilityDiscovery> => ipcRenderer.invoke("capabilities:discover"),
  readPortableConfiguration: (projectPath: string): Promise<PortableConfiguration> => ipcRenderer.invoke("configuration:read-portable", projectPath),
  savePortableConfiguration: (projectPath: string, configuration: PortableConfiguration): Promise<string> => ipcRenderer.invoke("configuration:save-portable", projectPath, configuration),
};

contextBridge.exposeInMainWorld("workflowStudio", client);
