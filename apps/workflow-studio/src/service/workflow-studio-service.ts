import { defaultCapabilityAdapterRegistry, NodeCapabilityProbeRunner } from "../config/discovery";
import { readPortableConfiguration, savePortableConfiguration } from "../config/storage";
import { CommandOrcaCliAdapter, WorkflowRunner, type WorkflowRunnerRequest } from "../runner";
import { isGitProject, listWorkflowFiles, readWorkflowFile, saveWorkflowFile } from "../shared/project";
import { parseWorkflow } from "../shared/validation";
import type { PortableConfiguration } from "../shared/config";
import { isAbsolute, relative, resolve, sep } from "node:path";

export class WorkflowStudioService {
  constructor(private readonly permittedProjectRoot?: string) {}

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
  preview(request: WorkflowRunnerRequest) { this.assertPermitted(request.projectPath); return new WorkflowRunner(new CommandOrcaCliAdapter()).preview(request); }
  run(request: WorkflowRunnerRequest) { this.assertPermitted(request.projectPath); return new WorkflowRunner(new CommandOrcaCliAdapter()).run(request); }
  discoverCapabilities() { return defaultCapabilityAdapterRegistry.discover(new NodeCapabilityProbeRunner()); }
  async readPortableConfiguration(projectPath: string): Promise<PortableConfiguration> {
    this.assertPermitted(projectPath);
    try { return await readPortableConfiguration(projectPath); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { roles: [], profiles: [], presets: [] };
      throw error;
    }
  }
  savePortableConfiguration(projectPath: string, configuration: PortableConfiguration) {
    this.assertPermitted(projectPath);
    return savePortableConfiguration(projectPath, configuration);
  }
}
