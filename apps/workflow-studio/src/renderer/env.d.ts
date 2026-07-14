/// <reference types="vite/client" />

import type { WorkflowDocument, WorkflowFile } from "../shared/workflow";
import type { RunManifest, WorkflowPreview, WorkflowRunnerRequest } from "../runner";
import type { CapabilityDiscovery } from "../config/discovery";
import type { PortableConfiguration } from "../shared/config";

declare global {
  interface Window {
    workflowStudio: {
      selectProject(): Promise<string | undefined>;
      listWorkflows(projectPath: string): Promise<WorkflowFile[]>;
      readWorkflow(path: string): Promise<string>;
      validate(source: string): Promise<WorkflowDocument>;
      save(projectPath: string, source: string): Promise<string>;
      preview(request: WorkflowRunnerRequest): Promise<WorkflowPreview>;
      run(request: WorkflowRunnerRequest): Promise<{ manifest: RunManifest; manifestPath: string }>;
      discoverCapabilities(): Promise<CapabilityDiscovery>;
      readPortableConfiguration(projectPath: string): Promise<PortableConfiguration>;
      savePortableConfiguration(projectPath: string, configuration: PortableConfiguration): Promise<string>;
    };
  }
}

export {};
