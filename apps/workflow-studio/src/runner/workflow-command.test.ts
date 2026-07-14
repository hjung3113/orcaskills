import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { saveLocalConfiguration, savePortableConfiguration } from "../config/storage";
import { saveWorkflowFile } from "../shared/project";
import { writeRunManifest } from "./manifest";
import { RecordingOrcaCliAdapter } from "./recording-adapter";
import { ProjectWorkflowCommands } from "./workflow-command";

const directories: string[] = [];
afterEach(async () => Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))));

async function project() {
  const projectPath = await mkdtemp(join(tmpdir(), "workflow-command-project-"));
  const localDataPath = await mkdtemp(join(tmpdir(), "workflow-command-local-"));
  directories.push(projectPath, localDataPath);
  await savePortableConfiguration(projectPath, {
    roles: [{ id: "worker", intent: "Do the work", profileId: "default" }],
    profiles: [{ id: "default", provider: "codex", model: "gpt-5" }],
  });
  await saveLocalConfiguration(localDataPath, projectPath, { providers: { codex: { enabled: true, executablePath: "codex" } } });
  return { projectPath, localDataPath };
}

const validWorkflow = `id: command-workflow
nodes:
  - id: start
    type: start
  - id: work
    type: agent
    roleId: worker
    dependsOn: [start]
  - id: end
    type: end
    dependsOn: [work]
`;

describe("ProjectWorkflowCommands", () => {
  it("lists project-local workflow definitions", async () => {
    const { projectPath, localDataPath } = await project();
    await saveWorkflowFile(projectPath, "command-workflow", validWorkflow);
    const commands = new ProjectWorkflowCommands({ adapter: new RecordingOrcaCliAdapter(), localDataPath });
    await expect(commands.list(projectPath)).resolves.toEqual([expect.objectContaining({ id: "command-workflow" })]);
  });

  it("reports YAML and runner preflight diagnostics through validate", async () => {
    const { projectPath, localDataPath } = await project();
    await saveWorkflowFile(projectPath, "invalid", "id: invalid\nnodes: not-a-list\n");
    await saveWorkflowFile(projectPath, "command-workflow", validWorkflow);
    const commands = new ProjectWorkflowCommands({ adapter: new RecordingOrcaCliAdapter(false, false), localDataPath });
    await expect(commands.validate(projectPath, "invalid")).resolves.toMatchObject({ valid: false, diagnostics: [expect.objectContaining({ message: expect.stringContaining("nodes list") })] });
    await expect(commands.validate(projectPath, "command-workflow")).resolves.toMatchObject({ valid: false, preflight: { diagnostics: expect.arrayContaining([expect.objectContaining({ code: "orca-cli" }), expect.objectContaining({ code: "orca-runtime" })]) } });
  });

  it("starts a validated run through the selected workflow profile, not the invoking terminal", async () => {
    const { projectPath, localDataPath } = await project();
    await saveWorkflowFile(projectPath, "command-workflow", validWorkflow);
    const adapter = new RecordingOrcaCliAdapter();
    const result = await new ProjectWorkflowCommands({ adapter, localDataPath }).run(projectPath, "command-workflow");
    expect(result.manifest).toMatchObject({ workflowId: "command-workflow", status: "completed", nodes: [expect.objectContaining({ nodeId: "work", profileId: "default" })] });
    expect(adapter.operations).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "dispatch" })]));
  });

  it("reports manifest pauses and only current Orca pending gates as status", async () => {
    const { projectPath, localDataPath } = await project();
    const adapter = new RecordingOrcaCliAdapter();
    adapter.setDecisionGates([{ gateId: "gate-live", status: "pending" }, { gateId: "unrelated", status: "pending" }]);
    await writeRunManifest(projectPath, {
      runId: "run-live", workflowId: "command-workflow", createdAt: "2026-07-15T00:00:00.000Z", nodes: [], pauses: [], status: "running",
      activePause: { nodeId: "work", kind: "failure", reason: "Tests failed.", gateId: "gate-live" },
    });
    const status = await new ProjectWorkflowCommands({ adapter, localDataPath }).status(projectPath, "run-live");
    expect(status).toMatchObject({ activeDecisionGates: [{ gateId: "gate-live", status: "pending" }], pausedFailure: { nodeId: "work", kind: "failure", reason: "Tests failed." } });
  });
});
