import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  addEdge,
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import type { Workflow, WorkflowDocument, WorkflowFile, WorkflowNode, WorkflowNodeType } from "../shared/workflow";
import type { CapabilityDiscovery } from "../config/discovery";
import type { PortableConfiguration } from "../shared/config";
import { applyPortablePreset, reviewPortableConfiguration } from "../config/staging";
import { nodeTypes } from "../shared/workflow";
import { serializeWorkflow } from "../shared/validation";
import "@xyflow/react/dist/style.css";
import "./styles.css";

const starterWorkflow = `id: new-workflow
name: New workflow
nodes:
  - id: start
    type: start
  - id: end
    type: end
    dependsOn: [start]
`;

type CanvasNode = Node<{ label: string; type: WorkflowNodeType }>;

const typeLabels: Record<WorkflowNodeType, string> = {
  start: "Start",
  agent: "Agent",
  approval: "Approval",
  condition: "Condition",
  parallel: "Parallel",
  end: "End",
};

function WorkflowCanvasNode({ data, selected }: NodeProps<CanvasNode>) {
  return <div className={`workflow-node ${data.type} ${selected ? "selected" : ""}`}>
    <Handle type="target" position={Position.Left} aria-label={`Connect to ${data.label}`} />
    <span className="node-kind">{typeLabels[data.type]}</span>
    <strong>{data.label}</strong>
    <Handle type="source" position={Position.Right} aria-label={`Connect from ${data.label}`} />
  </div>;
}

const canvasNodeTypes = { workflow: WorkflowCanvasNode };

function displayName(node: WorkflowNode): string {
  return typeof node.name === "string" && node.name.trim() ? node.name : node.id;
}

function toCanvasNodes(workflow: Workflow | undefined, prior: CanvasNode[]): CanvasNode[] {
  const positions = new Map(prior.map((node) => [node.id, node.position]));
  return (workflow?.nodes ?? []).map((node, index) => ({
    id: node.id,
    type: "workflow",
    position: positions.get(node.id) ?? { x: 90 + (index % 3) * 260, y: 90 + Math.floor(index / 3) * 170 },
    data: { label: displayName(node), type: node.type },
  }));
}

function toEdges(workflow: Workflow | undefined): Edge[] {
  return (workflow?.nodes ?? []).flatMap((node) => (node.dependsOn ?? []).map((source) => ({
    id: `${source}->${node.id}`,
    source,
    target: node.id,
    type: "smoothstep",
    markerEnd: { type: "arrowclosed" },
  })));
}

function toList(value: unknown): string {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").join(", ") : "";
}

function Studio() {
  const [projectPath, setProjectPath] = useState<string>();
  const [workflows, setWorkflows] = useState<WorkflowFile[]>([]);
  const [source, setSource] = useState(starterWorkflow);
  const [document, setDocument] = useState<WorkflowDocument>({ diagnostics: [] });
  const [message, setMessage] = useState("Open a Git project to begin.");
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [selectedId, setSelectedId] = useState<string>();
  const [portableConfiguration, setPortableConfiguration] = useState<PortableConfiguration>({ roles: [], profiles: [], presets: [] });
  const [savedPortableConfiguration, setSavedPortableConfiguration] = useState<PortableConfiguration>({ roles: [], profiles: [], presets: [] });
  const [showConfigurationReview, setShowConfigurationReview] = useState(false);
  const [capabilities, setCapabilities] = useState<CapabilityDiscovery>();
  const [canvasNodes, setCanvasNodes, onNodesChange] = useNodesState<CanvasNode>([]);
  const { fitView } = useReactFlow();

  useEffect(() => {
    let current = true;
    window.workflowStudio.validate(source).then((next) => {
      if (!current) return;
      setDocument(next);
      setCanvasNodes((prior) => toCanvasNodes(next.workflow, prior));
      setSelectedId((previous) => next.workflow?.nodes.some((node) => node.id === previous) ? previous : next.workflow?.nodes[0]?.id);
    });
    return () => { current = false; };
  }, [source, setCanvasNodes]);

  const selectedNode = useMemo(
    () => document.workflow?.nodes.find((node) => node.id === selectedId),
    [document.workflow, selectedId],
  );
  const edges = useMemo(() => toEdges(document.workflow), [document.workflow]);
  const selectedRoleId = typeof selectedNode?.roleId === "string" ? selectedNode.roleId : "";
  const selectedRole = portableConfiguration.roles.find((role) => role.id === selectedRoleId);
  const selectedProfile = portableConfiguration.profiles.find((profile) => profile.id === selectedRole?.profileId);
  const selectedCapability = capabilities?.providers.find((provider) => provider.providerId === selectedProfile?.provider);
  const configurationReview = reviewPortableConfiguration(savedPortableConfiguration, portableConfiguration);

  async function refreshCapabilities() {
    try { setCapabilities(await window.workflowStudio.discoverCapabilities()); setMessage("Local capabilities refreshed."); }
    catch { setMessage("Could not refresh local capabilities."); }
  }

  async function savePortableConfiguration() {
    if (!projectPath) return;
    try { await window.workflowStudio.savePortableConfiguration(projectPath, portableConfiguration); setSavedPortableConfiguration(portableConfiguration); setShowConfigurationReview(false); setMessage("Configuration saved."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not save configuration."); }
  }

  function commit(workflow: Workflow) {
    setSource(serializeWorkflow(workflow));
  }

  function selectNode(id: string) {
    setSelectedId(id);
    const node = canvasNodes.find((item) => item.id === id);
    if (node) void fitView({ nodes: [node], duration: 250, padding: 0.8 });
  }

  async function openProject() {
    try {
      const selected = await window.workflowStudio.selectProject();
      if (!selected) return;
      setProjectPath(selected);
      setWorkflows(await window.workflowStudio.listWorkflows(selected));
      const configuration = await window.workflowStudio.readPortableConfiguration(selected);
      setPortableConfiguration(configuration);
      setSavedPortableConfiguration(configuration);
      setMessage(`Opened ${selected}`);
      void refreshCapabilities();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not open project."); }
  }

  async function loadWorkflow(workflow: WorkflowFile) {
    setSource(await window.workflowStudio.readWorkflow(workflow.path));
    setMessage(`Loaded ${workflow.id}`);
  }

  async function saveWorkflow() {
    if (!projectPath || document.diagnostics.length > 0) return;
    try {
      const path = await window.workflowStudio.save(projectPath, source);
      setWorkflows(await window.workflowStudio.listWorkflows(projectPath));
      setMessage(`Saved ${path}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save workflow."); }
  }

  function addNode(type: WorkflowNodeType) {
    const workflow = document.workflow;
    if (!workflow) return;
    const base = type === "start" || type === "end" ? type : `new-${type}`;
    let id = base;
    let suffix = 2;
    while (workflow.nodes.some((node) => node.id === id)) id = `${base}-${suffix++}`;
    const node: WorkflowNode = { id, type };
    commit({ ...workflow, nodes: [...workflow.nodes, node] });
    setSelectedId(id);
  }

  function connect(connection: Connection) {
    const workflow = document.workflow;
    if (!workflow || !connection.source || !connection.target || connection.source === connection.target) return;
    const target = workflow.nodes.find((node) => node.id === connection.target);
    if (!target || (target.dependsOn ?? []).includes(connection.source)) return;
    commit({ ...workflow, nodes: workflow.nodes.map((node) => node.id === target.id ? { ...node, dependsOn: [...(node.dependsOn ?? []), connection.source!] } : node) });
  }

  function removeEdge(edge: Edge) {
    const workflow = document.workflow;
    if (!workflow) return;
    commit({ ...workflow, nodes: workflow.nodes.map((node) => node.id === edge.target ? { ...node, dependsOn: (node.dependsOn ?? []).filter((id) => id !== edge.source) } : node) });
  }

  function removeSelected() {
    const workflow = document.workflow;
    if (!workflow || !selectedId) return;
    commit({ ...workflow, nodes: workflow.nodes.filter((node) => node.id !== selectedId).map((node) => ({ ...node, dependsOn: (node.dependsOn ?? []).filter((id) => id !== selectedId) })) });
    setSelectedId(undefined);
  }

  function editSelected(field: string, value: string, list = false) {
    const workflow = document.workflow;
    if (!workflow || !selectedNode) return;
    const nextValue: unknown = list ? value.split(",").map((item) => item.trim()).filter(Boolean) : value;
    commit({ ...workflow, nodes: workflow.nodes.map((node) => node.id === selectedNode.id ? { ...node, [field]: nextValue } : node) });
  }

  return <main className="studio-shell">
    <header className="studio-header"><div className="header-title"><span className="eyebrow">WORKFLOW /</span><strong>{document.workflow?.name ?? "New workflow"}</strong><small>{message}</small></div><div className="header-actions"><span className={document.diagnostics.length ? "status invalid" : "status"}>{document.diagnostics.length ? "Needs attention" : "Valid"}</span><button className="quiet-action" onClick={refreshCapabilities}>Refresh capabilities</button><button className="quiet-action" onClick={openProject}>Open project</button><button className="save-action" disabled={!projectPath || document.diagnostics.length > 0} onClick={saveWorkflow}>Save workflow</button></div></header>
    <section className={`studio-layout ${outlineOpen ? "outline-open" : "outline-collapsed"}`}>
      <aside className="outline" aria-label="Workflow navigation">
        <div className="studio-brand"><span>✦</span><strong>Workflow Studio</strong></div>
        <button className="project-switch" onClick={openProject}><i />{projectPath ? projectPath.split("/").pop() : "Select Git project"}<b>›</b></button>
        <div className="panel-heading"><h2>Workflows</h2><button aria-label="Collapse steps outline" className="icon-button" onClick={() => setOutlineOpen(false)}>‹</button></div>
        <button className="new-workflow" onClick={() => { setSource(starterWorkflow); setMessage("New workflow"); }}>+ New workflow</button>
        {workflows.map((workflow) => <button className="workflow" key={workflow.path} onClick={() => loadWorkflow(workflow)}>{workflow.id}</button>)}
        <div className="steps-heading"><h2>Steps</h2><span>{document.workflow?.nodes.length ?? 0}</span></div>
        <nav>{document.workflow?.nodes.map((node) => <button className={`outline-step ${node.id === selectedId ? "active" : ""}`} key={node.id} onClick={() => selectNode(node.id)}><span>{typeLabels[node.type]}</span>{displayName(node)}</button>)}</nav>
      </aside>
      {!outlineOpen && <button className="outline-reopen" aria-label="Expand steps outline" onClick={() => setOutlineOpen(true)}>›</button>}
      <section className="canvas-panel" aria-label="Workflow canvas">
        <div className="canvas-toolbar" role="toolbar" aria-label="Add workflow node"><span>Add step</span>{nodeTypes.map((type) => <button key={type} onClick={() => addNode(type)}>+ {typeLabels[type]}</button>)}<button disabled={!selectedId} className="danger" onClick={removeSelected}>Remove</button></div>
        <ReactFlow nodes={canvasNodes.map((node) => ({ ...node, selected: node.id === selectedId }))} edges={edges} nodeTypes={canvasNodeTypes} onNodesChange={onNodesChange} onNodeClick={(_event, node) => selectNode(node.id)} onConnect={connect} onEdgeClick={(_event, edge) => removeEdge(edge)} fitView deleteKeyCode={null}>
          <Background gap={18} size={1} /><Controls /><MiniMap pannable zoomable />
        </ReactFlow>
      </section>
      <aside className="inspector" aria-label="Node inspector">
        <div className="inspector-heading"><div><span className="eyebrow">SELECTED STEP</span><h2>Inspector</h2></div><span className="inspector-badge">{selectedNode ? typeLabels[selectedNode.type] : "—"}</span></div>
        {selectedNode ? <div className="inspector-form">
          <p className="node-id">{typeLabels[selectedNode.type]} · {selectedNode.id}</p>
          {selectedNode.type === "agent" && <section className="agent-configuration"><span className="eyebrow">GUIDED CONFIGURATION</span><label>Role<select aria-label="Agent role" value={selectedRoleId} onChange={(event) => editSelected("roleId", event.target.value)}><option value="">Select a role</option>{portableConfiguration.roles.map((role) => <option key={role.id} value={role.id}>{role.id} — {role.intent}</option>)}</select></label><label>Profile<select aria-label="Agent profile" value={selectedRole?.profileId ?? ""} disabled={!selectedRole} onChange={(event) => { setShowConfigurationReview(false); setPortableConfiguration((current) => ({ ...current, roles: current.roles.map((role) => role.id === selectedRole?.id ? { ...role, profileId: event.target.value } : role) })); }}><option value="">Select a profile</option>{portableConfiguration.profiles.map((profile) => { const capability = capabilities?.providers.find((provider) => provider.providerId === profile.provider); return <option key={profile.id} value={profile.id} disabled={capability?.availability === "unavailable"}>{profile.id} · {profile.provider} / {profile.model}{capability?.availability === "unavailable" ? " — unavailable" : ""}</option>; })}</select></label><label>Apply preset<select aria-label="Configuration preset" defaultValue="" onChange={(event) => { if (!event.target.value) return; const applied = applyPortablePreset(portableConfiguration, event.target.value); editSelected("roleId", applied.preset.roleId); setPortableConfiguration(applied.configuration); setShowConfigurationReview(false); }}><option value="">Choose a preset</option>{(portableConfiguration.presets ?? []).map((preset) => <option key={preset.id} value={preset.id}>{preset.id}</option>)}</select></label><p className="capability-status">{selectedCapability ? `${selectedCapability.displayName}: ${selectedCapability.diagnostic ?? selectedCapability.availability}` : "Select a profile to check local availability."}</p>{showConfigurationReview && <p className="capability-status">Review: {configurationReview.hasChanges ? `roles ${configurationReview.changedRoles.join(", ") || "—"}; profiles ${configurationReview.changedProfiles.join(", ") || "—"}; presets ${configurationReview.changedPresets.join(", ") || "—"}` : "No portable configuration changes."}</p>}<button className="quiet-action" disabled={!projectPath || !configurationReview.hasChanges} onClick={() => showConfigurationReview ? void savePortableConfiguration() : setShowConfigurationReview(true)}>{showConfigurationReview ? "Confirm save" : "Review configuration"}</button></section>}
          <label>Name<input aria-label="Node name" value={typeof selectedNode.name === "string" ? selectedNode.name : ""} onChange={(event) => editSelected("name", event.target.value)} /></label>
          <label>Prompt<textarea aria-label="Node prompt" value={typeof selectedNode.prompt === "string" ? selectedNode.prompt : ""} onChange={(event) => editSelected("prompt", event.target.value)} /></label>
          <label>Dependencies<input aria-label="Dependencies" value={toList(selectedNode.dependsOn)} onChange={(event) => editSelected("dependsOn", event.target.value, true)} /></label>
          <label>Inputs<input aria-label="Inputs" value={toList(selectedNode.inputs)} onChange={(event) => editSelected("inputs", event.target.value, true)} /></label>
          <label>Outputs<input aria-label="Outputs" value={toList(selectedNode.outputs)} onChange={(event) => editSelected("outputs", event.target.value, true)} /></label>
          <label>Worktree<input aria-label="Worktree" value={typeof selectedNode.worktree === "string" ? selectedNode.worktree : ""} onChange={(event) => editSelected("worktree", event.target.value)} placeholder="shared or isolated" /></label>
        </div> : <p className="empty-inspector">Select a node to edit its workflow details.</p>}
        <div className={document.diagnostics.length ? "diagnostics error" : "diagnostics valid"} aria-live="polite">
          {document.diagnostics.length ? document.diagnostics.map((item, index) => <p key={index}>Line {item.line}, column {item.column}: {item.message}</p>) : <p>Workflow is valid and ready to save.</p>}
        </div>
        {document.workflow && <section className="conductor-configuration"><span className="eyebrow">WORKFLOW CONDUCTOR</span><label className="conductor-toggle"><input type="checkbox" checked={document.workflow.conductor?.enabled ?? false} onChange={(event) => commit({ ...document.workflow!, conductor: { ...document.workflow!.conductor, enabled: event.target.checked } })} /> Enable read-only Conductor</label>{document.workflow.conductor?.enabled && <label>Conductor profile<select aria-label="Conductor profile" value={document.workflow.conductor.profileId ?? ""} onChange={(event) => commit({ ...document.workflow!, conductor: { enabled: true, profileId: event.target.value || undefined } })}><option value="">Select a profile</option>{portableConfiguration.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.id} · {profile.provider} / {profile.model}</option>)}</select></label>}<p>Prepares context, refines prompts, summarizes handoffs, and advises escalation. It cannot edit code or control tasks, terminals, dispatches, or decision gates.</p></section>}
      </aside>
    </section>
  </main>;
}

function App() { return <ReactFlowProvider><Studio /></ReactFlowProvider>; }

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
