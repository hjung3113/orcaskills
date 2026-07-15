import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AgentOutcome, DecisionGateInput, DecisionGateStatus, DispatchInput, GateResolution, OrcaCliAdapter } from "./types";

const execFileAsync = promisify(execFile);

function identifier(value: unknown, keys: string[]): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  for (const key of keys) if (typeof record[key] === "string") return record[key];
  for (const nested of Object.values(record)) {
    const found = identifier(nested, keys);
    if (found) return found;
  }
  return undefined;
}

function records(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap(records);
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  return [record, ...Object.values(record).flatMap(records)];
}

const wait = (milliseconds: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, milliseconds));

/** Production adapter; tests should use RecordingOrcaCliAdapter instead. */
export class CommandOrcaCliAdapter implements OrcaCliAdapter {
  constructor(private readonly command = process.env.ORCA_CLI_COMMAND ?? "orca") {}

  private async run(args: string[]): Promise<Record<string, unknown>> {
    const { stdout } = await execFileAsync(this.command, [...args, "--json"]);
    return JSON.parse(stdout) as Record<string, unknown>;
  }

  async checkCli(): Promise<boolean> {
    try { await execFileAsync(this.command, ["--version"]); return true; } catch { return false; }
  }
  async checkRuntime(): Promise<boolean> {
    try { await this.run(["status"]); return true; } catch { return false; }
  }
  async prepareWorktree(input: { projectPath: string; name: string }): Promise<{ worktreeId: string }> {
    const result = await this.run(["worktree", "create", "--name", input.name, "--parent-worktree", `path:${input.projectPath}`, "--setup", "skip"]);
    const worktreeId = identifier(result, ["worktreeId", "id"]);
    if (!worktreeId) throw new Error("Orca did not return a Worktree id.");
    return { worktreeId };
  }
  async createTerminal(input: { projectPath: string; nodeId: string; command: string; worktreeId?: string }): Promise<{ terminalId: string }> {
    const result = await this.run(["terminal", "create", "--worktree", input.worktreeId ?? `path:${input.projectPath}`, "--title", input.nodeId, "--command", input.command]);
    const terminalId = identifier(result, ["handle", "terminalId"]);
    if (!terminalId) throw new Error("Orca did not return a terminal handle.");
    return { terminalId };
  }
  async createTask(input: { workflowId: string; nodeId: string; prompt: string; dependsOn: string[] }): Promise<{ taskId: string }> {
    const result = await this.run(["orchestration", "task-create", "--spec", input.prompt]);
    const taskId = identifier(result, ["taskId", "id"]);
    if (!taskId) throw new Error("Orca did not return a task id.");
    return { taskId };
  }
  async dispatchTask(input: { taskId: string; terminalId: string; prompt: string; input: DispatchInput }): Promise<{ dispatchId: string }> {
    const result = await this.run(["orchestration", "dispatch", "--task", input.taskId, "--to", input.terminalId, "--inject"]);
    const dispatchId = identifier(result, ["dispatchId", "id"]);
    if (!dispatchId) throw new Error("Orca did not return a dispatch id.");
    return { dispatchId };
  }
  async createDecisionGate(input: DecisionGateInput): Promise<{ gateId: string }> {
    const result = await this.run(["orchestration", "gate-create", "--task", input.taskId, "--question", input.question, "--options", JSON.stringify(input.options)]);
    const gateId = identifier(result, ["gateId", "id"]);
    if (!gateId) throw new Error("Orca did not return a decision gate id.");
    return { gateId };
  }
  async waitForTaskOutcome(input: { taskId: string; dispatchId: string }): Promise<AgentOutcome> {
    for (;;) {
      const result = await this.run(["orchestration", "task-list"]);
      const task = records(result).find((record) => record.taskId === input.taskId || record.id === input.taskId);
      const status = typeof task?.status === "string" ? task.status : "";
      if (status === "completed") return { status: "completed" };
      if (status === "failed") return { status: "failed", reason: typeof task?.reason === "string" ? task.reason : "Task failed." };
      if (status === "blocked" || status === "escalated") return { status: "escalated", reason: typeof task?.reason === "string" ? task.reason : "Task escalated." };
      await wait(500);
    }
  }
  async waitForGateResolution(input: { gateId: string }): Promise<GateResolution> {
    for (;;) {
      const result = await this.run(["orchestration", "gate-list"]);
      const gate = records(result).find((record) => record.gateId === input.gateId || record.id === input.gateId);
      if (gate?.status === "resolved") {
        const action = typeof gate.resolution === "string" ? gate.resolution : undefined;
        if (action === "approved" || action === "retry") return { action };
        if (action === "replace-profile" && typeof gate.profileId === "string") return { action, profileId: gate.profileId };
        return { action: "terminate", reason: typeof gate.reason === "string" ? gate.reason : "Gate was not approved." };
      }
      await wait(500);
    }
  }
  async listDecisionGates(): Promise<DecisionGateStatus[]> {
    const result = await this.run(["orchestration", "gate-list"]);
    return records(result).flatMap((gate) => {
      const gateId = typeof gate.gateId === "string" ? gate.gateId : typeof gate.id === "string" ? gate.id : undefined;
      if (!gateId || (gate.status !== "pending" && gate.status !== "resolved")) return [];
      const resolution = typeof gate.resolution === "string" && ["approved", "retry", "replace-profile", "terminate"].includes(gate.resolution)
        ? gate.resolution as GateResolution["action"] : undefined;
      return [{ gateId, status: gate.status, ...(resolution ? { resolution } : {}) }];
    });
  }
  async closeTerminal(terminalId: string): Promise<void> { await this.run(["terminal", "close", "--terminal", terminalId]); }
  async removeWorktree(worktreeId: string): Promise<void> { await this.run(["worktree", "rm", "--worktree", `id:${worktreeId}`, "--force"]); }
}
