import type { CapabilityDiscovery } from "./discovery";
import type { AgentProfile, PortableConfiguration, Role } from "../shared/config";

export interface OnboardingCandidate {
  providerId: string;
  providerLabel: string;
  modelId: string;
  modelLabel: string;
}

export interface RoleProfileDraft {
  roleName: string;
  intent: string;
  profileName: string;
  candidate: OnboardingCandidate;
}

const agentWorkflowRoles: ReadonlyArray<Pick<Role, "id" | "intent">> = [
  { id: "architect", intent: "Design the approved change" },
  { id: "implementer", intent: "Implement the approved change" },
  { id: "reviewer", intent: "Independently review the implementation" },
  { id: "verifier", intent: "Independently verify the current head" },
];

function identifier(value: string, label: string): string {
  const result = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!result) throw new Error(`${label} needs a semantic name.`);
  return result;
}

function uniqueIdentifier(base: string, existing: Iterable<string>): string {
  const ids = new Set(existing);
  if (!ids.has(base)) return base;
  let suffix = 2;
  while (ids.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

/** Lists only discovered, currently available local candidates; discovery itself never registers them. */
export function onboardingCandidates(discovery: CapabilityDiscovery | undefined): OnboardingCandidate[] {
  return (discovery?.providers ?? []).flatMap((provider) => {
    if (provider.availability !== "available") return [];
    const models = provider.models.filter((model) => model.availability === "available").map((model) => ({
      providerId: provider.providerId,
      providerLabel: provider.displayName,
      modelId: model.id,
      modelLabel: model.displayName,
    }));
    return models.length ? models : [{
      providerId: provider.providerId,
      providerLabel: provider.displayName,
      modelId: "provider-default",
      modelLabel: "Provider default",
    }];
  });
}

/** Adds a role/profile draft in memory only. The caller must present and confirm the existing save review. */
export function addRoleProfileDraft(configuration: PortableConfiguration, draft: RoleProfileDraft): PortableConfiguration {
  const roleId = uniqueIdentifier(identifier(draft.roleName, "Role"), configuration.roles.map((role) => role.id));
  const profileId = uniqueIdentifier(identifier(draft.profileName, "Profile"), configuration.profiles.map((profile) => profile.id));
  const intent = draft.intent.trim();
  if (!intent) throw new Error("Role needs an intent.");
  const profile: AgentProfile = {
    id: profileId,
    provider: draft.candidate.providerId,
    model: draft.candidate.modelId,
    modelPolicy: draft.candidate.modelId === "provider-default" ? { kind: "provider-default" } : { kind: "exact", modelId: draft.candidate.modelId },
  };
  return { ...configuration, roles: [...configuration.roles, { id: roleId, intent, profileId }], profiles: [...configuration.profiles, profile] };
}

/** Makes the four template roles explicit while sharing one user-reviewed portable profile. */
export function addAgentWorkflowRoleDrafts(configuration: PortableConfiguration, profileName: string, candidate: OnboardingCandidate): PortableConfiguration {
  const profileId = uniqueIdentifier(identifier(profileName, "Profile"), configuration.profiles.map((profile) => profile.id));
  const profile: AgentProfile = {
    id: profileId,
    provider: candidate.providerId,
    model: candidate.modelId,
    modelPolicy: candidate.modelId === "provider-default" ? { kind: "provider-default" } : { kind: "exact", modelId: candidate.modelId },
  };
  const existing = new Set(configuration.roles.map((role) => role.id));
  const roles = agentWorkflowRoles.filter((role) => !existing.has(role.id)).map((role) => ({ ...role, profileId }));
  return { ...configuration, roles: [...configuration.roles, ...roles], profiles: [...configuration.profiles, profile] };
}
