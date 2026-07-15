import { describe, expect, it } from "vitest";
import { blockerDestination, blockedNodeIds, currentPreview, nodeReadiness, previewReadiness, staticReadiness } from "./readiness";

describe("Run Readiness presentation", () => {
  it("keeps readiness unknown until the current draft has been checked", () => {
    expect(previewReadiness(undefined)).toEqual({ state: "unknown", blockers: [] });
  });

  it("turns runner diagnostics into scoped, actionable blockers", () => {
    expect(previewReadiness({ preflight: { valid: false, resolvedProfileIds: {}, diagnostics: [{ code: "orca-runtime", message: "Orca runtime is not running." }] }, operations: [] })).toEqual({
      state: "blocked",
      blockers: [{ message: "Orca runtime is not running.", scope: "Orca runtime", nextAction: "Start Orca, then check again." }],
    });
  });

  it("retains only an existing diagnostic node as an actionable destination", () => {
    const readiness = previewReadiness({ preflight: { valid: false, resolvedProfileIds: {}, diagnostics: [{ code: "configuration", nodeId: "build", message: "Profile missing." }, { code: "orca-runtime", nodeId: "invented", message: "Runtime unavailable." }] }, operations: [] }, ["build"]);
    expect(readiness.blockers).toEqual(expect.arrayContaining([expect.objectContaining({ nodeId: "build" }), expect.not.objectContaining({ nodeId: "invented" })]));
    expect(blockedNodeIds(readiness)).toEqual(new Set(["build"]));
  });

  it("blocks invalid source before runner preview", () => {
    expect(staticReadiness([{ code: "yaml", message: "Bad YAML", line: 1, column: 1 }])).toMatchObject({ state: "blocked", blockers: [{ scope: "Workflow draft" }] });
  });

  it("invalidates a result when the draft changes", () => {
    const result = { projectPath: "/project", source: "before", configurationRevision: 0, preview: { preflight: { valid: true, resolvedProfileIds: {}, diagnostics: [] }, operations: [] } };
    expect(currentPreview(result, "/project", "after")).toBeUndefined();
  });

  it("invalidates a result when the project or saved configuration changes", () => {
    const result = { projectPath: "/project", source: "draft", configurationRevision: 1, preview: { preflight: { valid: true, resolvedProfileIds: {}, diagnostics: [] }, operations: [] } };
    expect(currentPreview(result, "/other-project", "draft", 1)).toBeUndefined();
    expect(currentPreview(result, "/project", "draft", 2)).toBeUndefined();
  });

  it("covers node-linked agent/profile/worktree blockers and leaves static or machine blockers unlinked", () => {
    const readiness = previewReadiness({ preflight: { valid: false, resolvedProfileIds: {}, diagnostics: [
      { code: "agent-node", nodeId: "role", message: "Role missing." },
      { code: "configuration", nodeId: "profile", message: "Profile missing." },
      { code: "worktree-safety", nodeId: "parallel", message: "Worktree conflict." },
      { code: "orca-runtime", message: "Runtime unavailable." },
    ] }, operations: [] }, ["role", "profile", "parallel"]);
    expect(blockedNodeIds(readiness)).toEqual(new Set(["role", "profile", "parallel"]));
    expect(staticReadiness([{ code: "reference", message: "Missing node", line: 2, column: 1 }])?.blockers[0]).not.toHaveProperty("nodeId");
    expect(readiness.blockers.find((blocker) => blocker.scope === "Orca runtime")).not.toHaveProperty("nodeId");
  });

  it("classifies canvas badges and exposes only explicit blocker destinations", () => {
    const blocked = previewReadiness({ preflight: { valid: false, resolvedProfileIds: {}, diagnostics: [{ code: "configuration", nodeId: "build", message: "Profile missing." }] }, operations: [] }, ["build"]);
    expect(nodeReadiness("build", "agent", blocked)).toBe("blocked");
    expect(nodeReadiness("start", "start", previewReadiness({ preflight: { valid: true, resolvedProfileIds: {}, diagnostics: [] }, operations: [] }))).toBeUndefined();
    expect(nodeReadiness("build", "agent", previewReadiness({ preflight: { valid: true, resolvedProfileIds: {}, diagnostics: [] }, operations: [] }))).toBe("ready");
    expect(blockerDestination(blocked.blockers[0], ["build"])).toBe("build");
    expect(blockerDestination({ ...blocked.blockers[0], nodeId: "gone" }, ["build"])).toBeUndefined();
  });
});
