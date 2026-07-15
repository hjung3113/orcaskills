import type { CapabilityDiscovery } from "../config/discovery";
import type { PortableConfiguration } from "../shared/config";
import type { WorkflowDocument, WorkflowFile } from "../shared/workflow";
import type { RunManifest, WorkflowPreview } from "../runner";
import type { WorkflowStudioClient } from "./types";

async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload = await response.json() as { result?: T; error?: string };
  if (!response.ok) throw new Error(payload.error ?? `Workflow Studio API request failed (${response.status}).`);
  return payload.result as T;
}

/** Browser implementation used by Vite development. The API is local-only. */
export function createWebClient(): WorkflowStudioClient {
  return {
    kind: "web",
    openProject: (projectPath?: string) => {
      if (!projectPath?.trim()) throw new Error("Enter an absolute project path in web mode.");
      return request<string>("/api/project/open", { projectPath });
    },
    listWorkflows: (projectPath) => request<WorkflowFile[]>(`/api/workflows?projectPath=${encodeURIComponent(projectPath)}`),
    readWorkflow: (path) => request<string>("/api/workflow/read", { path }),
    validate: (source) => request<WorkflowDocument>("/api/workflow/validate", { source }),
    save: (projectPath, source) => request<string>("/api/workflow/save", { projectPath, source }),
    preview: (projectPath, source) => request<WorkflowPreview>("/api/workflow/preview", { projectPath, source }),
    run: (projectPath, source) => request<{ manifest: RunManifest; manifestPath: string }>("/api/workflow/run", { projectPath, source }),
    discoverCapabilities: () => request<CapabilityDiscovery>("/api/capabilities/discover", {}),
    readPortableConfiguration: (projectPath) => request<PortableConfiguration>(`/api/configuration/portable?projectPath=${encodeURIComponent(projectPath)}`),
    savePortableConfiguration: (projectPath, configuration) => request<string>("/api/configuration/portable/save", { projectPath, configuration }),
  };
}
