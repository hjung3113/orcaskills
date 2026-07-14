import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { RecordingOrcaCliAdapter, WorkflowRunner } from "../../src/runner";
import { listWorkflowFiles, readWorkflowFile, saveWorkflowFile } from "../../src/shared/project";
import { parseWorkflow, serializeWorkflow } from "../../src/shared/validation";
import { designApprovalWorkflow, isolatedParallelWriteWorkflow, runnerRequest } from "./fixtures";

const projects: string[] = [];
afterEach(async () => Promise.all(projects.splice(0).map((project) => rm(project, { recursive: true, force: true }))));

async function project(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), "workflow-studio-e2e-"));
  projects.push(path);
  return path;
}

describe("representative Workflow Studio workflows", () => {
  it("authors, saves, validates, and safely mock-runs design through approval, recovery, implementation, and review", async () => {
    const projectPath = await project();
    const source = serializeWorkflow(designApprovalWorkflow);
    expect(parseWorkflow(source).diagnostics).toEqual([]);
    const savedPath = await saveWorkflowFile(projectPath, designApprovalWorkflow.id, source);
    expect(await listWorkflowFiles(projectPath)).toEqual([{ id: designApprovalWorkflow.id, path: savedPath }]);
    expect(parseWorkflow(await readWorkflowFile(savedPath)).workflow).toEqual(designApprovalWorkflow);

    const adapter = new RecordingOrcaCliAdapter();
    adapter.queueGateResolution({ action: "approved" });
    adapter.queueTaskOutcome("implementation", { status: "failed", reason: "Mock test failure" });
    adapter.queueGateResolution({ action: "retry" });
    const result = await new WorkflowRunner(adapter).run(runnerRequest(projectPath, designApprovalWorkflow));

    expect(result.manifest.status).toBe("completed");
    expect(result.manifest.pauses).toEqual([
      expect.objectContaining({ nodeId: "approval", kind: "approval", resolution: "approved" }),
      expect.objectContaining({ nodeId: "implementation", kind: "failure", resolution: "retry", reason: "Mock test failure" }),
    ]);
    expect(adapter.operations.map((operation) => operation.kind)).toEqual(expect.arrayContaining(["create-gate", "dispatch"]));
    const reviewDispatch = adapter.operations.find((operation) => operation.kind === "dispatch" && operation.input.taskId === "task-review");
    expect(reviewDispatch).toMatchObject({ input: { input: { inputMappings: [{ input: "implementationSummary", fromNodeId: "implementation", output: "summary" }] } } });
    expect(JSON.stringify(adapter.operations)).not.toContain("rawOutput");
    expect(JSON.parse(await readFile(result.manifestPath, "utf8"))).toMatchObject({ workflowId: designApprovalWorkflow.id, status: "completed" });
  });

  it("accepts isolated parallel writes and prepares an isolated Worktree for each branch", async () => {
    const projectPath = await project();
    const adapter = new RecordingOrcaCliAdapter();
    const result = await new WorkflowRunner(adapter).run(runnerRequest(projectPath, isolatedParallelWriteWorkflow));
    expect(result.manifest.status).toBe("completed");
    expect(adapter.operations.filter((operation) => operation.kind === "prepare-worktree")).toHaveLength(2);
    expect(result.manifest.nodes.filter((node) => ["frontend", "backend"].includes(node.nodeId)).every((node) => node.worktreeId)).toBe(true);
    const join = adapter.operations.find((operation) => operation.kind === "dispatch" && operation.input.taskId === "task-integration-review");
    expect(join).toMatchObject({ input: { input: { inputMappings: [
      { input: "ui", fromNodeId: "frontend", output: "uiSummary" },
      { input: "api", fromNodeId: "backend", output: "apiSummary" },
    ] } } });
  });
});
