import { describe, expect, it } from "vitest";
import { applyPortablePreset, applyPromptPreset, planLegacyPromptMigration, planPromptPresetMutation, reviewPortableConfiguration } from "./staging";

const base = { roles: [{ id: "implementer", intent: "Implement", profileId: "fast" }], profiles: [{ id: "fast", provider: "codex", model: "gpt-5-mini" }], presets: [{ id: "careful", roleId: "implementer", profileId: "careful" }] };

describe("staged portable configuration", () => {
  it("lists exactly the values that would change before save", () => {
    const next = { ...base, roles: [{ ...base.roles[0], profileId: "careful" }], profiles: [...base.profiles, { id: "careful", provider: "codex", model: "gpt-5" }] };
    expect(reviewPortableConfiguration(base, next)).toMatchObject({ hasChanges: true, changedRoles: ["implementer"], changedProfiles: ["careful"] });
  });

  it("reviews prompt-preset changes and blocks staged removals with their dependents", () => {
    const next = { ...base, profiles: [], promptPresets: [{ id: "handoff", instructions: "Summarize decisions." }] };
    expect(reviewPortableConfiguration(base, next, {
      workflow: { conductor: { enabled: true, profileId: "fast" }, nodeProfileOverrides: { build: { profileId: "fast" } } },
      nodes: [{ id: "implement", roleId: "implementer" }],
    })).toMatchObject({
      changedPromptPresets: ["handoff"],
      blockedRemovals: expect.arrayContaining([
        expect.objectContaining({ kind: "profile", id: "fast", dependent: "role", dependentId: "implementer" }),
        expect.objectContaining({ kind: "profile", id: "fast", dependent: "conductor" }),
        expect.objectContaining({ kind: "profile", id: "fast", dependent: "workflow-node", dependentId: "build" }),
      ]),
    });
  });

  it("copies a preset into configuration without retaining a live link", () => {
    const configuration = { ...base, profiles: [...base.profiles, { id: "careful", provider: "codex", model: "gpt-5" }] };
    const applied = applyPortablePreset(configuration, "careful");
    expect(applied.configuration.roles[0]?.profileId).toBe("careful");
    expect(applied.configuration.roles[0]).not.toBe(configuration.roles[0]);
  });

  it("plans staged prompt-preset CRUD and copies instructions without a preset binding", () => {
    const added = planPromptPresetMutation(base, { kind: "add", preset: { id: "handoff", instructions: "Summarize decisions." } });
    const edited = planPromptPresetMutation(added, { kind: "edit", id: "handoff", preset: { id: "handoff", instructions: "Summarize the decision." } });
    const duplicated = planPromptPresetMutation(edited, { kind: "duplicate", id: "handoff", duplicateId: "handoff-copy" });
    const deleted = planPromptPresetMutation(duplicated, { kind: "delete", id: "handoff-copy" });
    expect(deleted.promptPresets).toEqual([{ id: "handoff", instructions: "Summarize the decision." }]);
    expect(applyPromptPreset({ id: "build", type: "agent", promptPresetId: "old" }, deleted.promptPresets![0]!)).toEqual({ id: "build", type: "agent", additionalInstructions: "Summarize the decision." });
  });

  it("plans legacy prompt migration without changing its execution semantics", () => {
    expect(planLegacyPromptMigration({ id: "build", type: "agent", prompt: "Implement safely." })).toEqual({
      status: "ready",
      legacyPrompt: "Implement safely.",
      node: { id: "build", type: "agent", additionalInstructions: "Implement safely." },
    });
    expect(planLegacyPromptMigration({ id: "build", type: "agent", prompt: "old", additionalInstructions: "new" })).toMatchObject({ status: "conflict" });
    expect(planLegacyPromptMigration({ id: "build", type: "agent", prompt: "old", additionalInstructions: "" })).toMatchObject({ status: "conflict" });
  });
});
