import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createLocalApiServer } from "./local-api";

const directories: string[] = [];

afterEach(async () => Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))));

describe("local browser API", () => {
  it("opens Git projects inside its configured root and rejects paths outside it", async () => {
    const root = await mkdtemp(join(tmpdir(), "workflow-studio-api-"));
    const project = join(root, "project");
    const outside = await mkdtemp(join(tmpdir(), "workflow-studio-outside-"));
    directories.push(root, outside);
    await Promise.all([mkdir(join(project, ".git"), { recursive: true }), mkdir(join(outside, ".git"), { recursive: true })]);
    const server = createLocalApiServer({ projectRoot: root });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind a TCP port.");
    try {
      const open = await fetch(`http://127.0.0.1:${address.port}/api/project/open`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectPath: project }) });
      expect(open.status).toBe(200);
      expect(await open.json()).toEqual({ result: project });
      const rejected = await fetch(`http://127.0.0.1:${address.port}/api/project/open`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectPath: outside }) });
      expect(rejected.status).toBe(400);
      expect(await rejected.json()).toMatchObject({ error: expect.stringContaining("outside") });
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});
