import type { PromptPreset, PortableConfiguration, PortablePreset, WorkflowConfiguration } from "../shared/config";
import type { WorkflowNode } from "../shared/workflow";

export interface ConfigurationReview {
  changedRoles: string[];
  changedProfiles: string[];
  changedPresets: string[];
  changedPromptPresets: string[];
  blockedRemovals: RemovalDiagnostic[];
  hasChanges: boolean;
}

function changedIds<T extends { id: string }>(before: readonly T[], after: readonly T[]): string[] {
  const prior = new Map(before.map((value) => [value.id, JSON.stringify(value)]));
  return after.filter((value) => prior.get(value.id) !== JSON.stringify(value)).map((value) => value.id);
}

/** Produces an explicit save review; it never mutates either configuration. */
export function reviewPortableConfiguration(before: PortableConfiguration, after: PortableConfiguration, references: ConfigurationReferences = {}): ConfigurationReview {
  const changedRoles = changedIds(before.roles, after.roles);
  const changedProfiles = changedIds(before.profiles, after.profiles);
  const changedPresets = changedIds(before.presets ?? [], after.presets ?? []);
  const changedPromptPresets = changedIds(before.promptPresets ?? [], after.promptPresets ?? []);
  const blockedRemovals = removalDiagnostics(before, after, references);
  return {
    changedRoles,
    changedProfiles,
    changedPresets,
    changedPromptPresets,
    blockedRemovals,
    hasChanges: changedRoles.length + changedProfiles.length + changedPresets.length + changedPromptPresets.length > 0,
  };
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

/** References are supplied from the staged workflow; this module never reads or writes persistence. */
export interface ConfigurationReferences {
  workflow?: WorkflowConfiguration;
  nodes?: ReadonlyArray<Pick<WorkflowNode, "id"> & { roleId?: unknown }>;
}

export interface RemovalDiagnostic {
  kind: "role" | "profile" | "preset";
  id: string;
  dependent: "role" | "preset" | "conductor" | "workflow-node";
  dependentId: string;
  message: string;
}

function removedIds<T extends { id: string }>(before: readonly T[], after: readonly T[]): Set<string> {
  return new Set(before.filter((value) => !after.some((candidate) => candidate.id === value.id)).map((value) => value.id));
}

/** Identifies only removals that leave a reference in the staged configuration or workflow. */
export function removalDiagnostics(before: PortableConfiguration, after: PortableConfiguration, references: ConfigurationReferences = {}): RemovalDiagnostic[] {
  const removedRoles = removedIds(before.roles, after.roles);
  const removedProfiles = removedIds(before.profiles, after.profiles);
  const removedPresets = removedIds(before.presets ?? [], after.presets ?? []);
  const diagnostics: RemovalDiagnostic[] = [];
  const add = (kind: RemovalDiagnostic["kind"], id: string, dependent: RemovalDiagnostic["dependent"], dependentId: string) =>
    diagnostics.push({ kind, id, dependent, dependentId, message: `Cannot remove ${kind} "${id}" while ${dependent} "${dependentId}" still references it.` });

  for (const role of after.roles) if (removedProfiles.has(role.profileId)) add("profile", role.profileId, "role", role.id);
  for (const preset of after.presets ?? []) {
    if (removedRoles.has(preset.roleId)) add("role", preset.roleId, "preset", preset.id);
    if (removedProfiles.has(preset.profileId)) add("profile", preset.profileId, "preset", preset.id);
  }
  const workflow = references.workflow;
  if (workflow?.conductor?.profileId && removedProfiles.has(workflow.conductor.profileId)) add("profile", workflow.conductor.profileId, "conductor", "conductor");
  for (const [roleId, profileId] of Object.entries(workflow?.profileOverrides ?? {})) {
    if (removedRoles.has(roleId)) add("role", roleId, "workflow-node", roleId);
    if (removedProfiles.has(profileId)) add("profile", profileId, "workflow-node", roleId);
  }
  for (const [nodeId, override] of Object.entries(workflow?.nodeProfileOverrides ?? {})) if (removedProfiles.has(override.profileId)) add("profile", override.profileId, "workflow-node", nodeId);
  for (const node of references.nodes ?? []) if (typeof node.roleId === "string" && removedRoles.has(node.roleId)) add("role", node.roleId, "workflow-node", node.id);
  // Configuration presets have no live bindings. A removed preset therefore cannot block a save.
  void removedPresets;
  return diagnostics;
}

export type PromptPresetMutation =
  | { kind: "add"; preset: PromptPreset }
  | { kind: "edit"; id: string; preset: PromptPreset }
  | { kind: "duplicate"; id: string; duplicateId: string }
  | { kind: "delete"; id: string };

/** Plans one in-memory prompt-preset mutation. Persistence remains the caller's review-and-confirm step. */
export function planPromptPresetMutation(configuration: PortableConfiguration, mutation: PromptPresetMutation): PortableConfiguration {
  const promptPresets = configuration.promptPresets ?? [];
  const exists = (id: string) => promptPresets.some((preset) => preset.id === id);
  if (mutation.kind === "add") {
    if (exists(mutation.preset.id)) throw new Error(`Prompt preset "${mutation.preset.id}" already exists.`);
    return { ...configuration, promptPresets: [...promptPresets, { ...mutation.preset }] };
  }
  if (mutation.kind === "edit") {
    if (!exists(mutation.id)) throw new Error(`Prompt preset "${mutation.id}" does not exist.`);
    if (mutation.preset.id !== mutation.id && exists(mutation.preset.id)) throw new Error(`Prompt preset "${mutation.preset.id}" already exists.`);
    return { ...configuration, promptPresets: promptPresets.map((preset) => preset.id === mutation.id ? { ...mutation.preset } : preset) };
  }
  if (mutation.kind === "duplicate") {
    const source = promptPresets.find((preset) => preset.id === mutation.id);
    if (!source) throw new Error(`Prompt preset "${mutation.id}" does not exist.`);
    if (exists(mutation.duplicateId)) throw new Error(`Prompt preset "${mutation.duplicateId}" already exists.`);
    return { ...configuration, promptPresets: [...promptPresets, { ...source, id: mutation.duplicateId }] };
  }
  if (!exists(mutation.id)) throw new Error(`Prompt preset "${mutation.id}" does not exist.`);
  return { ...configuration, promptPresets: promptPresets.filter((preset) => preset.id !== mutation.id) };
}

/** Copy prompt-preset text into a node; deliberately retain neither an ID nor a live binding. */
export function applyPromptPreset<T extends WorkflowNode>(node: T, preset: PromptPreset): T {
  const { promptPresetId: _discarded, ...withoutPresetReference } = node;
  return { ...withoutPresetReference, additionalInstructions: preset.instructions } as T;
}

export type LegacyPromptMigration<T extends WorkflowNode> =
  | { status: "not-required"; node: T }
  | { status: "ready"; node: T; legacyPrompt: string }
  | { status: "conflict"; node: T; legacyPrompt: string; message: string };

/** Plans, but never applies, an explicit conversion from the legacy replacement field. */
export function planLegacyPromptMigration<T extends WorkflowNode>(node: T): LegacyPromptMigration<T> {
  if (typeof node.prompt !== "string") return { status: "not-required", node };
  if (Object.prototype.hasOwnProperty.call(node, "additionalInstructions")) {
    return { status: "conflict", node, legacyPrompt: node.prompt, message: `Node "${node.id}" already has additional instructions; choose the migration text explicitly.` };
  }
  const { prompt, ...withoutLegacyPrompt } = node;
  return { status: "ready", legacyPrompt: prompt, node: { ...withoutLegacyPrompt, additionalInstructions: prompt } as T };
}
