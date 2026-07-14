import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { parseDocument, stringify } from "yaml";
import type { PortableConfiguration } from "../shared/config";
import type { LocalConfiguration } from "./local";

export const portableConfigurationPath = (projectPath: string): string => join(projectPath, ".orca", "workflow-config.yaml");

/** Derives a per-project file beneath app data, never beneath the Git project. */
export const localConfigurationPath = (localDataPath: string, projectPath: string): string =>
  join(localDataPath, "orca-workflow-studio", `${createHash("sha256").update(projectPath).digest("hex")}.json`);

export async function savePortableConfiguration(projectPath: string, configuration: PortableConfiguration): Promise<string> {
  const path = portableConfigurationPath(projectPath);
  await mkdir(join(projectPath, ".orca"), { recursive: true });
  await writeFile(path, stringify(configuration, { lineWidth: 0 }), "utf8");
  return path;
}

export async function readPortableConfiguration(projectPath: string): Promise<PortableConfiguration> {
  const source = await readFile(portableConfigurationPath(projectPath), "utf8");
  const value = parseDocument(source).toJS();
  if (!value || typeof value !== "object" || !Array.isArray((value as PortableConfiguration).roles) || !Array.isArray((value as PortableConfiguration).profiles)) {
    throw new Error("Portable configuration needs roles and profiles lists.");
  }
  return value as PortableConfiguration;
}

export async function saveLocalConfiguration(localDataPath: string, projectPath: string, configuration: LocalConfiguration): Promise<string> {
  const path = localConfigurationPath(localDataPath, projectPath);
  await mkdir(join(localDataPath, "orca-workflow-studio"), { recursive: true });
  await writeFile(path, `${JSON.stringify(configuration, null, 2)}\n`, "utf8");
  return path;
}

export async function readLocalConfiguration(localDataPath: string, projectPath: string): Promise<LocalConfiguration> {
  return JSON.parse(await readFile(localConfigurationPath(localDataPath, projectPath), "utf8")) as LocalConfiguration;
}
