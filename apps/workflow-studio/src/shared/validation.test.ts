import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parseWorkflow, serializeWorkflow } from "./validation";
import { createAgentWorkflow } from "./agent-workflow";

const validWorkflow = `id: feature-delivery\nname: Feature delivery\nnodes:\n  - id: start\n    type: start\n  - id: end\n    type: end\n    dependsOn: [start]\n`;

describe("workflow validation", () => {
  it("round-trips a valid Start-to-End workflow", () => {
    const first = parseWorkflow(validWorkflow);
    expect(first.diagnostics).toEqual([]);
    const second = parseWorkflow(serializeWorkflow(first.workflow!));
    expect(second.diagnostics).toEqual([]);
    expect(second.workflow).toEqual(first.workflow);
  });

  it("reports malformed YAML with a location", () => {
    const result = parseWorkflow("id: [unterminated");
    expect(result.diagnostics[0]).toMatchObject({ code: "yaml", line: 1 });
  });

  it("reports unsupported node types", () => {
    const result = parseWorkflow(validWorkflow.replace("type: end", "type: webhook"));
    expect(result.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: "shape", message: expect.stringContaining("unsupported") })]));
  });

  it("reports missing dependencies", () => {
    const result = parseWorkflow(validWorkflow.replace("[start]", "[missing]"));
    expect(result.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: "reference", message: expect.stringContaining("missing") })]));
  });

  it("reports cycles", () => {
    const source = validWorkflow.replace("dependsOn: [start]", "dependsOn: [end]");
    const result = parseWorkflow(source);
    expect(result.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: "cycle" })]));
  });

  it("reports an unreachable End node", () => {
    const result = parseWorkflow(validWorkflow.replace("dependsOn: [start]", "dependsOn: []"));
    expect(result.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: "reachability", message: expect.stringContaining("not reachable") })]));
  });

  it("accepts the fixed Agent Workflow template and rejects a broken implementation boundary", () => {
    const workflow = createAgentWorkflow(42);
    expect(parseWorkflow(serializeWorkflow(workflow)).diagnostics).toEqual([]);
    const broken = { ...workflow, nodes: workflow.nodes.map((node) => node.id === "implement" ? { ...node, worktree: "shared" } : node) };
    expect(parseWorkflow(serializeWorkflow(broken)).diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: expect.stringContaining("isolated worktree") }),
    ]));
  });

  it("keeps the documented Agent Workflow example valid", async () => {
    const example = await readFile(fileURLToPath(new URL("../../../../examples/agent-workflow/.orca/workflows/agent-workflow.yaml", import.meta.url)), "utf8");
    expect(parseWorkflow(example).diagnostics).toEqual([]);
  });

  it("preserves Conductor and node-level profile configuration from workflow YAML", () => {
    const source = `${validWorkflow}conductor:\n  enabled: true\n  profileId: planner\nnodeProfileOverrides:\n  build:\n    profileId: careful\n    modelPolicy:\n      kind: exact\n      modelId: gpt-5\n`;
    expect(parseWorkflow(source).workflow).toMatchObject({
      conductor: { enabled: true, profileId: "planner" },
      nodeProfileOverrides: { build: { profileId: "careful", modelPolicy: { kind: "exact", modelId: "gpt-5" } } },
    });
  });
});
