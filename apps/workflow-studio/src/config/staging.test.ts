import { describe, expect, it } from "vitest";
import { applyPortablePreset, reviewPortableConfiguration } from "./staging";

const base = { roles: [{ id: "implementer", intent: "Implement", profileId: "fast" }], profiles: [{ id: "fast", provider: "codex", model: "gpt-5-mini" }], presets: [{ id: "careful", roleId: "implementer", profileId: "careful" }] };

describe("staged portable configuration", () => {
  it("lists exactly the values that would change before save", () => {
    const next = { ...base, roles: [{ ...base.roles[0], profileId: "careful" }], profiles: [...base.profiles, { id: "careful", provider: "codex", model: "gpt-5" }] };
    expect(reviewPortableConfiguration(base, next)).toMatchObject({ hasChanges: true, changedRoles: ["implementer"], changedProfiles: ["careful"] });
  });

  it("copies a preset into configuration without retaining a live link", () => {
    const configuration = { ...base, profiles: [...base.profiles, { id: "careful", provider: "codex", model: "gpt-5" }] };
    const applied = applyPortablePreset(configuration, "careful");
    expect(applied.configuration.roles[0]?.profileId).toBe("careful");
    expect(applied.configuration.roles[0]).not.toBe(configuration.roles[0]);
  });
});
