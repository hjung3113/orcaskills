import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { resolveNodeAgentProfile } from "../config/resolution";
import type { WorkflowNode } from "../shared/workflow";
import { AgentWorkflowToolkitAdapter, type AgentWorkflowIdentity, validateVerificationEvidence } from "./agent-workflow";
import { writeRunManifest } from "./manifest";
import { approvalGate, pauseRecord, recoveryGate } from "./pause";
import { isAgentWorkflow, resolvedWorkflowConfiguration } from "./run-readiness";
import { commandFor, dispatchInput, executableNodesInOrder, nodeRoleId, promptFor, worktreeMode } from "./workflow-topology";
import type { OrcaCliAdapter, RunManifest, RunManifestNode, WorkflowRunnerRequest } from "./types";

const execFileAsync = promisify(execFile);

async function liveIdentity(projectPath: string, issueNumber: number): Promise<AgentWorkflowIdentity> {
  const [branch, head] = await Promise.all([
    execFileAsync("git", ["-C", projectPath, "branch", "--show-current"]).then(({ stdout }) => stdout.trim()),
    execFileAsync("git", ["-C", projectPath, "rev-parse", "HEAD"]).then(({ stdout }) => stdout.trim()),
  ]);
  if (!branch || !head) throw new Error("Agent Workflow requires a checked-out Git branch and HEAD.");
  return { issueNumber, branch, headSha: head };
}

async function verifierEvidence(request: WorkflowRunnerRequest, issueNumber: number): Promise<{
  evidence: import("./agent-workflow").VerificationEvidence | undefined;
  path: string;
}> {
  const path = join(request.projectPath, ".review", `ISSUE-${issueNumber}-VERIFY.json`);
  if (request.agentWorkflowEvidence) return { evidence: request.agentWorkflowEvidence, path };
  try { return { evidence: JSON.parse(await readFile(path, "utf8")) as import("./agent-workflow").VerificationEvidence, path }; }
  catch { return { evidence: undefined, path }; }
}

/** Owns one run's manifest, authoritative pauses, dispatch attempts, evidence, and resource lease. */
export class WorkflowExecution {
  constructor(private readonly adapter: OrcaCliAdapter) {}

  async execute(request: WorkflowRunnerRequest): Promise<{ manifest: RunManifest; manifestPath: string }> {
    const nodes = new Map(request.workflow.nodes.map((node) => [node.id, node]));
    const baseWorkflowConfiguration = resolvedWorkflowConfiguration(request);
    const manifestNodes: RunManifestNode[] = [];
    const pauses: RunManifest["pauses"] = [];
    const taskIds = new Map<string, string>();
    const runId = randomUUID();
    const manifest: RunManifest = {
      runId,
      workflowId: request.workflow.id,
      createdAt: new Date().toISOString(),
      nodes: manifestNodes,
      pauses,
      status: "running",
    };
    const agentWorkflow = isAgentWorkflow(request);
    const toolkit = agentWorkflow ? new AgentWorkflowToolkitAdapter(request.localConfiguration.agentWorkflow) : undefined;
    const template = request.workflow.template;
    const identity = agentWorkflow && template
      ? (request.agentWorkflowIdentity ?? await liveIdentity(request.projectPath, template.issueNumber))
      : undefined;
    const agentTerminalIds: string[] = [];
    let agentWorktreeId: string | undefined;
    if (agentWorkflow && identity && template) {
      manifest.agentWorkflow = {
        templateVersion: template.version,
        identity,
        resourceLease: { evidenceDirectory: join(request.projectPath, ".review"), terminalIds: agentTerminalIds },
        evidence: {
          valid: false,
          reason: "Verifier evidence has not been evaluated.",
          path: join(request.projectPath, ".review", `ISSUE-${template.issueNumber}-VERIFY.json`),
        },
      };
    }
    const persist = () => writeRunManifest(request.projectPath, manifest);
    await persist();
    const finish = async (status: RunManifest["status"]): Promise<{ manifest: RunManifest; manifestPath: string }> => {
      manifest.status = status;
      delete manifest.activePause;
      if (manifest.agentWorkflow && (status === "completed" || status === "terminated")) {
        let evidenceArchived = false;
        if (toolkit) {
          await toolkit.archive(manifest.agentWorkflow.resourceLease.evidenceDirectory);
          evidenceArchived = true;
        }
        await Promise.all(agentTerminalIds.map((terminalId) => this.adapter.closeTerminal?.(terminalId)));
        if (agentWorktreeId) await this.adapter.removeWorktree?.(agentWorktreeId);
        manifest.agentWorkflow.cleanup = {
          completedAt: new Date().toISOString(),
          releasedResources: true,
          evidenceArchived,
        };
      }
      return { manifest, manifestPath: await persist() };
    };
    const dependencyTaskIds = (node: WorkflowNode): string[] => (node.dependsOn ?? [])
      .filter((id) => taskIds.has(id))
      .map((id) => taskIds.get(id)!);

    for (const node of executableNodesInOrder(request)) {
      if (node.type === "approval") {
        const task = await this.adapter.createTask({
          workflowId: request.workflow.id,
          nodeId: node.id,
          prompt: typeof node.prompt === "string" ? node.prompt : `Approval required for ${node.id}`,
          dependsOn: dependencyTaskIds(node),
        });
        taskIds.set(node.id, task.taskId);
        if (agentWorkflow && node.id === "release" && manifest.agentWorkflow && identity && template) {
          const evidence = await verifierEvidence(request, template.issueNumber);
          const result = validateVerificationEvidence(evidence.evidence, identity);
          manifest.agentWorkflow.evidence = { ...result, path: evidence.path };
          await persist();
          if (!result.valid) {
            const reason = result.reason ?? "Verifier evidence is invalid.";
            const gate = await this.adapter.createDecisionGate(recoveryGate(task.taskId, node.id, reason));
            manifest.activePause = { nodeId: node.id, kind: "failure", reason, gateId: gate.gateId };
            await persist();
            const resolution = await this.adapter.waitForGateResolution({ gateId: gate.gateId });
            pauses.push(pauseRecord(node.id, "failure", reason, gate.gateId, resolution));
            return finish("terminated");
          }
        }
        const gate = await this.adapter.createDecisionGate(
          approvalGate(task.taskId, node.id, typeof node.prompt === "string" ? node.prompt : undefined),
        );
        const reason = "Awaiting an Orca approval decision.";
        manifest.activePause = { nodeId: node.id, kind: "approval", reason, gateId: gate.gateId };
        await persist();
        const resolution = await this.adapter.waitForGateResolution({ gateId: gate.gateId });
        pauses.push(pauseRecord(node.id, "approval", reason, gate.gateId, resolution));
        delete manifest.activePause;
        await persist();
        if (resolution.action !== "approved") return finish("terminated");
        continue;
      }
      if (node.type !== "agent") continue;

      let replacementProfileId: string | undefined;
      for (;;) {
        const configuration = replacementProfileId
          ? { ...baseWorkflowConfiguration, nodeProfileOverrides: { ...baseWorkflowConfiguration.nodeProfileOverrides, [node.id]: { profileId: replacementProfileId } } }
          : baseWorkflowConfiguration;
        const role = resolveNodeAgentProfile(
          node.id, nodeRoleId(node)!, request.portableConfiguration, configuration, request.localConfiguration,
        );
        const prompt = promptFor(node, role.role.intent);
        const command = agentWorkflow && toolkit
          ? node.id === "implement"
            ? toolkit.command("dispatch-codex")
            : node.id === "verify"
              ? toolkit.command("verify")
              : commandFor(node, role.localProfile?.executablePath ?? role.localProvider.executablePath)
          : commandFor(node, role.localProfile?.executablePath ?? role.localProvider.executablePath);
        const worktreeId = worktreeMode(node) === "isolated"
          ? (await this.adapter.prepareWorktree({
            projectPath: request.projectPath,
            name: `${request.workflow.id}-${node.id}-${runId.slice(0, 8)}`,
          })).worktreeId
          : undefined;
        if (agentWorkflow && worktreeId) {
          agentWorktreeId = worktreeId;
          if (manifest.agentWorkflow) manifest.agentWorkflow.resourceLease.worktreeId = worktreeId;
        }
        const terminal = await this.adapter.createTerminal({
          projectPath: request.projectPath,
          nodeId: node.id,
          command,
          ...(worktreeId ? { worktreeId } : {}),
        });
        if (agentWorkflow) agentTerminalIds.push(terminal.terminalId);
        const task = await this.adapter.createTask({
          workflowId: request.workflow.id,
          nodeId: node.id,
          prompt,
          dependsOn: dependencyTaskIds(node),
        });
        const dispatch = await this.adapter.dispatchTask({
          taskId: task.taskId,
          terminalId: terminal.terminalId,
          prompt,
          input: dispatchInput(node, nodes, baseWorkflowConfiguration, request),
        });
        const outcome = await this.adapter.waitForTaskOutcome({ taskId: task.taskId, dispatchId: dispatch.dispatchId });
        if (outcome.status === "completed") {
          taskIds.set(node.id, task.taskId);
          manifestNodes.push({
            nodeId: node.id,
            profileId: role.profile.id,
            taskId: task.taskId,
            terminalId: terminal.terminalId,
            dispatchId: dispatch.dispatchId,
            ...(worktreeId ? { worktreeId } : {}),
          });
          break;
        }
        const kind = outcome.status === "escalated" ? "escalation" : "failure";
        const gate = await this.adapter.createDecisionGate(recoveryGate(task.taskId, node.id, outcome.reason));
        manifest.activePause = { nodeId: node.id, kind, reason: outcome.reason, gateId: gate.gateId };
        await persist();
        const resolution = await this.adapter.waitForGateResolution({ gateId: gate.gateId });
        pauses.push(pauseRecord(node.id, kind, outcome.reason, gate.gateId, resolution));
        delete manifest.activePause;
        await persist();
        if (resolution.action === "terminate" || resolution.action === "approved") return finish("terminated");
        if (resolution.action === "replace-profile") replacementProfileId = resolution.profileId;
      }
    }
    return finish("completed");
  }
}
