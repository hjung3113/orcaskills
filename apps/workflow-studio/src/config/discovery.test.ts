import { describe, expect, it } from "vitest";
import {
  CapabilityAdapterRegistry,
  codexCliCapabilityAdapter,
  defaultProbeTimeoutMs,
  type CapabilityAdapter,
  type CapabilityProbeCommand,
  type CapabilityProbeRunner,
} from "./discovery";

class RecordingRunner implements CapabilityProbeRunner {
  readonly commands: CapabilityProbeCommand[] = [];

  constructor(private readonly result = { ok: true, stdout: "codex 1.2.3\n" }) {}

  async run(command: CapabilityProbeCommand) {
    this.commands.push(command);
    return this.result;
  }
}

describe("capability discovery", () => {
  it("runs the reviewed Codex adapter through its fixed non-interactive version probe", async () => {
    const runner = new RecordingRunner();
    const result = await new CapabilityAdapterRegistry([codexCliCapabilityAdapter]).discover(runner, "2026-07-15T00:00:00.000Z");

    expect(runner.commands).toEqual([{ command: "codex", args: ["--version"], timeoutMs: defaultProbeTimeoutMs }]);
    expect(result).toMatchObject({
      refreshedAt: "2026-07-15T00:00:00.000Z",
      providers: [{ providerId: "codex", availability: "available", version: "codex 1.2.3", models: [] }],
    });
    expect(result.providers[0]?.diagnostic).toContain("cannot safely enumerate models");
  });

  it("reports an unavailable integration without including subprocess output", async () => {
    const runner = new RecordingRunner({ ok: false, stdout: "OPENAI_API_KEY=not-safe-to-show" });
    const result = await new CapabilityAdapterRegistry([codexCliCapabilityAdapter]).discover(runner);

    expect(result.providers[0]).toMatchObject({ providerId: "codex", availability: "unavailable", models: [] });
    expect(JSON.stringify(result)).not.toContain("not-safe-to-show");
  });

  it("orders reviewed adapters deterministically and rejects duplicate registrations", async () => {
    const adapter = (providerId: string): CapabilityAdapter => ({
      providerId,
      probe: async () => ({ providerId, displayName: providerId, availability: "unknown", models: [] }),
    });
    const registry = new CapabilityAdapterRegistry([adapter("zeta"), adapter("alpha")]);

    expect((await registry.discover(new RecordingRunner())).providers.map((provider) => provider.providerId)).toEqual(["alpha", "zeta"]);
    expect(() => new CapabilityAdapterRegistry([adapter("same"), adapter("same")])).toThrow("Duplicate capability adapter");
  });
});
