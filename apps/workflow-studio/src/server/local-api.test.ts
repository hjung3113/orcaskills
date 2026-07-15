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

  it("builds a blocked preview from source server-side without accepting local configuration", async () => {
    const root = await mkdtemp(join(tmpdir(), "workflow-studio-preview-"));
    const project = join(root, "project");
    directories.push(root);
    await mkdir(join(project, ".git"), { recursive: true });
    const server = createLocalApiServer({ projectRoot: root });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind a TCP port.");
    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/workflow/preview`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectPath: project, source: "id: invalid\nnodes: []\n" }),
      });
      expect(response.status).toBe(200);
      const payload = await response.json() as { result: { preflight: { valid: boolean; diagnostics: { code: string }[] }; operations: unknown[] } };
      expect(payload.result.preflight.valid).toBe(false);
      expect(payload.result.preflight.diagnostics).toEqual(expect.arrayContaining([{ code: "workflow", message: expect.any(String) }]));
      expect(payload.result.operations).toEqual([]);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });

  it("accepts the same Draft execution request shape for run without a raw runner payload", async () => {
    const root = await mkdtemp(join(tmpdir(), "workflow-studio-run-"));
    const project = join(root, "project");
    directories.push(root);
    await mkdir(join(project, ".git"), { recursive: true });
    const server = createLocalApiServer({ projectRoot: root });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind a TCP port.");
    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/workflow/run`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectPath: project, source: "id: invalid\nnodes: []\n" }),
      });
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ error: "Fix workflow diagnostics before running." });
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});
