import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { join } from "node:path";
import { isGitProject, listWorkflowFiles, readWorkflowFile, saveWorkflowFile } from "../src/shared/project";
import { parseWorkflow } from "../src/shared/validation";
import { CommandOrcaCliAdapter, WorkflowRunner, type WorkflowRunnerRequest } from "../src/runner";
import { defaultCapabilityAdapterRegistry, NodeCapabilityProbeRunner } from "../src/config/discovery";
import { readPortableConfiguration, savePortableConfiguration } from "../src/config/storage";
import type { PortableConfiguration } from "../src/shared/config";

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: { preload: join(__dirname, "preload.cjs") },
  });
  const devServer = process.env.VITE_DEV_SERVER_URL;
  if (devServer) window.loadURL(devServer);
  else window.loadFile(join(__dirname, "../renderer/index.html"));
}

app.whenReady().then(() => {
  ipcMain.handle("project:select", async () => {
    const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
    if (result.canceled || !result.filePaths[0]) return undefined;
    const path = result.filePaths[0];
    if (!(await isGitProject(path))) throw new Error("Workflow Studio can only open a Git project.");
    return path;
  });
  ipcMain.handle("workflow:list", (_event, projectPath: string) => listWorkflowFiles(projectPath));
  ipcMain.handle("workflow:read", (_event, path: string) => readWorkflowFile(path));
  ipcMain.handle("workflow:validate", (_event, source: string) => parseWorkflow(source));
  ipcMain.handle("workflow:save", async (_event, projectPath: string, source: string) => {
    const parsed = parseWorkflow(source);
    if (!parsed.workflow || parsed.diagnostics.length) throw new Error("Fix validation diagnostics before saving.");
    return saveWorkflowFile(projectPath, parsed.workflow.id, source);
  });
  ipcMain.handle("workflow:preview", (_event, request: WorkflowRunnerRequest) =>
    new WorkflowRunner(new CommandOrcaCliAdapter()).preview(request));
  ipcMain.handle("workflow:run", (_event, request: WorkflowRunnerRequest) =>
    new WorkflowRunner(new CommandOrcaCliAdapter()).run(request));
  ipcMain.handle("capabilities:discover", () =>
    defaultCapabilityAdapterRegistry.discover(new NodeCapabilityProbeRunner()));
  ipcMain.handle("configuration:read-portable", async (_event, projectPath: string): Promise<PortableConfiguration> => {
    try { return await readPortableConfiguration(projectPath); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { roles: [], profiles: [], presets: [] };
      throw error;
    }
  });
  ipcMain.handle("configuration:save-portable", (_event, projectPath: string, configuration: PortableConfiguration) =>
    savePortableConfiguration(projectPath, configuration));
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
