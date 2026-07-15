import { access, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import type { AgentWorkflowLocalConfiguration } from "../config/local";

export interface AgentWorkflowIdentity {
  issueNumber: number;
  branch: string;
  headSha: string;
}

export interface VerificationEvidence {
  producer_role?: unknown;
  classifier?: unknown;
  issue?: unknown;
  branch?: unknown;
  head_sha?: unknown;
  verdict?: { exit_code?: unknown; failed?: unknown; passed?: unknown };
}

export interface EvidenceValidation {
  valid: boolean;
  reason?: string;
}

export type AgentWorkflowOperation = "dispatch-codex" | "rebuild" | "verify" | "archive";

const requiredScripts: Record<AgentWorkflowOperation, string> = {
  "dispatch-codex": "scripts/cmux-dispatch.sh",
  rebuild: "scripts/conductor-rebuild.sh",
  verify: "scripts/verify.sh",
  archive: "scripts/review-archive.sh",
};
const execFileAsync = promisify(execFile);

/**
 * The sole command boundary for Agent Workflow. It accepts a configured local
 * toolkit root and returns only reviewed script paths; portable YAML never
 * supplies a command, executable path, or script argument.
 */
export class AgentWorkflowToolkitAdapter {
  constructor(private readonly configuration: AgentWorkflowLocalConfiguration | undefined) {}

  toolkitRoot(): string | undefined {
    if (!this.configuration?.enabled || !this.configuration.toolkitRoot) return undefined;
    return resolve(this.configuration.toolkitRoot);
  }

  script(operation: AgentWorkflowOperation): string {
    const root = this.toolkitRoot();
    if (!root) throw new Error("Agent Workflow toolkit is not enabled or configured locally.");
    return join(root, requiredScripts[operation]);
  }

  async preflight(): Promise<string[]> {
    const root = this.toolkitRoot();
    if (!root) return ["Agent Workflow requires an enabled machine-local toolkitRoot."];
    const diagnostics: string[] = [];
    try { if (!(await stat(root)).isDirectory()) diagnostics.push("Configured Agent Workflow toolkitRoot is not a directory."); }
    catch { diagnostics.push("Configured Agent Workflow toolkitRoot is unavailable."); }
    await Promise.all((Object.entries(requiredScripts) as [AgentWorkflowOperation, string][]).map(async ([operation]) => {
      try { await access(this.script(operation)); }
      catch { diagnostics.push(`Agent Workflow toolkit is missing allowlisted ${operation} script.`); }
    }));
    return diagnostics;
  }

  command(operation: AgentWorkflowOperation): string {
    return `NODE_OPTIONS= ${JSON.stringify(this.script(operation))}`;
  }

  /** Archive only after the human Release Captain has made a terminal decision. */
  async archive(evidenceDirectory: string): Promise<void> {
    await execFileAsync(this.script("archive"), [evidenceDirectory]);
  }
}

export function validateVerificationEvidence(evidence: VerificationEvidence | undefined, identity: AgentWorkflowIdentity): EvidenceValidation {
  if (!evidence || typeof evidence !== "object") return { valid: false, reason: "Verifier evidence is missing." };
  if (evidence.producer_role !== "VERIFIER") return { valid: false, reason: "Verifier evidence producer_role must be VERIFIER." };
  if (evidence.classifier !== "PASS") return { valid: false, reason: "Verifier evidence classifier must be PASS." };
  if (evidence.verdict?.exit_code !== 0 || evidence.verdict.failed !== 0 || typeof evidence.verdict.passed !== "number" || evidence.verdict.passed < 1) {
    return { valid: false, reason: "Verifier evidence must record a passing zero-exit verdict." };
  }
  if (evidence.issue !== identity.issueNumber) return { valid: false, reason: "Verifier evidence issue does not match this run." };
  if (evidence.branch !== identity.branch) return { valid: false, reason: "Verifier evidence branch does not match this run." };
  if (evidence.head_sha !== identity.headSha) return { valid: false, reason: "Verifier evidence is stale for the current worktree HEAD." };
  return { valid: true };
}
