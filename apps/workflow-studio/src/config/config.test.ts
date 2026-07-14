import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ConfigurationResolutionError,
  createReadOnlyConductor,
  localConfigurationPath,
  modelPolicyFor,
  resolveAgentProfile,
  resolveNodeAgentProfile,
  saveLocalConfiguration,
  savePortableConfiguration,
  validateConductorConfiguration,
  validateConfiguration,
} from ".";
import type { LocalConfiguration, PortableConfiguration, WorkflowConfiguration } from ".";

const portable: PortableConfiguration = {
  roles: [{ id: "implementer", intent: "Implement the approved change", profileId: "balanced" }],
  profiles: [
    { id: "balanced", provider: "codex", model: "gpt-5" },
    { id: "planner", provider: "codex", model: "gpt-5-thinking" },
  ],
};
const local: LocalConfiguration = { providers: { codex: { enabled: true, executablePath: "/usr/local/bin/codex", credentialEnvironmentVariable: "OPENAI_API_KEY" } } };
const directories: string[] = [];

afterEach(async () => Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))));

describe("role and local profile configuration", () => {
  it("resolves a role through its portable profile and local provider", () => {
    expect(resolveAgentProfile("implementer", portable, {}, local)).toMatchObject({
      selectedBy: "role",
      profile: { id: "balanced", provider: "codex", model: "gpt-5" },
      localProvider: { executablePath: "/usr/local/bin/codex" },
    });
  });

  it("lets a workflow override the role profile", () => {
    const workflow: WorkflowConfiguration = { profileOverrides: { implementer: "planner" } };
    expect(resolveAgentProfile("implementer", portable, workflow, local)).toMatchObject({ selectedBy: "workflow-override", profile: { id: "planner" } });
  });

  it("gives an explicit node override precedence and exposes its model policy", () => {
    const workflow: WorkflowConfiguration = {
      profileOverrides: { implementer: "planner" },
      nodeProfileOverrides: { build: { profileId: "balanced", modelPolicy: { kind: "provider-default" } } },
    };

    expect(resolveNodeAgentProfile("build", "implementer", portable, workflow, local)).toMatchObject({
      selectedBy: "node-override",
      profile: { id: "balanced" },
      modelPolicy: { kind: "provider-default" },
    });
  });

  it("validates portable preset references and preserves legacy exact model identifiers", () => {
    const invalid: PortableConfiguration = {
      ...portable,
      presets: [{ id: "broken", roleId: "missing-role", profileId: "missing-profile" }],
    };
    expect(validateConfiguration(invalid, {}, local).map(({ code }) => code)).toEqual(
      expect.arrayContaining(["missing-preset-role", "missing-preset-profile"]),
    );
    expect(modelPolicyFor(portable.profiles[0]!)).toEqual({ kind: "exact", modelId: "gpt-5" });
  });

  it("reports unavailable local providers and disabled local profiles", () => {
    expect(validateConfiguration(portable, {}, { providers: {}, profiles: { balanced: { enabled: false } } }).map(({ code }) => code)).toEqual(
      expect.arrayContaining(["missing-local-provider", "disabled-local-profile"]),
    );
    expect(() => resolveAgentProfile("implementer", portable, {}, { providers: {} })).toThrow(ConfigurationResolutionError);
  });

  it("keeps local execution details outside portable project configuration", async () => {
    const project = await mkdtemp(join(tmpdir(), "workflow-project-"));
    const appData = await mkdtemp(join(tmpdir(), "workflow-app-data-"));
    directories.push(project, appData);
    const portablePath = await savePortableConfiguration(project, portable);
    const localPath = await saveLocalConfiguration(appData, project, local);
    expect(portablePath).toContain(join(project, ".orca"));
    expect(localPath).not.toContain(project);
    expect(localConfigurationPath(appData, project)).toBe(localPath);
  });
});

describe("read-only Conductor", () => {
  it("has only advisory responsibilities and no write or lifecycle authority", () => {
    const conductor = createReadOnlyConductor({ enabled: true, profileId: "planner" });
    expect(conductor).toMatchObject({ canWriteCode: false, canManageLifecycle: false });
    expect(conductor.responsibilities).toEqual(["context-preparation", "prompt-refinement", "handoff-summary", "escalation-advice"]);
  });

  it("rejects attempted authority outside the read-only boundary", () => {
    expect(validateConductorConfiguration({ enabled: true, canWriteCode: true })).toEqual(
      expect.arrayContaining([expect.stringContaining("cannot be granted")]),
    );
  });
});
