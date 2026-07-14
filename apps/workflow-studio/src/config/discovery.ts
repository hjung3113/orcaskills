import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const defaultProbeTimeoutMs = 2_000;
export const maximumProbeTimeoutMs = 5_000;

export type CapabilityAvailability = "available" | "unavailable" | "unknown";

export interface CapabilityModelCandidate {
  id: string;
  displayName: string;
  availability: CapabilityAvailability;
}

export interface ProviderCapability {
  providerId: string;
  displayName: string;
  availability: CapabilityAvailability;
  models: CapabilityModelCandidate[];
  diagnostic?: string;
  version?: string;
}

export interface CapabilityDiscovery {
  refreshedAt: string;
  providers: ProviderCapability[];
}

export interface CapabilityProbeCommand {
  command: string;
  args: readonly string[];
  timeoutMs?: number;
}

export interface CapabilityProbeResult {
  ok: boolean;
  stdout?: string;
}

/** The only capability-discovery execution boundary. It never uses a shell. */
export interface CapabilityProbeRunner {
  run(command: CapabilityProbeCommand): Promise<CapabilityProbeResult>;
}

/** A reviewed adapter owns a single supported provider's fixed local probe. */
export interface CapabilityAdapter {
  readonly providerId: string;
  probe(runner: CapabilityProbeRunner): Promise<ProviderCapability>;
}

export class NodeCapabilityProbeRunner implements CapabilityProbeRunner {
  async run(command: CapabilityProbeCommand): Promise<CapabilityProbeResult> {
    const timeout = Math.min(Math.max(command.timeoutMs ?? defaultProbeTimeoutMs, 1), maximumProbeTimeoutMs);
    try {
      const { stdout } = await execFileAsync(command.command, [...command.args], {
        timeout,
        shell: false,
        windowsHide: true,
        // Version probes must not receive API keys or other ambient credentials.
        env: { PATH: process.env.PATH ?? "" },
        maxBuffer: 4_096,
      });
      return { ok: true, stdout: stdout.slice(0, 512) };
    } catch {
      // Never surface subprocess output: it can contain machine-specific or sensitive text.
      return { ok: false };
    }
  }
}

export class CapabilityAdapterRegistry {
  private readonly adapters = new Map<string, CapabilityAdapter>();

  constructor(adapters: readonly CapabilityAdapter[]) {
    for (const adapter of adapters) {
      if (this.adapters.has(adapter.providerId)) throw new Error(`Duplicate capability adapter for "${adapter.providerId}".`);
      this.adapters.set(adapter.providerId, adapter);
    }
  }

  list(): CapabilityAdapter[] {
    return [...this.adapters.values()].sort((left, right) => left.providerId.localeCompare(right.providerId));
  }

  async discover(runner: CapabilityProbeRunner, refreshedAt = new Date().toISOString()): Promise<CapabilityDiscovery> {
    const providers = await Promise.all(this.list().map((adapter) => adapter.probe(runner)));
    return { refreshedAt, providers };
  }
}

function firstLine(value: string | undefined): string | undefined {
  const line = value?.split(/\r?\n/, 1)[0]?.trim();
  return line || undefined;
}

/** Safe initial integration: the fixed `codex --version` probe proves local CLI availability only. */
export const codexCliCapabilityAdapter: CapabilityAdapter = {
  providerId: "codex",
  async probe(runner) {
    const result = await runner.run({ command: "codex", args: ["--version"], timeoutMs: defaultProbeTimeoutMs });
    if (!result.ok) {
      return {
        providerId: "codex",
        displayName: "Codex CLI",
        availability: "unavailable",
        models: [],
        diagnostic: "Codex CLI is not available. Install or configure it locally, then refresh capabilities.",
      };
    }
    return {
      providerId: "codex",
      displayName: "Codex CLI",
      availability: "available",
      models: [],
      version: firstLine(result.stdout),
      diagnostic: "Codex CLI is available, but this adapter cannot safely enumerate models yet.",
    };
  },
};

export const defaultCapabilityAdapterRegistry = new CapabilityAdapterRegistry([codexCliCapabilityAdapter]);
