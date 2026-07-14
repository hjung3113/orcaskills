import type { PortableConfiguration, PortablePreset } from "../shared/config";

export interface ConfigurationReview {
  changedRoles: string[];
  changedProfiles: string[];
  changedPresets: string[];
  hasChanges: boolean;
}

function changedIds<T extends { id: string }>(before: readonly T[], after: readonly T[]): string[] {
  const prior = new Map(before.map((value) => [value.id, JSON.stringify(value)]));
  return after.filter((value) => prior.get(value.id) !== JSON.stringify(value)).map((value) => value.id);
}

/** Produces an explicit save review; it never mutates either configuration. */
export function reviewPortableConfiguration(before: PortableConfiguration, after: PortableConfiguration): ConfigurationReview {
  const changedRoles = changedIds(before.roles, after.roles);
  const changedProfiles = changedIds(before.profiles, after.profiles);
  const changedPresets = changedIds(before.presets ?? [], after.presets ?? []);
  return { changedRoles, changedProfiles, changedPresets, hasChanges: changedRoles.length + changedProfiles.length + changedPresets.length > 0 };
}

/** Applying a preset makes a copy for the caller; it deliberately creates no live preset binding. */
export function applyPortablePreset(configuration: PortableConfiguration, presetId: string): { preset: PortablePreset; configuration: PortableConfiguration } {
  const preset = configuration.presets?.find((candidate) => candidate.id === presetId);
  if (!preset) throw new Error(`Preset "${presetId}" does not exist.`);
  return {
    preset,
    configuration: {
      ...configuration,
      roles: configuration.roles.map((role) => role.id === preset.roleId ? { ...role, profileId: preset.profileId } : role),
    },
  };
}
