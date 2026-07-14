import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { RecordingOrcaCliAdapter, WorkflowPreflightError, WorkflowRunner } from ".";
import type { WorkflowRunnerRequest } from ".";

const directories: string[] = [];

const request: WorkflowRunnerRequest = {
  projectPath: "/project",
  workflow: {
    id: "delivery",
    nodes: [
      { id: "start", type: "start" },
      { id: "research", type: "agent", roleId: "researcher", prompt: "Research the change", dependsOn: ["start"], outputs: ["findings"], artifactReferences: ["notes.md"], rawOutput: "must-not-forward" },
      { id: "implement", type: "agent", roleId: "implementer", dependsOn: ["research"], inputs: { findings: "research.findings" }, rawOutput: "must-not-forward" },
      { id: "end", type: "end", dependsOn: ["implement"] },
    ],
  },
  portableConfiguration: {
    roles: [
      { id: "researcher", intent: "Research the requested change", profileId: "fast" },
      { id: "implementer", intent: "Implement the requested change", profileId: "balanced" },
    ],
    profiles: [
      { id: "fast", provider: "codex", model: "gpt-5-mini" },
      { id: "balanced", provider: "codex", model: "gpt-5" },
    ],
  },
  workflowConfiguration: { conductor: { enabled: true, profileId: "fast" } },
  localConfiguration: { providers: { codex: { enabled: true, executablePath: "/usr/local/bin/codex" } } },
  conductorHandoffSummary: "Keep the implementation narrowly scoped.",
};

afterEach(async () => Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))));

describe("WorkflowRunner", () => {
  it("previews resolved sequential operations and only structured handoff context", async () => {
    const runner = new WorkflowRunner(new RecordingOrcaCliAdapter());
    const preview = await runner.preview(request);
    expect(preview.preflight).toMatchObject({ valid: true, resolvedProfileIds: { research: "fast", implement: "balanced" } });
    expect(preview.operations.map((operation) => `${operation.kind}:${operation.nodeId}`)).toEqual([
      "create-terminal:research", "create-task:research", "dispatch:research",
      "create-terminal:implement", "create-task:implement", "dispatch:implement",
    ]);
    expect(preview.operations[5]).toMatchObject({
      input: {
        structuredContext: [{ fromNodeId: "research", fields: ["findings"], artifactReferences: ["notes.md"] }],
        conductorHandoffSummary: "Keep the implementation narrowly scoped.",
      },
    });
    expect(JSON.stringify(preview.operations)).not.toContain("must-not-forward");
  });

  it("runs in dependency order through the adapter and writes a local ignored manifest", async () => {
    const projectPath = await mkdtemp(join(tmpdir(), "workflow-runner-"));
    directories.push(projectPath);
    const adapter = new RecordingOrcaCliAdapter();
    const result = await new WorkflowRunner(adapter).run({ ...request, projectPath });
    expect(adapter.operations.map((operation) => operation.kind)).toEqual([
      "create-terminal", "create-task", "dispatch", "create-terminal", "create-task", "dispatch",
    ]);
    expect(adapter.operations[4]).toMatchObject({ input: { dependsOn: ["task-research"] } });
    expect(result.manifest.nodes).toEqual([
      { nodeId: "research", profileId: "fast", taskId: "task-research", terminalId: "terminal-research", dispatchId: "dispatch-task-research" },
      { nodeId: "implement", profileId: "balanced", taskId: "task-implement", terminalId: "terminal-implement", dispatchId: "dispatch-task-implement" },
    ]);
    expect(result.manifestPath).toContain(join(projectPath, ".orca", "workflow-runs"));
    expect(await readFile(join(projectPath, ".orca", ".gitignore"), "utf8")).toBe("workflow-runs/\n");
    expect(JSON.parse(await readFile(result.manifestPath, "utf8"))).toMatchObject({ workflowId: "delivery", nodes: result.manifest.nodes });
  });

  it("rejects invalid workflow, unavailable profiles, CLI, and runtime before any operations", async () => {
    const adapter = new RecordingOrcaCliAdapter(false, false);
    const runner = new WorkflowRunner(adapter);
    const invalid = {
      ...request,
      workflow: { ...request.workflow, nodes: request.workflow.nodes.filter((node) => node.id !== "end") },
      localConfiguration: { providers: {} },
    };
    const preflight = await runner.preflight(invalid);
    expect(preflight.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(expect.arrayContaining(["workflow", "configuration", "orca-cli", "orca-runtime"]));
    await expect(runner.run(invalid)).rejects.toBeInstanceOf(WorkflowPreflightError);
    expect(adapter.operations).toEqual([]);
  });

  it("reads an enabled Conductor from workflow YAML when no separate workflow configuration is supplied", async () => {
    const runner = new WorkflowRunner(new RecordingOrcaCliAdapter());
    const preflight = await runner.preflight({
      ...request,
      workflow: { ...request.workflow, conductor: { enabled: true, profileId: "missing" } },
      workflowConfiguration: {},
    });
    expect(preflight.diagnostics.map((diagnostic) => diagnostic.message)).toEqual(expect.arrayContaining([expect.stringContaining("Conductor references missing profile")]))
  });
});
