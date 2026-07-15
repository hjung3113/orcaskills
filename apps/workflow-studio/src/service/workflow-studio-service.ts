import { defaultCapabilityAdapterRegistry, NodeCapabilityProbeRunner } from "../config/discovery";
import { readLocalConfiguration, readPortableConfiguration, savePortableConfiguration } from "../config/storage";
import { CommandOrcaCliAdapter, WorkflowRunner, type PreflightResult, type WorkflowPreview, type WorkflowRunnerRequest } from "../runner";
import { isGitProject, listWorkflowFiles, readWorkflowFile, saveWorkflowFile } from "../shared/project";
import { parseWorkflow } from "../shared/validation";
import type { LocalConfiguration } from "../config/local";
import type { PortableConfiguration } from "../shared/config";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { homedir } from "node:os";
import { join } from "node:path";

export class WorkflowStudioService {
  constructor(private readonly permittedProjectRoot?: string, private readonly localDataPath = process.env.ORCA_WORKFLOW_LOCAL_DATA_PATH ?? join(homedir(), ".orca-workflow-studio")) {}

  private assertPermitted(projectPath: string): void {
    if (!this.permittedProjectRoot) return;
    const root = resolve(this.permittedProjectRoot);
    const candidate = resolve(projectPath);
    const pathFromRoot = relative(root, candidate);
    if (pathFromRoot === ".." || pathFromRoot.startsWith(`..${sep}`) || isAbsolute(pathFromRoot)) {
      throw new Error("Project path is outside the local API's permitted root.");
    }
  }

  async openProject(projectPath: string): Promise<string> {
    this.assertPermitted(projectPath);
    if (!(await isGitProject(projectPath))) throw new Error("Workflow Studio can only open a Git project.");
    return projectPath;
  }

  async listWorkflows(projectPath: string) { this.assertPermitted(projectPath); return listWorkflowFiles(projectPath); }
  async readWorkflow(path: string) { this.assertPermitted(path); return readWorkflowFile(path); }
  validate(source: string) { return parseWorkflow(source); }
  async save(projectPath: string, source: string): Promise<string> {
    this.assertPermitted(projectPath);
    const parsed = parseWorkflow(source);
    if (!parsed.workflow || parsed.diagnostics.length) throw new Error("Fix validation diagnostics before saving.");
    return saveWorkflowFile(projectPath, parsed.workflow.id, source);
  }
  /** Builds the runner request here so browser and Electron renderers never read local configuration. */
  async preview(projectPath: string, source: string): Promise<WorkflowPreview> {
    this.assertPermitted(projectPath);
    const document = parseWorkflow(source);
    if (!document.workflow || document.diagnostics.length) return { preflight: this.invalidSourcePreflight(document.diagnostics.map((diagnostic) => diagnostic.message)), operations: [] };
    return new WorkflowRunner(new CommandOrcaCliAdapter()).preview(await this.draftRequest(projectPath, document.workflow));
  }
  async run(projectPath: string, source: string) {
    this.assertPermitted(projectPath);
    const document = parseWorkflow(source);
    if (!document.workflow || document.diagnostics.length) throw new Error("Fix workflow diagnostics before running.");
    return new WorkflowRunner(new CommandOrcaCliAdapter()).run(await this.draftRequest(projectPath, document.workflow));
  }
  discoverCapabilities() { return defaultCapabilityAdapterRegistry.discover(new NodeCapabilityProbeRunner()); }
  async readPortableConfiguration(projectPath: string): Promise<PortableConfiguration> {
    this.assertPermitted(projectPath);
    try { return await readPortableConfiguration(projectPath); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { roles: [], profiles: [], presets: [] };
      throw error;
    }
  }
  private async readLocalConfiguration(projectPath: string): Promise<LocalConfiguration> {
    try { return await readLocalConfiguration(this.localDataPath, projectPath); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { providers: {} };
      throw error;
    }
  }
  private invalidSourcePreflight(messages: string[]): PreflightResult {
    return { valid: false, resolvedProfileIds: {}, diagnostics: messages.map((message) => ({ code: "workflow", message })) };
  }
  private async draftRequest(projectPath: string, workflow: NonNullable<ReturnType<typeof parseWorkflow>["workflow"]>): Promise<WorkflowRunnerRequest> {
    return { projectPath, workflow, portableConfiguration: await this.readPortableConfiguration(projectPath), workflowConfiguration: {}, localConfiguration: await this.readLocalConfiguration(projectPath) };
  }
  savePortableConfiguration(projectPath: string, configuration: PortableConfiguration) {
    this.assertPermitted(projectPath);
    return savePortableConfiguration(projectPath, configuration);
  }
}
