import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { isGitProject, listWorkflowFiles, readWorkflowFile, saveWorkflowFile } from "./project";

const temporaryProjects: string[] = [];

async function createProject(): Promise<string> {
  const project = await mkdtemp(join(tmpdir(), "orca-workflow-studio-"));
  temporaryProjects.push(project);
  await mkdir(join(project, ".git"));
  return project;
}

afterEach(async () => {
  await Promise.all(temporaryProjects.splice(0).map((project) => rm(project, { recursive: true, force: true })));
});

describe("project workflow storage", () => {
  it("recognizes Git projects and discovers a saved workflow", async () => {
    const project = await createProject();
    expect(await isGitProject(project)).toBe(true);
    expect(await listWorkflowFiles(project)).toEqual([]);

    const path = await saveWorkflowFile(project, "feature-delivery", "id: feature-delivery\nnodes: []\n");
    expect(await listWorkflowFiles(project)).toEqual([{ id: "feature-delivery", path }]);
    expect(await readWorkflowFile(path)).toContain("id: feature-delivery");
  });

  it("rejects folders that are not Git projects", async () => {
    const project = await mkdtemp(join(tmpdir(), "orca-workflow-studio-"));
    temporaryProjects.push(project);
    expect(await isGitProject(project)).toBe(false);
  });
});
