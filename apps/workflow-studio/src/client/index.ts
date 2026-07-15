import { createElectronClient } from "./electron-client";
import { createWebClient } from "./web-client";
import type { WorkflowStudioClient } from "./types";

export type { WorkflowStudioClient } from "./types";

export const workflowStudioClient: WorkflowStudioClient =
  typeof window !== "undefined" && window.workflowStudio ? createElectronClient() : createWebClient();
