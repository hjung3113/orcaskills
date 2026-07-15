import { describe, expect, it } from "vitest";
import { currentPreview, previewReadiness, staticReadiness } from "./readiness";

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

  it("blocks invalid source before runner preview", () => {
    expect(staticReadiness([{ code: "yaml", message: "Bad YAML", line: 1, column: 1 }])).toMatchObject({ state: "blocked", blockers: [{ scope: "Workflow draft" }] });
  });

  it("invalidates a result when the draft changes", () => {
    const result = { projectPath: "/project", source: "before", preview: { preflight: { valid: true, resolvedProfileIds: {}, diagnostics: [] }, operations: [] } };
    expect(currentPreview(result, "/project", "after")).toBeUndefined();
  });
});
