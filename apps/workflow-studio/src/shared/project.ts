import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { basename, join } from "node:path";
import type { WorkflowFile } from "./workflow";

const workflowsDirectory = (projectPath: string) => join(projectPath, ".orca", "workflows");

export async function isGitProject(projectPath: string): Promise<boolean> {
  try {
    await access(join(projectPath, ".git"), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function listWorkflowFiles(projectPath: string): Promise<WorkflowFile[]> {
  try {
    const entries = await readdir(workflowsDirectory(projectPath), { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && /ya?ml$/i.test(entry.name))
      .map((entry) => ({ id: basename(entry.name, entry.name.endsWith(".yaml") ? ".yaml" : ".yml"), path: join(workflowsDirectory(projectPath), entry.name) }))
      .sort((left, right) => left.id.localeCompare(right.id));
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function readWorkflowFile(path: string): Promise<string> {
  return readFile(path, "utf8");
}

export async function saveWorkflowFile(projectPath: string, workflowId: string, source: string): Promise<string> {
  const directory = workflowsDirectory(projectPath);
  await mkdir(directory, { recursive: true });
  const path = join(directory, `${workflowId}.yaml`);
  await writeFile(path, source, "utf8");
  return path;
}
