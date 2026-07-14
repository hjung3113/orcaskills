import { randomUUID } from "node:crypto";
import { createReadOnlyConductor } from "../config/conductor";
import { resolveNodeAgentProfile, validateConfiguration } from "../config/resolution";
import { parseWorkflow, serializeWorkflow } from "../shared/validation";
import type { WorkflowNode } from "../shared/workflow";
import { writeRunManifest } from "./manifest";
import { approvalGate, pauseRecord, recoveryGate } from "./pause";
import { inputMappings, selectedBranchNodeIds, validateParallelWorkflow, worktreeMode } from "./parallel";
import type {
  DispatchInput, OrcaCliAdapter, PlannedOperation, PreflightResult, RunManifest, RunManifestNode,
  RunnerDiagnostic, StructuredHandoff, WorkflowPreview, WorkflowRunnerRequest,
} from "./types";

export class WorkflowPreflightError extends Error {
  constructor(readonly preflight: PreflightResult) {
    super(preflight.diagnostics.map((diagnostic) => diagnostic.message).join(" "));
    this.name = "WorkflowPreflightError";
  }
}

function nodeRoleId(node: WorkflowNode): string | undefined {
  return typeof node.roleId === "string" ? node.roleId : typeof node.role === "string" ? node.role : undefined;
}

function asStrings(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (value && typeof value === "object") return Object.keys(value as Record<string, unknown>);
  return [];
}

function agentNodesInOrder(request: WorkflowRunnerRequest): WorkflowNode[] {
  const byId = new Map(request.workflow.nodes.map((node) => [node.id, node]));
  const selected = selectedBranchNodeIds(request.workflow, request.conditionOutputs);
  const visited = new Set<string>();
  const ordered: WorkflowNode[] = [];
  const visit = (node: WorkflowNode): void => {
    if (visited.has(node.id)) return;
    visited.add(node.id);
    for (const dependency of node.dependsOn ?? []) {
      const upstream = byId.get(dependency);
      if (upstream) visit(upstream);
    }
    if (node.type === "agent" && selected.has(node.id)) ordered.push(node);
  };
  for (const node of request.workflow.nodes) visit(node);
  return ordered;
}

function executableNodesInOrder(request: WorkflowRunnerRequest): WorkflowNode[] {
  const byId = new Map(request.workflow.nodes.map((node) => [node.id, node]));
  const selected = selectedBranchNodeIds(request.workflow, request.conditionOutputs);
  const visited = new Set<string>();
  const ordered: WorkflowNode[] = [];
  const visit = (node: WorkflowNode): void => {
    if (visited.has(node.id)) return;
    visited.add(node.id);
    for (const dependency of node.dependsOn ?? []) {
      const upstream = byId.get(dependency);
      if (upstream) visit(upstream);
    }
    if ((node.type === "agent" && selected.has(node.id)) || node.type === "approval") ordered.push(node);
  };
  for (const node of request.workflow.nodes) visit(node);
  return ordered;
}

function structuredContext(node: WorkflowNode, allNodes: Map<string, WorkflowNode>): StructuredHandoff[] {
  const seen = new Set<string>();
  const agents: WorkflowNode[] = [];
  const visit = (id: string): void => {
    if (seen.has(id)) return;
    seen.add(id);
    const upstream = allNodes.get(id);
    if (!upstream) return;
    if (upstream.type === "agent") agents.push(upstream);
    else for (const dependency of upstream.dependsOn ?? []) visit(dependency);
  };
  for (const dependency of node.dependsOn ?? []) visit(dependency);
  return agents.map((upstream) => ({
    fromNodeId: upstream.id,
    fields: asStrings(upstream.outputs),
    artifactReferences: asStrings(upstream.artifactReferences),
  }));
}

function commandFor(node: WorkflowNode, executablePath?: string): string {
  const base = executablePath ?? "orca-agent";
  return typeof node.command === "string" ? node.command : base;
}

function promptFor(node: WorkflowNode, roleIntent: string): string {
  return typeof node.prompt === "string" ? node.prompt : roleIntent;
}

export class WorkflowRunner {
  constructor(private readonly adapter: OrcaCliAdapter) {}

  async preflight(request: WorkflowRunnerRequest): Promise<PreflightResult> {
    const diagnostics: RunnerDiagnostic[] = [];
    const parsed = parseWorkflow(serializeWorkflow(request.workflow));
    diagnostics.push(...parsed.diagnostics.map((diagnostic) => ({ code: "workflow" as const, message: diagnostic.message })));
    diagnostics.push(...validateConfiguration(request.portableConfiguration, request.workflowConfiguration, request.localConfiguration)
      .map((diagnostic) => ({ code: "configuration" as const, message: diagnostic.message })));
    diagnostics.push(...validateParallelWorkflow(request.workflow));
    if (!(await this.adapter.checkCli())) diagnostics.push({ code: "orca-cli", message: "Orca CLI is unavailable." });
    if (!(await this.adapter.checkRuntime())) diagnostics.push({ code: "orca-runtime", message: "Orca runtime is unavailable." });

    const resolvedProfileIds: Record<string, string> = {};
    for (const node of agentNodesInOrder(request)) {
      const roleId = nodeRoleId(node);
      if (!roleId) {
        diagnostics.push({ code: "agent-node", nodeId: node.id, message: `Agent node \"${node.id}\" needs a roleId.` });
        continue;
      }
      try { resolvedProfileIds[node.id] = resolveNodeAgentProfile(node.id, roleId, request.portableConfiguration, request.workflowConfiguration, request.localConfiguration).profile.id; }
      catch (error) { diagnostics.push({ code: "configuration", nodeId: node.id, message: error instanceof Error ? error.message : "Agent profile resolution failed." }); }
    }
    if (request.workflowConfiguration.conductor?.enabled) {
      try { createReadOnlyConductor(request.workflowConfiguration.conductor); }
      catch (error) { diagnostics.push({ code: "configuration", message: error instanceof Error ? error.message : "Conductor configuration is invalid." }); }
    }
    return { diagnostics, resolvedProfileIds, valid: diagnostics.length === 0 };
  }

  async preview(request: WorkflowRunnerRequest): Promise<WorkflowPreview> {
    const preflight = await this.preflight(request);
    if (!preflight.valid) return { preflight, operations: [] };
    const nodes = new Map(request.workflow.nodes.map((node) => [node.id, node]));
    const operations: PlannedOperation[] = [];
    for (const node of agentNodesInOrder(request)) {
      const profileId = preflight.resolvedProfileIds[node.id];
      const input: DispatchInput = {
        structuredContext: structuredContext(node, nodes),
        ...(inputMappings(node).length ? { inputMappings: inputMappings(node) } : {}),
        ...(request.workflowConfiguration.conductor?.enabled && request.conductorHandoffSummary ? { conductorHandoffSummary: request.conductorHandoffSummary } : {}),
      };
      if (worktreeMode(node) === "isolated") operations.push({ kind: "prepare-worktree", nodeId: node.id, profileId });
      operations.push({ kind: "create-terminal", nodeId: node.id, profileId });
      operations.push({ kind: "create-task", nodeId: node.id, profileId, dependsOn: (node.dependsOn ?? []).filter((id) => nodes.get(id)?.type === "agent") });
      operations.push({ kind: "dispatch", nodeId: node.id, profileId, input });
    }
    return { preflight, operations };
  }

  async run(request: WorkflowRunnerRequest): Promise<{ manifest: RunManifest; manifestPath: string }> {
    const preview = await this.preview(request);
    if (!preview.preflight.valid) throw new WorkflowPreflightError(preview.preflight);
    const nodes = new Map(request.workflow.nodes.map((node) => [node.id, node]));
    const manifestNodes: RunManifestNode[] = [];
    const pauses: RunManifest["pauses"] = [];
    const taskIds = new Map<string, string>();
    const runId = randomUUID();
    const manifest: RunManifest = { runId, workflowId: request.workflow.id, createdAt: new Date().toISOString(), nodes: manifestNodes, pauses, status: "running" };
    const persist = () => writeRunManifest(request.projectPath, manifest);
    await persist();
    const finish = async (status: RunManifest["status"]): Promise<{ manifest: RunManifest; manifestPath: string }> => {
      manifest.status = status;
      delete manifest.activePause;
      return { manifest, manifestPath: await persist() };
    };
    const dependencyTaskIds = (node: WorkflowNode): string[] => (node.dependsOn ?? []).filter((id) => taskIds.has(id)).map((id) => taskIds.get(id)!);

    for (const node of executableNodesInOrder(request)) {
      if (node.type === "approval") {
        const task = await this.adapter.createTask({
          workflowId: request.workflow.id,
          nodeId: node.id,
          prompt: typeof node.prompt === "string" ? node.prompt : `Approval required for ${node.id}`,
          dependsOn: dependencyTaskIds(node),
        });
        taskIds.set(node.id, task.taskId);
        const gate = await this.adapter.createDecisionGate(approvalGate(task.taskId, node.id, typeof node.prompt === "string" ? node.prompt : undefined));
        manifest.activePause = { nodeId: node.id, kind: "approval", reason: "Awaiting an Orca approval decision.", gateId: gate.gateId };
        await persist();
        const resolution = await this.adapter.waitForGateResolution({ gateId: gate.gateId });
        pauses.push(pauseRecord(node.id, "approval", "Awaiting an Orca approval decision.", gate.gateId, resolution));
        delete manifest.activePause;
        await persist();
        if (resolution.action !== "approved") return finish("terminated");
        continue;
      }
      if (node.type !== "agent") continue;

      let replacementProfileId: string | undefined;
      for (;;) {
        const configuration = replacementProfileId
          ? { ...request.workflowConfiguration, profileOverrides: { ...request.workflowConfiguration.profileOverrides, [nodeRoleId(node)!]: replacementProfileId } }
          : request.workflowConfiguration;
        const role = resolveNodeAgentProfile(node.id, nodeRoleId(node)!, request.portableConfiguration, configuration, request.localConfiguration);
        const prompt = promptFor(node, role.role.intent);
        const command = commandFor(node, role.localProfile?.executablePath ?? role.localProvider.executablePath);
        const worktreeId = worktreeMode(node) === "isolated"
          ? (await this.adapter.prepareWorktree({ projectPath: request.projectPath, name: `${request.workflow.id}-${node.id}-${runId.slice(0, 8)}` })).worktreeId
          : undefined;
        const terminal = await this.adapter.createTerminal({ projectPath: request.projectPath, nodeId: node.id, command, ...(worktreeId ? { worktreeId } : {}) });
        const task = await this.adapter.createTask({ workflowId: request.workflow.id, nodeId: node.id, prompt, dependsOn: dependencyTaskIds(node) });
        const input: DispatchInput = {
          structuredContext: structuredContext(node, nodes),
          ...(inputMappings(node).length ? { inputMappings: inputMappings(node) } : {}),
          ...(request.workflowConfiguration.conductor?.enabled && request.conductorHandoffSummary ? { conductorHandoffSummary: request.conductorHandoffSummary } : {}),
        };
        const dispatch = await this.adapter.dispatchTask({ taskId: task.taskId, terminalId: terminal.terminalId, prompt, input });
        const outcome = await this.adapter.waitForTaskOutcome({ taskId: task.taskId, dispatchId: dispatch.dispatchId });
        if (outcome.status === "completed") {
          taskIds.set(node.id, task.taskId);
          manifestNodes.push({ nodeId: node.id, profileId: role.profile.id, taskId: task.taskId, terminalId: terminal.terminalId, dispatchId: dispatch.dispatchId, ...(worktreeId ? { worktreeId } : {}) });
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
        // retry and replace-profile both represent an explicit Orca gate resolution;
        // no retry or profile change happens until that authoritative result arrives.
      }
    }
    return finish("completed");
  }
}
