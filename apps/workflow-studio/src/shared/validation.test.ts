import { describe, expect, it } from "vitest";
import { parseWorkflow, serializeWorkflow } from "./validation";

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
});
