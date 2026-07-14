import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { RecordingOrcaCliAdapter, WorkflowRunner, selectedBranchNodeIds, validateParallelWorkflow } from ".";
import type { WorkflowRunnerRequest } from ".";
import type { Workflow } from "../shared/workflow";

const directories: string[] = [];
afterEach(async () => Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))));

const configuration = {
  portableConfiguration: { roles: [{ id: "worker", intent: "Do bounded work", profileId: "agent" }], profiles: [{ id: "agent", provider: "codex", model: "gpt-5" }] },
  workflowConfiguration: {},
  localConfiguration: { providers: { codex: { enabled: true } } },
};

const parallelWorkflow: Workflow = {
  id: "parallel-delivery",
  nodes: [
    { id: "start", type: "start" },
    { id: "fork", type: "parallel", dependsOn: ["start"], branches: ["research", "review"] },
    { id: "research", type: "agent", roleId: "worker", access: "write", worktree: "isolated", dependsOn: ["fork"], outputs: ["brief"], artifactReferences: ["research.md"] },
    { id: "review", type: "agent", roleId: "worker", access: "write", worktree: "isolated", dependsOn: ["fork"], outputs: ["risks"], artifactReferences: ["review.md"] },
    { id: "join", type: "agent", roleId: "worker", access: "read", dependsOn: ["research", "review"], inputMappings: { designBrief: "research.brief", reviewRisks: "review.risks" } },
    { id: "end", type: "end", dependsOn: ["join"] },
  ],
};

describe("parallel workflow safety", () => {
  it("rejects concurrent shared-Worktree writes", () => {
    const unsafe: Workflow = { ...parallelWorkflow, nodes: parallelWorkflow.nodes.map((node) => node.id === "review" ? { ...node, worktree: "current" } : node) };
    expect(validateParallelWorkflow(unsafe)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "worktree-safety", message: expect.stringContaining("isolated Worktree") }),
    ]));
  });

  it("selects the matching condition branch and diagnoses invalid mapped outputs", async () => {
    const workflow: Workflow = {
      id: "conditioned",
      nodes: [
        { id: "start", type: "start" },
        { id: "evaluate", type: "agent", roleId: "worker", dependsOn: ["start"], outputs: ["approved"] },
        { id: "condition", type: "condition", dependsOn: ["evaluate"], condition: { operand: { fromNodeId: "evaluate", field: "approved" }, equals: true } },
        { id: "yes", type: "agent", roleId: "worker", dependsOn: ["condition"], branch: { conditionId: "condition", equals: true } },
        { id: "no", type: "agent", roleId: "worker", dependsOn: ["condition"], branch: { conditionId: "condition", equals: false } },
        { id: "end", type: "end", dependsOn: ["yes", "no"] },
      ],
    };
    expect(selectedBranchNodeIds(workflow, { evaluate: { approved: true } })).toContain("yes");
    expect(selectedBranchNodeIds(workflow, { evaluate: { approved: true } })).not.toContain("no");
    const invalidMapping: Workflow = { ...workflow, nodes: workflow.nodes.map((node) => node.id === "no" ? { ...node, inputMappings: { missing: "evaluate.missing" } } : node) };
    expect(validateParallelWorkflow(invalidMapping)).toEqual(expect.arrayContaining([expect.objectContaining({ code: "mapping", nodeId: "no" })]));
    const preview = await new WorkflowRunner(new RecordingOrcaCliAdapter()).preview({ projectPath: "/project", workflow, ...configuration, conditionOutputs: { evaluate: { approved: true } } });
    expect(preview.operations.map((operation) => operation.nodeId)).toContain("yes");
    expect(preview.operations.map((operation) => operation.nodeId)).not.toContain("no");
  });

  it("prepares isolated Worktrees and preserves branch fields and artifacts at a join", async () => {
    const projectPath = await mkdtemp(join(tmpdir(), "workflow-parallel-"));
    directories.push(projectPath);
    const adapter = new RecordingOrcaCliAdapter();
    const request: WorkflowRunnerRequest = { projectPath, workflow: parallelWorkflow, ...configuration };
    const result = await new WorkflowRunner(adapter).run(request);
    expect(adapter.operations.filter((operation) => operation.kind === "prepare-worktree")).toHaveLength(2);
    const joinDispatch = adapter.operations.find((operation) => operation.kind === "dispatch" && operation.input.taskId === "task-join");
    expect(joinDispatch).toMatchObject({ input: { input: {
      structuredContext: [
        { fromNodeId: "research", fields: ["brief"], artifactReferences: ["research.md"] },
        { fromNodeId: "review", fields: ["risks"], artifactReferences: ["review.md"] },
      ],
      inputMappings: [
        { input: "designBrief", fromNodeId: "research", output: "brief" },
        { input: "reviewRisks", fromNodeId: "review", output: "risks" },
      ],
    } } });
    expect(result.manifest.nodes.filter((node) => node.nodeId === "research" || node.nodeId === "review").every((node) => node.worktreeId?.startsWith("worktree-parallel-delivery-"))).toBe(true);
  });
});
