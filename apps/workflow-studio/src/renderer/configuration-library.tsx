import type { OnboardingCandidate } from "../config/onboarding";
import type { ConfigurationReview } from "../config/staging";
import type { AgentProfile, PortableConfiguration, PortablePreset, PromptPreset, Role } from "../shared/config";
import type { CapabilityDiscovery } from "../config/discovery";
import type { WorkflowNode } from "../shared/workflow";

export type LibrarySection = "roles" | "profiles" | "presets" | "prompt-presets";

export const librarySectionLabels: Record<LibrarySection, string> = {
  roles: "Roles",
  profiles: "Profiles",
  presets: "Configuration presets",
  "prompt-presets": "Prompt presets",
};

type LibraryItem = Role | AgentProfile | PortablePreset | PromptPreset;

export interface LibraryEditorState {
  selectedId?: string;
  name: string;
  intent: string;
  profileId: string;
  candidateKey: string;
  instructions: string;
}

interface PanelProps {
  section: LibrarySection;
  configuration: PortableConfiguration;
  capabilities?: CapabilityDiscovery;
  workflowNodes?: readonly WorkflowNode[];
  selectedId?: string;
  onNew(): void;
  onSelect(id: string): void;
  onSection(section: LibrarySection): void;
}

function itemsFor(section: LibrarySection, configuration: PortableConfiguration): LibraryItem[] {
  if (section === "roles") return configuration.roles;
  if (section === "profiles") return configuration.profiles;
  if (section === "presets") return configuration.presets ?? [];
  return configuration.promptPresets ?? [];
}

function definitionFor(section: LibrarySection, item: LibraryItem): string {
  if (section === "roles") return (item as Role).intent;
  if (section === "profiles") { const profile = item as AgentProfile; return `${profile.provider} / ${profile.model}`; }
  if (section === "presets") { const preset = item as PortablePreset; return `${preset.roleId} / ${preset.profileId}`; }
  return (item as PromptPreset).instructions;
}

export function ConfigurationLibraryPanel({ section, configuration, capabilities, workflowNodes, selectedId, onNew, onSelect, onSection }: PanelProps) {
  const items = itemsFor(section, configuration);
  const countFor = (candidate: LibrarySection) => itemsFor(candidate, configuration).length;
  return <section className="canvas-panel configuration-library" aria-label="Configuration Library">
    <header className="library-header"><div><span className="eyebrow">PORTABLE CONFIGURATION</span><h1>{librarySectionLabels[section]}</h1><p>Changes are staged locally and saved only after review.</p></div><button className="quiet-action" onClick={onNew}>+ New</button></header>
    <nav className="library-tabs" aria-label="Configuration library sections">{(Object.keys(librarySectionLabels) as LibrarySection[]).map((candidate) => <button className={candidate === section ? "active" : ""} key={candidate} onClick={() => onSection(candidate)}>{librarySectionLabels[candidate]} <span>{countFor(candidate)}</span></button>)}</nav>
    <div className="library-columns"><span>Name</span><span>Definition</span><span>Availability</span><span>References</span></div>
    {items.map((item) => {
      const profile = section === "profiles" ? item as AgentProfile : undefined;
      const availability = profile ? capabilities?.providers.find((provider) => provider.providerId === profile.provider)?.availability ?? "unknown" : "portable";
      const references = section === "roles" ? `${workflowNodes?.filter((node) => node.roleId === item.id).length ?? 0} workflow nodes` : section === "profiles" ? `${configuration.roles.filter((role) => role.profileId === item.id).length} roles` : "Copy-on-apply";
      return <button className={`library-row ${item.id === selectedId ? "selected" : ""}`} key={item.id} onClick={() => onSelect(item.id)}><strong>{item.id}</strong><span>{definitionFor(section, item)}</span><small className={availability === "unavailable" ? "unavailable" : ""}>{availability}</small><small>{references}</small></button>;
    })}
    {!items.length && <p className="library-empty">No {librarySectionLabels[section].toLowerCase()} yet. Create a staged entry from the Inspector.</p>}
  </section>;
}

interface EditorProps {
  section: LibrarySection;
  configuration: PortableConfiguration;
  candidates: readonly OnboardingCandidate[];
  state: LibraryEditorState;
  onChange(next: Partial<LibraryEditorState>): void;
  onSave(): void;
  onDuplicate(): void;
  onDelete(): void;
}

export function ConfigurationLibraryEditor({ section, configuration, candidates, state, onChange, onSave, onDuplicate, onDelete }: EditorProps) {
  const candidate = candidates.find((item) => `${item.providerId}:${item.modelId}` === state.candidateKey) ?? (state.selectedId ? undefined : candidates[0]);
  return <div className="inspector-form library-editor">
    <p className="node-id">{state.selectedId ? `Edit ${state.selectedId}` : `New ${librarySectionLabels[section].slice(0, -1)}`}</p>
    <label>{state.selectedId ? "Portable ID" : "Semantic name"}<input aria-label="Library item name" value={state.name} disabled={Boolean(state.selectedId)} placeholder={section === "prompt-presets" ? "focused-review" : "semantic-name"} onChange={(event) => onChange({ name: event.target.value })} /></label>
    {section === "roles" && <><label>Role intent<textarea aria-label="Library role intent" value={state.intent} onChange={(event) => onChange({ intent: event.target.value })} /></label><label>Profile<select aria-label="Library role profile" value={state.profileId} onChange={(event) => onChange({ profileId: event.target.value })}><option value="">Select a profile</option>{configuration.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.id}</option>)}</select></label></>}
    {section === "profiles" && <label>Local candidate<select aria-label="Library profile candidate" value={candidate ? `${candidate.providerId}:${candidate.modelId}` : ""} disabled={!candidates.length} onChange={(event) => onChange({ candidateKey: event.target.value })}><option value="">{candidates.length ? "Choose a candidate" : "Refresh capabilities first"}</option>{candidates.map((item) => <option key={`${item.providerId}:${item.modelId}`} value={`${item.providerId}:${item.modelId}`}>{item.providerLabel} / {item.modelLabel}</option>)}</select></label>}
    {section === "presets" && <><label>Role<select aria-label="Library preset role" value={state.intent} onChange={(event) => onChange({ intent: event.target.value })}><option value="">Select a role</option>{configuration.roles.map((role) => <option key={role.id} value={role.id}>{role.id}</option>)}</select></label><label>Profile<select aria-label="Library preset profile" value={state.profileId} onChange={(event) => onChange({ profileId: event.target.value })}><option value="">Select a profile</option>{configuration.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.id}</option>)}</select></label></>}
    {section === "prompt-presets" && <label>Instructions<textarea aria-label="Library prompt preset instructions" value={state.instructions} onChange={(event) => onChange({ instructions: event.target.value })} /></label>}
    <div className="library-editor-actions"><button className="quiet-action" onClick={onSave}>{state.selectedId ? "Stage update" : "Stage create"}</button>{state.selectedId && <><button className="quiet-action" onClick={onDuplicate}>Duplicate</button><button className="quiet-action danger" onClick={onDelete}>Delete request</button></>}</div>
    <p className="capability-status">This changes staged portable configuration only. Review and confirm are required before any write.</p>
  </div>;
}

export function ConfigurationReviewPanel({ review, canSave, reviewing, onReviewOrSave }: { review: ConfigurationReview; canSave: boolean; reviewing: boolean; onReviewOrSave(): void }) {
  return <section className="configuration-review"><span className="eyebrow">CONFIGURATION REVIEW</span><p>{review.hasChanges ? `Roles ${review.changedRoles.join(", ") || "—"}; profiles ${review.changedProfiles.join(", ") || "—"}; presets ${review.changedPresets.join(", ") || "—"}; prompt presets ${review.changedPromptPresets.join(", ") || "—"}.` : "No staged portable configuration changes."}</p>{review.blockedRemovals.map((blocker) => <p className="library-blocker" key={blocker.message}>{blocker.message}</p>)}<button className="quiet-action" disabled={!canSave || review.blockedRemovals.length > 0} onClick={onReviewOrSave}>{reviewing ? "Confirm save" : "Review configuration"}</button></section>;
}
