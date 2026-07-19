import { describe, expect, it } from "vitest";
import { promptFor } from "./workflow-topology";

describe("promptFor", () => {
  it("keeps the role instruction when an agent has no additional instructions", () => {
    expect(promptFor({ id: "build", type: "agent" }, "Implement the change")).toBe("Implement the change");
  });

  it("appends non-empty additional instructions after the role instruction", () => {
    expect(promptFor({ id: "build", type: "agent", additionalInstructions: "Check tests" }, "Implement the change"))
      .toBe("Implement the change\n\nCheck tests");
  });

  it("uses whitespace only to determine emptiness while preserving authored non-empty text", () => {
    expect(promptFor({ id: "build", type: "agent", additionalInstructions: "   " }, "Implement the change")).toBe("Implement the change");
    expect(promptFor({ id: "build", type: "agent", additionalInstructions: "  Check tests  " }, "Implement the change"))
      .toBe("Implement the change\n\n  Check tests  ");
  });

  it("preserves the legacy replacement prompt until an explicit migration", () => {
    expect(promptFor({ id: "build", type: "agent", prompt: "Legacy instruction", additionalInstructions: "New instruction" }, "Implement the change"))
      .toBe("Legacy instruction");
  });
});
