import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AgentWorkflowToolkitAdapter, validateVerificationEvidence } from "./agent-workflow";
import { RecordingOrcaCliAdapter } from "./recording-adapter";
import { WorkflowRunner } from "./workflow-runner";
import { createAgentWorkflow } from "../shared/agent-workflow";

const identity = { issueNumber: 12, branch: "agent/demo", headSha: "abc123" };
const directories: string[] = [];

afterEach(async () => Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))));

describe("Agent Workflow evidence contract", () => {
  it("requires a current-head PASS artifact from VERIFIER", () => {
    expect(validateVerificationEvidence({ producer_role: "VERIFIER", classifier: "PASS", issue: 12, branch: "agent/demo", head_sha: "abc123", verdict: { exit_code: 0, failed: 0, passed: 3 } }, identity)).toEqual({ valid: true });
    expect(validateVerificationEvidence({ producer_role: "VERIFIER", classifier: "PASS", issue: 12, branch: "agent/demo", head_sha: "old", verdict: { exit_code: 0, failed: 0, passed: 3 } }, identity)).toMatchObject({ valid: false, reason: expect.stringContaining("stale") });
  });

  it("does not accept an unconfigured toolkit or arbitrary command", () => {
    const adapter = new AgentWorkflowToolkitAdapter({ enabled: false });
    expect(adapter.preflight()).resolves.toEqual(["Agent Workflow requires an enabled machine-local toolkitRoot."]);
    expect(() => adapter.command("dispatch-codex")).toThrow("configured locally");
  });

  it("uses the constrained toolkit commands, gates release only after PASS evidence, and releases recorded resources", async () => {
    const projectPath = await mkdtemp(join(tmpdir(), "agent-workflow-project-"));
    const toolkitRoot = await mkdtemp(join(tmpdir(), "agent-workflow-toolkit-"));
    directories.push(projectPath, toolkitRoot);
    await mkdir(join(toolkitRoot, "scripts"));
    await Promise.all(["cmux-dispatch.sh", "conductor-rebuild.sh", "verify.sh", "review-archive.sh"].map(async (file) => { const path = join(toolkitRoot, "scripts", file); await writeFile(path, "#!/bin/sh\n"); await chmod(path, 0o755); }));
    const workflow = createAgentWorkflow(12);
    const adapter = new RecordingOrcaCliAdapter();
    const result = await new WorkflowRunner(adapter).run({
      projectPath,
      workflow,
      portableConfiguration: {
        roles: ["architect", "implementer", "reviewer", "verifier"].map((id) => ({ id, intent: id, profileId: id })),
        profiles: ["architect", "implementer", "reviewer", "verifier"].map((id) => ({ id, provider: "codex", model: "gpt-5" })),
      },
      workflowConfiguration: {},
      localConfiguration: { providers: { codex: { enabled: true, executablePath: "/usr/bin/codex" } }, agentWorkflow: { enabled: true, toolkitRoot } },
      agentWorkflowIdentity: identity,
      agentWorkflowEvidence: { producer_role: "VERIFIER", classifier: "PASS", issue: 12, branch: "agent/demo", head_sha: "abc123", verdict: { exit_code: 0, failed: 0, passed: 2 } },
    });
    expect(result.manifest.status).toBe("completed");
    expect(result.manifest.agentWorkflow).toMatchObject({ evidence: { valid: true }, resourceLease: { worktreeId: expect.any(String), terminalIds: expect.any(Array) }, cleanup: { releasedResources: true, evidenceArchived: true } });
    expect(adapter.operations.filter((operation) => operation.kind === "create-terminal")).toEqual(expect.arrayContaining([
      expect.objectContaining({ input: expect.objectContaining({ nodeId: "implement", command: expect.stringContaining("cmux-dispatch.sh") }) }),
      expect.objectContaining({ input: expect.objectContaining({ nodeId: "verify", command: expect.stringContaining("verify.sh") }) }),
      expect.objectContaining({ input: expect.objectContaining({ nodeId: "review", command: "/usr/bin/codex" }) }),
    ]));
    expect(adapter.operations).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "create-gate", input: expect.objectContaining({ nodeId: "release" }) }), expect.objectContaining({ kind: "remove-worktree" })]));
  });

  it("opens a recovery gate instead of a Release Captain gate for stale evidence", async () => {
    const projectPath = await mkdtemp(join(tmpdir(), "agent-workflow-stale-"));
    const toolkitRoot = await mkdtemp(join(tmpdir(), "agent-workflow-toolkit-"));
    directories.push(projectPath, toolkitRoot);
    await mkdir(join(toolkitRoot, "scripts"));
    await Promise.all(["cmux-dispatch.sh", "conductor-rebuild.sh", "verify.sh", "review-archive.sh"].map(async (file) => { const path = join(toolkitRoot, "scripts", file); await writeFile(path, "#!/bin/sh\n"); await chmod(path, 0o755); }));
    const adapter = new RecordingOrcaCliAdapter();
    const result = await new WorkflowRunner(adapter).run({
      projectPath,
      workflow: createAgentWorkflow(12),
      portableConfiguration: { roles: ["architect", "implementer", "reviewer", "verifier"].map((id) => ({ id, intent: id, profileId: id })), profiles: ["architect", "implementer", "reviewer", "verifier"].map((id) => ({ id, provider: "codex", model: "gpt-5" })) },
      workflowConfiguration: {},
      localConfiguration: { providers: { codex: { enabled: true, executablePath: "/usr/bin/codex" } }, agentWorkflow: { enabled: true, toolkitRoot } },
      agentWorkflowIdentity: identity,
      agentWorkflowEvidence: { producer_role: "VERIFIER", classifier: "PASS", issue: 12, branch: "agent/demo", head_sha: "old", verdict: { exit_code: 0, failed: 0, passed: 1 } },
    });
    expect(result.manifest.status).toBe("terminated");
    expect(result.manifest.agentWorkflow?.evidence).toMatchObject({ valid: false, reason: expect.stringContaining("stale") });
    expect(result.manifest.agentWorkflow?.cleanup).toMatchObject({ releasedResources: true, evidenceArchived: true });
    const releaseGates = adapter.operations.filter((operation) => operation.kind === "create-gate" && operation.input.nodeId === "release");
    expect(releaseGates).toHaveLength(1);
    expect(releaseGates[0]).toMatchObject({ input: { options: ["retry", "replace-profile", "terminate"] } });
    expect(adapter.operations.filter((operation) => operation.kind === "close-terminal")).toHaveLength(4);
    expect(adapter.operations.filter((operation) => operation.kind === "remove-worktree")).toHaveLength(1);
  });
});
