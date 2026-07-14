import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { RunManifest } from "./types";

export const manifestDirectory = (projectPath: string): string => join(projectPath, ".orca", "workflow-runs");
export const runManifestPath = (projectPath: string, runId: string): string => join(manifestDirectory(projectPath), `${runId}.json`);

export async function writeRunManifest(projectPath: string, manifest: RunManifest): Promise<string> {
  const orcaDirectory = join(projectPath, ".orca");
  await mkdir(manifestDirectory(projectPath), { recursive: true });
  // A nested ignore rule keeps transient run data local without changing a
  // project's root ignore policy.
  const ignorePath = join(orcaDirectory, ".gitignore");
  let ignoreSource = "";
  try { ignoreSource = await readFile(ignorePath, "utf8"); } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (!ignoreSource.split(/\r?\n/).includes("workflow-runs/")) {
    await writeFile(ignorePath, `${ignoreSource}${ignoreSource && !ignoreSource.endsWith("\n") ? "\n" : ""}workflow-runs/\n`, "utf8");
  }
  const path = runManifestPath(projectPath, manifest.runId);
  await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return path;
}

export async function readRunManifest(projectPath: string, runId: string): Promise<RunManifest> {
  return JSON.parse(await readFile(runManifestPath(projectPath, runId), "utf8")) as RunManifest;
}

export async function listRunManifests(projectPath: string): Promise<RunManifest[]> {
  try {
    const files = await readdir(manifestDirectory(projectPath));
    const manifests = await Promise.all(files.filter((file) => file.endsWith(".json")).map((file) =>
      readFile(join(manifestDirectory(projectPath), file), "utf8").then((source) => JSON.parse(source) as RunManifest)));
    return manifests.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
