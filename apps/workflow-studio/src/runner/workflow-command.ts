import { homedir } from "node:os";
import { join } from "node:path";
import { readLocalConfiguration, readPortableConfiguration } from "../config/storage";
import { listWorkflowFiles, readWorkflowFile } from "../shared/project";
import { parseWorkflow } from "../shared/validation";
import type { WorkflowConfiguration } from "../shared/config";
import { listRunManifests, readRunManifest } from "./manifest";
import type { DecisionGateStatus, OrcaCliAdapter, PreflightResult, RunManifest, WorkflowRunnerRequest } from "./types";
import { WorkflowRunner } from "./workflow-runner";

export interface ProjectWorkflowCommandOptions {
  adapter: OrcaCliAdapter;
  /** Machine-local configuration root; it is never read from the Git project. */
  localDataPath?: string;
  workflowConfiguration?: WorkflowConfiguration;
}

export interface WorkflowStatus {
  manifest: RunManifest;
  /** Read from Orca when the adapter supports it; never fabricated by Studio. */
  activeDecisionGates: DecisionGateStatus[];
  pausedFailure?: RunManifest["activePause"];
}

function defaultLocalDataPath(): string {
  return process.env.ORCA_WORKFLOW_LOCAL_DATA_PATH ?? join(homedir(), ".orca-workflow-studio");
}

/** Command boundary shared by Codex and Claude project-local Agent Skills. */
export class ProjectWorkflowCommands {
  private readonly runner: WorkflowRunner;
  private readonly localDataPath: string;
  private readonly workflowConfiguration: WorkflowConfiguration;

  constructor(private readonly options: ProjectWorkflowCommandOptions) {
    this.runner = new WorkflowRunner(options.adapter);
    this.localDataPath = options.localDataPath ?? defaultLocalDataPath();
    this.workflowConfiguration = options.workflowConfiguration ?? {};
  }

  async list(projectPath: string) {
    return listWorkflowFiles(projectPath);
  }

  async validate(projectPath: string, workflowId: string): Promise<{ workflowId: string; valid: boolean; preflight?: PreflightResult; diagnostics: { message: string }[] }> {
    const source = await this.workflowSource(projectPath, workflowId);
    const document = parseWorkflow(source);
    if (!document.workflow || document.diagnostics.length) return { workflowId, valid: false, diagnostics: document.diagnostics };
    const preflight = await this.runner.preflight(await this.request(projectPath, document.workflow));
    return { workflowId, valid: preflight.valid, preflight, diagnostics: preflight.diagnostics };
  }

  async run(projectPath: string, workflowId: string) {
    const source = await this.workflowSource(projectPath, workflowId);
    const document = parseWorkflow(source);
    if (!document.workflow || document.diagnostics.length) throw new Error(document.diagnostics.map((diagnostic) => diagnostic.message).join(" "));
    return this.runner.run(await this.request(projectPath, document.workflow));
  }

  async status(projectPath: string, runId?: string): Promise<WorkflowStatus | undefined> {
    const manifest = runId ? await readRunManifest(projectPath, runId) : (await listRunManifests(projectPath))[0];
    if (!manifest) return undefined;
    const gates = await this.options.adapter.listDecisionGates?.() ?? [];
    const relevantGateIds = new Set([manifest.activePause?.gateId, ...manifest.pauses.map((pause) => pause.gateId)].filter((id): id is string => Boolean(id)));
    return {
      manifest,
      activeDecisionGates: gates.filter((gate) => relevantGateIds.has(gate.gateId) && gate.status === "pending"),
      ...(manifest.activePause && manifest.activePause.kind !== "approval" ? { pausedFailure: manifest.activePause } : {}),
    };
  }

  private async workflowSource(projectPath: string, workflowId: string): Promise<string> {
    const workflow = (await listWorkflowFiles(projectPath)).find((item) => item.id === workflowId);
    if (!workflow) throw new Error(`Workflow "${workflowId}" was not found in this project.`);
    return readWorkflowFile(workflow.path);
  }

  private async request(projectPath: string, workflow: NonNullable<ReturnType<typeof parseWorkflow>["workflow"]>): Promise<WorkflowRunnerRequest> {
    return {
      projectPath,
      workflow,
      portableConfiguration: await readPortableConfiguration(projectPath),
      workflowConfiguration: this.workflowConfiguration,
      localConfiguration: await readLocalConfiguration(this.localDataPath, projectPath),
    };
  }
}
