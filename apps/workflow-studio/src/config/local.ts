/**
 * Machine-only execution configuration. Persist this outside the project so
 * paths and credential references cannot enter portable project config.
 */
export interface LocalProviderConfiguration {
  enabled: boolean;
  executablePath?: string;
  credentialEnvironmentVariable?: string;
}

/** Optional profile-specific availability or executable override. */
export interface LocalProfileConfiguration {
  enabled: boolean;
  executablePath?: string;
  credentialEnvironmentVariable?: string;
}

/** Machine-only, reviewed boundary for the installed Agent Workflow toolkit. */
export interface AgentWorkflowLocalConfiguration {
  enabled: boolean;
  toolkitRoot?: string;
}

export interface LocalConfiguration {
  providers: Record<string, LocalProviderConfiguration>;
  profiles?: Record<string, LocalProfileConfiguration>;
  agentWorkflow?: AgentWorkflowLocalConfiguration;
}
