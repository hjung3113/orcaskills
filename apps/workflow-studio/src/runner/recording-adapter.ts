import type { AgentOutcome, DecisionGateInput, DecisionGateStatus, DispatchInput, GateResolution, OrcaCliAdapter } from "./types";

export type RecordedOrcaOperation =
  | { kind: "prepare-worktree"; input: { projectPath: string; name: string } }
  | { kind: "create-terminal"; input: { projectPath: string; nodeId: string; command: string; worktreeId?: string } }
  | { kind: "create-task"; input: { workflowId: string; nodeId: string; prompt: string; dependsOn: string[] } }
  | { kind: "dispatch"; input: { taskId: string; terminalId: string; prompt: string; input: DispatchInput } }
  | { kind: "create-gate"; input: DecisionGateInput }
  | { kind: "close-terminal"; terminalId: string }
  | { kind: "remove-worktree"; worktreeId: string };

/** Controlled adapter fake for runner integration tests. */
export class RecordingOrcaCliAdapter implements OrcaCliAdapter {
  readonly operations: RecordedOrcaOperation[] = [];
  readonly taskWaits: { taskId: string; dispatchId: string }[] = [];
  readonly gateWaits: { gateId: string }[] = [];
  private readonly taskOutcomes = new Map<string, AgentOutcome[]>();
  private readonly gateResolutions: GateResolution[] = [];
  private readonly gateStatuses: DecisionGateStatus[] = [];
  constructor(readonly cliAvailable = true, readonly runtimeAvailable = true) {}

  async checkCli(): Promise<boolean> { return this.cliAvailable; }
  async checkRuntime(): Promise<boolean> { return this.runtimeAvailable; }
  async prepareWorktree(input: { projectPath: string; name: string }): Promise<{ worktreeId: string }> {
    this.operations.push({ kind: "prepare-worktree", input });
    return { worktreeId: `worktree-${input.name}` };
  }
  async createTerminal(input: { projectPath: string; nodeId: string; command: string; worktreeId?: string }): Promise<{ terminalId: string }> {
    this.operations.push({ kind: "create-terminal", input });
    return { terminalId: `terminal-${input.nodeId}` };
  }
  async createTask(input: { workflowId: string; nodeId: string; prompt: string; dependsOn: string[] }): Promise<{ taskId: string }> {
    this.operations.push({ kind: "create-task", input });
    return { taskId: `task-${input.nodeId}` };
  }
  async dispatchTask(input: { taskId: string; terminalId: string; prompt: string; input: DispatchInput }): Promise<{ dispatchId: string }> {
    this.operations.push({ kind: "dispatch", input });
    return { dispatchId: `dispatch-${input.taskId}` };
  }
  async createDecisionGate(input: DecisionGateInput): Promise<{ gateId: string }> {
    this.operations.push({ kind: "create-gate", input });
    return { gateId: `gate-${input.nodeId}-${this.operations.filter((operation) => operation.kind === "create-gate").length}` };
  }
  queueTaskOutcome(nodeId: string, outcome: AgentOutcome): void {
    const outcomes = this.taskOutcomes.get(nodeId) ?? [];
    outcomes.push(outcome);
    this.taskOutcomes.set(nodeId, outcomes);
  }
  queueGateResolution(resolution: GateResolution): void { this.gateResolutions.push(resolution); }
  setDecisionGates(gates: DecisionGateStatus[]): void { this.gateStatuses.splice(0, this.gateStatuses.length, ...gates); }
  async waitForTaskOutcome(input: { taskId: string; dispatchId: string }): Promise<AgentOutcome> {
    this.taskWaits.push(input);
    const nodeId = input.taskId.replace(/^task-/, "").replace(/-\d+$/, "");
    return this.taskOutcomes.get(nodeId)?.shift() ?? { status: "completed" };
  }
  async waitForGateResolution(input: { gateId: string }): Promise<GateResolution> {
    this.gateWaits.push(input);
    return this.gateResolutions.shift() ?? { action: "approved" };
  }
  async listDecisionGates(): Promise<DecisionGateStatus[]> { return [...this.gateStatuses]; }
  async closeTerminal(terminalId: string): Promise<void> { this.operations.push({ kind: "close-terminal", terminalId }); }
  async removeWorktree(worktreeId: string): Promise<void> { this.operations.push({ kind: "remove-worktree", worktreeId }); }
}
