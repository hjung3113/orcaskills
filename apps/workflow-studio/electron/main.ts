import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { join } from "node:path";
import { WorkflowStudioService } from "../src/service/workflow-studio-service";

const service = new WorkflowStudioService();

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
    return service.openProject(result.filePaths[0]);
  });
  ipcMain.handle("workflow:list", (_event, projectPath: string) => service.listWorkflows(projectPath));
  ipcMain.handle("workflow:read", (_event, path: string) => service.readWorkflow(path));
  ipcMain.handle("workflow:validate", (_event, source: string) => service.validate(source));
  ipcMain.handle("workflow:save", (_event, projectPath: string, source: string) => service.save(projectPath, source));
  ipcMain.handle("workflow:preview", (_event, projectPath: string, source: string) => service.preview(projectPath, source));
  ipcMain.handle("workflow:run", (_event, projectPath: string, source: string) => service.run(projectPath, source));
  ipcMain.handle("capabilities:discover", () => service.discoverCapabilities());
  ipcMain.handle("configuration:read-portable", (_event, projectPath: string) => service.readPortableConfiguration(projectPath));
  ipcMain.handle("configuration:save-portable", (_event, projectPath: string, configuration) => service.savePortableConfiguration(projectPath, configuration));
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
