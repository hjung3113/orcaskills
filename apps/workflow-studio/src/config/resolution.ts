import type {
  AgentProfile,
  ModelPolicy,
  PortableConfiguration,
  Role,
  WorkflowConfiguration,
} from "../shared/config";
import type { LocalConfiguration, LocalProfileConfiguration, LocalProviderConfiguration } from "./local";

export type ConfigurationDiagnosticCode =
  | "duplicate-role"
  | "duplicate-profile"
  | "duplicate-preset"
  | "duplicate-prompt-preset"
  | "missing-role-profile"
  | "missing-override-role"
  | "missing-override-profile"
  | "missing-node-override-profile"
  | "missing-preset-role"
  | "missing-preset-profile"
  | "missing-local-provider"
  | "disabled-local-provider"
  | "disabled-local-profile"
  | "missing-conductor-profile";

export interface ConfigurationDiagnostic {
  code: ConfigurationDiagnosticCode;
  message: string;
}

export interface ResolvedAgentProfile {
  role: Role;
  profile: AgentProfile;
  localProvider: LocalProviderConfiguration;
  localProfile?: LocalProfileConfiguration;
  modelPolicy: ModelPolicy;
  selectedBy: "role" | "workflow-override" | "node-override";
}

export class ConfigurationResolutionError extends Error {
  constructor(readonly diagnostics: ConfigurationDiagnostic[]) {
    super(diagnostics.map((diagnostic) => diagnostic.message).join(" "));
    this.name = "ConfigurationResolutionError";
  }
}

function byId<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function duplicateDiagnostics(configuration: PortableConfiguration): ConfigurationDiagnostic[] {
  const diagnostics: ConfigurationDiagnostic[] = [];
  for (const [label, values, code] of [
    ["Role", configuration.roles, "duplicate-role"],
    ["Profile", configuration.profiles, "duplicate-profile"],
    ["Preset", configuration.presets ?? [], "duplicate-preset"],
    ["Prompt preset", configuration.promptPresets ?? [], "duplicate-prompt-preset"],
  ] as const) {
    const seen = new Set<string>();
    for (const value of values) {
      if (seen.has(value.id)) diagnostics.push({ code, message: `${label} \"${value.id}\" is duplicated.` });
      seen.add(value.id);
    }
  }
  return diagnostics;
}

/** Validate references and the availability of the local execution boundary. */
export function validateConfiguration(
  portable: PortableConfiguration,
  workflow: WorkflowConfiguration,
  local: LocalConfiguration,
): ConfigurationDiagnostic[] {
  const diagnostics = duplicateDiagnostics(portable);
  const roles = byId(portable.roles);
  const profiles = byId(portable.profiles);
  const selectedProfileIds = new Set<string>();

  for (const role of portable.roles) {
    if (!profiles.has(role.profileId)) {
      diagnostics.push({ code: "missing-role-profile", message: `Role \"${role.id}\" references missing profile \"${role.profileId}\".` });
    } else {
      selectedProfileIds.add(role.profileId);
    }
  }
  for (const [roleId, profileId] of Object.entries(workflow.profileOverrides ?? {})) {
    if (!roles.has(roleId)) diagnostics.push({ code: "missing-override-role", message: `Profile override references missing role \"${roleId}\".` });
    if (!profiles.has(profileId)) diagnostics.push({ code: "missing-override-profile", message: `Profile override for \"${roleId}\" references missing profile \"${profileId}\".` });
    else selectedProfileIds.add(profileId);
  }
  for (const [nodeId, override] of Object.entries(workflow.nodeProfileOverrides ?? {})) {
    if (!profiles.has(override.profileId)) diagnostics.push({ code: "missing-node-override-profile", message: `Node override for "${nodeId}" references missing profile "${override.profileId}".` });
    else selectedProfileIds.add(override.profileId);
  }
  for (const preset of portable.presets ?? []) {
    if (!roles.has(preset.roleId)) diagnostics.push({ code: "missing-preset-role", message: `Preset "${preset.id}" references missing role "${preset.roleId}".` });
    if (!profiles.has(preset.profileId)) diagnostics.push({ code: "missing-preset-profile", message: `Preset "${preset.id}" references missing profile "${preset.profileId}".` });
  }
  if (workflow.conductor?.profileId) {
    if (!profiles.has(workflow.conductor.profileId)) {
      diagnostics.push({ code: "missing-conductor-profile", message: `Conductor references missing profile \"${workflow.conductor.profileId}\".` });
    } else {
      selectedProfileIds.add(workflow.conductor.profileId);
    }
  }
  for (const profileId of selectedProfileIds) {
    const profile = profiles.get(profileId)!;
    const provider = local.providers[profile.provider];
    if (!provider) {
      diagnostics.push({ code: "missing-local-provider", message: `Profile \"${profileId}\" requires unavailable local provider \"${profile.provider}\".` });
    } else if (!provider.enabled) {
      diagnostics.push({ code: "disabled-local-provider", message: `Profile \"${profileId}\" requires disabled local provider \"${profile.provider}\".` });
    }
    if (local.profiles?.[profileId] && !local.profiles[profileId].enabled) {
      diagnostics.push({ code: "disabled-local-profile", message: `Profile \"${profileId}\" is disabled in local configuration.` });
    }
  }
  return diagnostics;
}

export function resolveAgentProfile(
  roleId: string,
  portable: PortableConfiguration,
  workflow: WorkflowConfiguration,
  local: LocalConfiguration,
): ResolvedAgentProfile {
  return resolveNodeAgentProfile(undefined, roleId, portable, workflow, local);
}

/** Resolve the exact node configuration; node overrides are deliberate and highest precedence. */
export function resolveNodeAgentProfile(
  nodeId: string | undefined,
  roleId: string,
  portable: PortableConfiguration,
  workflow: WorkflowConfiguration,
  local: LocalConfiguration,
): ResolvedAgentProfile {
  const diagnostics = validateConfiguration(portable, workflow, local);
  const roles = byId(portable.roles);
  const profiles = byId(portable.profiles);
  const role = roles.get(roleId);
  if (!role) diagnostics.push({ code: "missing-override-role", message: `Agent references missing role \"${roleId}\".` });
  const nodeOverride = nodeId ? workflow.nodeProfileOverrides?.[nodeId] : undefined;
  const profileId = nodeOverride?.profileId ?? workflow.profileOverrides?.[roleId] ?? role?.profileId;
  const profile = profileId ? profiles.get(profileId) : undefined;
  if (!profile && profileId) diagnostics.push({ code: "missing-override-profile", message: `Role \"${roleId}\" resolves missing profile \"${profileId}\".` });
  if (diagnostics.length > 0 || !role || !profile) throw new ConfigurationResolutionError(diagnostics);
  return {
    role,
    profile,
    localProvider: local.providers[profile.provider],
    ...(local.profiles?.[profile.id] ? { localProfile: local.profiles[profile.id] } : {}),
    modelPolicy: nodeOverride?.modelPolicy ?? profile.modelPolicy ?? (profile.model === "provider-default" ? { kind: "provider-default" } : { kind: "exact", modelId: profile.model }),
    selectedBy: nodeOverride ? "node-override" : workflow.profileOverrides?.[roleId] ? "workflow-override" : "role",
  };
}
