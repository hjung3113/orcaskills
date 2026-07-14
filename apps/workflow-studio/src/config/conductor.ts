import { conductorResponsibilities, type ConductorConfiguration, type ConductorResponsibility } from "../shared/config";

export interface ReadOnlyConductor {
  readonly enabled: boolean;
  readonly profileId?: string;
  readonly responsibilities: readonly ConductorResponsibility[];
  readonly canWriteCode: false;
  readonly canManageLifecycle: false;
}

const allowedKeys = new Set(["enabled", "profileId"]);

/** Reject untyped configuration that tries to grant Conductor extra authority. */
export function validateConductorConfiguration(value: unknown): string[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return ["Conductor configuration must be an object."];
  }
  const record = value as Record<string, unknown>;
  const problems: string[] = [];
  if (typeof record.enabled !== "boolean") problems.push("Conductor configuration needs a boolean enabled value.");
  if (record.profileId !== undefined && (typeof record.profileId !== "string" || record.profileId.length === 0)) {
    problems.push("Conductor profileId must be a non-empty string when supplied.");
  }
  for (const key of Object.keys(record)) {
    if (!allowedKeys.has(key)) problems.push(`Conductor cannot be granted \"${key}\" authority.`);
  }
  return problems;
}

export function createReadOnlyConductor(configuration: ConductorConfiguration): ReadOnlyConductor {
  const problems = validateConductorConfiguration(configuration);
  if (problems.length > 0) throw new Error(problems.join(" "));
  return Object.freeze({
    enabled: configuration.enabled,
    ...(configuration.profileId ? { profileId: configuration.profileId } : {}),
    responsibilities: conductorResponsibilities,
    canWriteCode: false as const,
    canManageLifecycle: false as const,
  });
}
