import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { resolve } from "node:path";
import { WorkflowStudioService } from "../service/workflow-studio-service";

type JsonRecord = Record<string, unknown>;

async function body(request: IncomingMessage): Promise<JsonRecord> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  if (!chunks.length) return {};
  const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Request body must be a JSON object.");
  return value as JsonRecord;
}

function string(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  return value;
}

function send(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(`${JSON.stringify(payload)}\n`);
}

/** Local-only HTTP facade for browser development; never expose this to a network. */
export function createLocalApiServer(options: { projectRoot?: string } = {}) {
  const service = new WorkflowStudioService(options.projectRoot ?? resolve(process.cwd(), "../.."));
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      const method = request.method ?? "GET";
      let result: unknown;
      if (method === "GET" && url.pathname === "/api/health") result = { status: "ok" };
      else if (method === "POST" && url.pathname === "/api/project/open") result = await service.openProject(string((await body(request)).projectPath, "projectPath"));
      else if (method === "GET" && url.pathname === "/api/workflows") result = await service.listWorkflows(string(url.searchParams.get("projectPath"), "projectPath"));
      else if (method === "POST" && url.pathname === "/api/workflow/read") result = await service.readWorkflow(string((await body(request)).path, "path"));
      else if (method === "POST" && url.pathname === "/api/workflow/validate") result = service.validate(string((await body(request)).source, "source"));
      else if (method === "POST" && url.pathname === "/api/workflow/save") { const input = await body(request); result = await service.save(string(input.projectPath, "projectPath"), string(input.source, "source")); }
      else if (method === "POST" && url.pathname === "/api/workflow/preview") { const input = await body(request); result = await service.preview(string(input.projectPath, "projectPath"), string(input.source, "source")); }
      else if (method === "POST" && url.pathname === "/api/workflow/run") result = await service.run(await body(request) as never);
      else if (method === "POST" && url.pathname === "/api/capabilities/discover") result = await service.discoverCapabilities();
      else if (method === "GET" && url.pathname === "/api/configuration/portable") result = await service.readPortableConfiguration(string(url.searchParams.get("projectPath"), "projectPath"));
      else if (method === "POST" && url.pathname === "/api/configuration/portable/save") { const input = await body(request); result = await service.savePortableConfiguration(string(input.projectPath, "projectPath"), input.configuration as never); }
      else { send(response, 404, { error: "Unknown local Workflow Studio API endpoint." }); return; }
      send(response, 200, { result });
    } catch (error) {
      send(response, 400, { error: error instanceof Error ? error.message : "Local Workflow Studio API error." });
    }
  });
}
