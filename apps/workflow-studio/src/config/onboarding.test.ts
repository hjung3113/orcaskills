import { describe, expect, it } from "vitest";
import { addAgentWorkflowRoleDrafts, addRoleProfileDraft, onboardingCandidates } from "./onboarding";

const discovery = { refreshedAt: "2026-07-19T00:00:00.000Z", providers: [
  { providerId: "codex", displayName: "Codex CLI", availability: "available" as const, models: [] },
  { providerId: "offline", displayName: "Offline", availability: "unavailable" as const, models: [{ id: "not-selectable", displayName: "No", availability: "available" as const }] },
] };

describe("first-run portable configuration onboarding", () => {
  it("offers only discovered available candidates and uses provider-default when models are not safely enumerable", () => {
    expect(onboardingCandidates(discovery)).toEqual([{ providerId: "codex", providerLabel: "Codex CLI", modelId: "provider-default", modelLabel: "Provider default" }]);
  });

  it("creates a semantic role/profile draft without persisting it", () => {
    const configuration = { roles: [], profiles: [], presets: [] };
    const next = addRoleProfileDraft(configuration, { roleName: "Implementation Lead", intent: "Implement the approved change", profileName: "Balanced Codex", candidate: onboardingCandidates(discovery)[0]! });
    expect(next).toMatchObject({ roles: [{ id: "implementation-lead", profileId: "balanced-codex" }], profiles: [{ id: "balanced-codex", provider: "codex", model: "provider-default", modelPolicy: { kind: "provider-default" } }] });
    expect(configuration).toEqual({ roles: [], profiles: [], presets: [] });
  });

  it("creates the missing Agent Workflow roles against one reviewed profile", () => {
    const next = addAgentWorkflowRoleDrafts({ roles: [], profiles: [], presets: [] }, "Agent Workflow", onboardingCandidates(discovery)[0]!);
    expect(next.roles.map((role) => role.id)).toEqual(["architect", "implementer", "reviewer", "verifier"]);
    expect(next.roles.every((role) => role.profileId === "agent-workflow")).toBe(true);
  });
});
