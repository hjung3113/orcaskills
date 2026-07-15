import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { RecordingOrcaCliAdapter, WorkflowRunner } from ".";
import type { WorkflowRunnerRequest } from ".";

const directories: string[] = [];
afterEach(async () => Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))));

function request(nodes: WorkflowRunnerRequest["workflow"]["nodes"]): WorkflowRunnerRequest {
  return {
    projectPath: "/project",
    workflow: { id: "paused-delivery", nodes },
    portableConfiguration: {
      roles: [{ id: "worker", intent: "Do the work", profileId: "fast" }],
      profiles: [{ id: "fast", provider: "codex", model: "gpt-5-mini" }, { id: "careful", provider: "codex", model: "gpt-5" }],
    },
    workflowConfiguration: {},
    localConfiguration: { providers: { codex: { enabled: true, executablePath: "codex" } } },
  };
}

async function localRequest(nodes: WorkflowRunnerRequest["workflow"]["nodes"]): Promise<WorkflowRunnerRequest> {
  const projectPath = await mkdtemp(join(tmpdir(), "workflow-pauses-"));
  directories.push(projectPath);
  return { ...request(nodes), projectPath };
}

describe("WorkflowRunner approval and recovery pauses", () => {
  it("creates an authoritative approval gate before dispatching the downstream path", async () => {
    const adapter = new RecordingOrcaCliAdapter();
    const result = await new WorkflowRunner(adapter).run(await localRequest([
      { id: "start", type: "start" },
      { id: "prepare", type: "agent", roleId: "worker", dependsOn: ["start"] },
      { id: "review", type: "approval", prompt: "Approve the prepared work?", dependsOn: ["prepare"] },
      { id: "finish", type: "agent", roleId: "worker", dependsOn: ["review"] },
      { id: "end", type: "end", dependsOn: ["finish"] },
    ]));
    expect(adapter.operations.map((operation) => operation.kind)).toEqual([
      "create-terminal", "create-task", "dispatch", "create-task", "create-gate", "create-terminal", "create-task", "dispatch",
    ]);
    expect(adapter.operations[4]).toMatchObject({ input: { nodeId: "review", options: ["approved", "terminate"] } });
    expect(adapter.gateWaits).toEqual([{ gateId: "gate-review-1" }]);
    expect(result.manifest).toMatchObject({ status: "completed", pauses: [{ nodeId: "review", kind: "approval", resolution: "approved" }] });
  });

  it("retries only after an explicit recovery gate resolution", async () => {
    const adapter = new RecordingOrcaCliAdapter();
    adapter.queueTaskOutcome("work", { status: "failed", reason: "Tests failed." });
    adapter.queueTaskOutcome("work", { status: "completed" });
    adapter.queueGateResolution({ action: "retry" });
    const result = await new WorkflowRunner(adapter).run(await localRequest([
      { id: "start", type: "start" }, { id: "work", type: "agent", roleId: "worker", dependsOn: ["start"] }, { id: "end", type: "end", dependsOn: ["work"] },
    ]));
    expect(adapter.operations.filter((operation) => operation.kind === "dispatch")).toHaveLength(2);
    expect(adapter.operations.find((operation) => operation.kind === "create-gate")).toMatchObject({ input: { options: ["retry", "replace-profile", "terminate"] } });
    expect(result.manifest).toMatchObject({ status: "completed", pauses: [{ nodeId: "work", kind: "failure", reason: "Tests failed.", resolution: "retry" }] });
  });

  it("uses an explicitly selected replacement profile after a failed attempt", async () => {
    const adapter = new RecordingOrcaCliAdapter();
    adapter.queueTaskOutcome("work", { status: "failed", reason: "Profile exhausted." });
    adapter.queueTaskOutcome("work", { status: "completed" });
    adapter.queueGateResolution({ action: "replace-profile", profileId: "careful" });
    const result = await new WorkflowRunner(adapter).run(await localRequest([
      { id: "start", type: "start" }, { id: "work", type: "agent", roleId: "worker", dependsOn: ["start"] }, { id: "end", type: "end", dependsOn: ["work"] },
    ]));
    expect(result.manifest.nodes).toEqual([expect.objectContaining({ nodeId: "work", profileId: "careful" })]);
    expect(result.manifest.pauses).toEqual([expect.objectContaining({ resolution: "replace-profile", profileId: "careful" })]);
  });

  it("lets recovery replace a pre-existing node-level profile override", async () => {
    const adapter = new RecordingOrcaCliAdapter();
    adapter.queueTaskOutcome("work", { status: "failed", reason: "Profile exhausted." });
    adapter.queueTaskOutcome("work", { status: "completed" });
    adapter.queueGateResolution({ action: "replace-profile", profileId: "careful" });
    const base = await localRequest([
      { id: "start", type: "start" }, { id: "work", type: "agent", roleId: "worker", dependsOn: ["start"] }, { id: "end", type: "end", dependsOn: ["work"] },
    ]);
    const result = await new WorkflowRunner(adapter).run({ ...base, workflow: { ...base.workflow, nodeProfileOverrides: { work: { profileId: "fast" } } } });
    expect(result.manifest.nodes).toEqual([expect.objectContaining({ nodeId: "work", profileId: "careful" })]);
  });

  it("terminates only the affected downstream path when an escalation is resolved as terminate", async () => {
    const adapter = new RecordingOrcaCliAdapter();
    adapter.queueTaskOutcome("first", { status: "escalated", reason: "Human decision needed." });
    adapter.queueGateResolution({ action: "terminate", reason: "Stop this branch." });
    const result = await new WorkflowRunner(adapter).run(await localRequest([
      { id: "start", type: "start" },
      { id: "first", type: "agent", roleId: "worker", dependsOn: ["start"] },
      { id: "downstream", type: "agent", roleId: "worker", dependsOn: ["first"] },
      { id: "end", type: "end", dependsOn: ["downstream"] },
    ]));
    expect(adapter.operations.filter((operation) => operation.kind === "dispatch")).toHaveLength(1);
    expect(result.manifest).toMatchObject({ status: "terminated", pauses: [{ nodeId: "first", kind: "escalation", resolution: "terminate" }] });
  });
});
