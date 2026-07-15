/// <reference types="vite/client" />

import type { WorkflowStudioClient } from "../client";

declare global {
  interface Window {
    workflowStudio?: Omit<WorkflowStudioClient, "kind">;
  }
}

export {};
