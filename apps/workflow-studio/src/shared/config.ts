/**
 * Portable, Git-trackable Workflow Studio configuration.
 *
 * This module intentionally contains no executable paths, credentials, or
 * machine-specific provider setup. Those belong to config/local.ts.
 */
export interface AgentProfile {
  id: string;
  provider: string;
  model: string;
  policy?: string;
}

export interface Role {
  id: string;
  intent: string;
  profileId: string;
}

export interface PortableConfiguration {
  roles: Role[];
  profiles: AgentProfile[];
}

/** A workflow may replace the profile normally selected by a role. */
export interface WorkflowProfileConfiguration {
  profileOverrides?: Record<string, string>;
}

/**
 * The Conductor is advisory only. There is deliberately no write, terminal,
 * task, dispatch, or gate authority in this configuration surface.
 */
export interface ConductorConfiguration {
  enabled: boolean;
  profileId?: string;
}

export interface WorkflowConfiguration extends WorkflowProfileConfiguration {
  conductor?: ConductorConfiguration;
}

export const conductorResponsibilities = [
  "context-preparation",
  "prompt-refinement",
  "handoff-summary",
  "escalation-advice",
] as const;

export type ConductorResponsibility = (typeof conductorResponsibilities)[number];
