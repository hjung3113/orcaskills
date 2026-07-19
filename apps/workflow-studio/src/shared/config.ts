/**
 * Portable, Git-trackable Workflow Studio configuration.
 *
 * This module intentionally contains no executable paths, credentials, or
 * machine-specific provider setup. Those belong to config/local.ts.
 */
export type ModelPolicy =
  | { kind: "exact"; modelId: string }
  | { kind: "provider-default" };

export interface AgentProfile {
  id: string;
  provider: string;
  /** Legacy exact identifier; retained so existing project configuration stays readable. */
  model: string;
  /** New configurations make their execution intent explicit. */
  modelPolicy?: ModelPolicy;
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
  presets?: PortablePreset[];
  /** Reusable text only. Applying one copies its instructions into a node. */
  promptPresets?: PromptPreset[];
}

/** A shareable template; application copies these values into a workflow node. */
export interface PortablePreset {
  id: string;
  roleId: string;
  profileId: string;
  modelPolicy?: ModelPolicy;
}

/** A portable, provider-independent instruction snippet with no live bindings. */
export interface PromptPreset {
  id: string;
  instructions: string;
}

export interface NodeProfileOverride {
  profileId: string;
  modelPolicy?: ModelPolicy;
}

/** A workflow may replace the profile normally selected by a role. */
export interface WorkflowProfileConfiguration {
  profileOverrides?: Record<string, string>;
  /** Node overrides take precedence over a workflow role override. */
  nodeProfileOverrides?: Record<string, NodeProfileOverride>;
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

export function modelPolicyFor(profile: AgentProfile): ModelPolicy {
  return profile.modelPolicy ?? (profile.model === "provider-default" ? { kind: "provider-default" } : { kind: "exact", modelId: profile.model });
}

export const conductorResponsibilities = [
  "context-preparation",
  "prompt-refinement",
  "handoff-summary",
  "escalation-advice",
] as const;

export type ConductorResponsibility = (typeof conductorResponsibilities)[number];
