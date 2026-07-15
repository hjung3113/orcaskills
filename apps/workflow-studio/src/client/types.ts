import type { CapabilityDiscovery } from "../config/discovery";
import type { PortableConfiguration } from "../shared/config";
import type { WorkflowDocument, WorkflowFile } from "../shared/workflow";
import type { RunManifest, WorkflowPreview, WorkflowRunnerRequest } from "../runner";

/**
 * Renderer boundary shared by Electron IPC and the browser development API.
 * UI code must depend on this contract, never on Electron globals directly.
 */
export interface WorkflowStudioClient {
  readonly kind: "electron" | "web";
  /** Electron opens a native chooser when omitted; web requires an explicit local path. */
  openProject(projectPath?: string): Promise<string | undefined>;
  listWorkflows(projectPath: string): Promise<WorkflowFile[]>;
  readWorkflow(path: string): Promise<string>;
  validate(source: string): Promise<WorkflowDocument>;
  save(projectPath: string, source: string): Promise<string>;
  preview(request: WorkflowRunnerRequest): Promise<WorkflowPreview>;
  run(request: WorkflowRunnerRequest): Promise<{ manifest: RunManifest; manifestPath: string }>;
  discoverCapabilities(): Promise<CapabilityDiscovery>;
  readPortableConfiguration(projectPath: string): Promise<PortableConfiguration>;
  savePortableConfiguration(projectPath: string, configuration: PortableConfiguration): Promise<string>;
}
