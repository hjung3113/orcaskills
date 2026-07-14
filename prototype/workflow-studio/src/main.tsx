// PROTOTYPE: Three workflow-studio layouts, switchable with ?variant=A|B|C.
import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Bot,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  FileCode2,
  GitBranch,
  LayoutPanelLeft,
  MoreHorizontal,
  PanelRight,
  Play,
  Plus,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  Split,
  Waypoints,
} from 'lucide-react';
import './styles.css';

type Variant = 'A' | 'B' | 'C';

const variants: Record<Variant, string> = {
  A: 'Canvas first',
  B: 'Workflow desk',
  C: 'Stage view',
};

const steps = [
  { id: 'start', label: 'Start', kind: 'start', meta: 'Manual trigger' },
  { id: 'design', label: 'Design architecture', kind: 'agent', meta: 'Architect · Claude Opus' },
  { id: 'gate', label: 'Approve design', kind: 'approval', meta: 'Decision Gate' },
  { id: 'implement', label: 'Implement feature', kind: 'agent', meta: 'Implementer · Codex' },
  { id: 'review', label: 'Code review', kind: 'agent', meta: 'Reviewer · Claude Opus' },
  { id: 'done', label: 'End', kind: 'end', meta: 'Success' },
];

function setVariant(variant: Variant) {
  const params = new URLSearchParams(window.location.search);
  params.set('variant', variant);
  window.history.replaceState(null, '', `?${params.toString()}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function WorkflowNode({ label, meta, kind, active = false }: { label: string; meta: string; kind: string; active?: boolean }) {
  const Icon = kind === 'approval' ? ShieldCheck : kind === 'agent' ? Bot : kind === 'start' ? Play : Check;
  return (
    <article className={`workflow-node ${kind} ${active ? 'active' : ''}`}>
      <span className="node-icon"><Icon size={15} /></span>
      <span className="node-copy"><strong>{label}</strong><small>{meta}</small></span>
      <MoreHorizontal size={16} className="node-menu" />
    </article>
  );
}

function Canvas({ compact = false }: { compact?: boolean }) {
  return (
    <section className={`canvas ${compact ? 'compact' : ''}`} aria-label="Workflow canvas">
      <div className="canvas-grid" />
      <div className="canvas-toolbar"><button title="Workflow settings"><Settings2 size={16} /></button><button title="Add node"><Plus size={16} /></button><span /></div>
      <div className="flow flow-main">
        <WorkflowNode {...steps[0]} />
        <i className="connector" />
        <WorkflowNode {...steps[1]} />
        <i className="connector" />
        <WorkflowNode {...steps[2]} />
        <i className="connector" />
        <WorkflowNode {...steps[3]} active />
        <i className="connector" />
        <WorkflowNode {...steps[4]} />
        <i className="connector" />
        <WorkflowNode {...steps[5]} />
      </div>
      <div className="canvas-status"><Waypoints size={14} /> 6 nodes <span>·</span> valid DAG</div>
    </section>
  );
}

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><Sparkles size={17} /></span><strong>Workflow Studio</strong></div>
      <button className="project-switch"><span className="project-dot" /> Orca Skills <ChevronRight size={14} /></button>
      <nav>
        <p>WORKFLOWS</p>
        <button className="nav-current"><GitBranch size={16} /> Feature delivery</button>
        <button><GitBranch size={16} /> Bugfix review</button>
        <button><Plus size={16} /> New workflow</button>
        <p>CONFIGURATION</p>
        <button><Bot size={16} /> Agent profiles</button>
        <button><ShieldCheck size={16} /> Roles & policies</button>
        <button><FileCode2 size={16} /> YAML source</button>
      </nav>
      <div className="sidebar-foot"><span><Check size={14} /> Saved to Git</span><small>.orca/workflows/feature-delivery.yaml</small></div>
    </aside>
  );
}

function Inspector() {
  return (
    <aside className="inspector">
      <div className="inspector-title"><span><Bot size={16} /> Agent node</span><button title="Node settings"><Settings2 size={16} /></button></div>
      <div className="field"><label>Step name</label><input value="Implement feature" readOnly /></div>
      <div className="field"><label>Role</label><button className="select">Implementer <ChevronRight size={14} /></button></div>
      <div className="two-fields"><div className="field"><label>Provider</label><button className="select">Codex <ChevronRight size={14} /></button></div><div className="field"><label>Model policy</label><button className="select">Coding high <ChevronRight size={14} /></button></div></div>
      <div className="field"><label>Worktree</label><button className="select">Current worktree <ChevronRight size={14} /></button></div>
      <div className="field"><label>Prompt</label><div className="prompt">Implement the approved design. Add focused tests and report changed files.</div></div>
      <div className="validation"><Check size={15} /><span>Resolved profile and safe write ownership.</span></div>
    </aside>
  );
}

function Header({ title = 'Feature delivery' }: { title?: string }) {
  return <header className="header"><div><span className="crumb">WORKFLOW /</span><h1>{title}</h1></div><div className="header-actions"><span className="valid"><Check size={15} /> Valid</span><button title="Save workflow"><Save size={16} /></button><button className="run"><Play size={15} /> Preview run</button></div></header>;
}

function VariantA() {
  return <main className="shell layout-a"><Sidebar /><div className="workspace"><Header /><Canvas /></div><Inspector /></main>;
}

function VariantB() {
  return <main className="shell layout-b"><Sidebar /><div className="workspace"><Header /><div className="desk"><section className="workflow-list"><div className="section-head"><strong>Steps</strong><button title="Add step"><Plus size={16} /></button></div>{steps.map((step, index) => <div className={`step-row ${step.id === 'implement' ? 'selected' : ''}`} key={step.id}><span>{String(index + 1).padStart(2, '0')}</span><WorkflowNode {...step} active={step.id === 'implement'} /></div>)}</section><div className="desk-main"><div className="split-label"><LayoutPanelLeft size={15} /> Sequence map <button>Expand canvas <ChevronRight size={14} /></button></div><Canvas compact /><section className="handoff"><div><span className="eyebrow">SELECTED STEP INPUTS</span><strong>Receives approved architecture</strong><small>design.summary → prompt.design</small></div><div><span className="eyebrow">OUTPUT CONTRACT</span><strong>Implementation report</strong><small>summary · changedFiles · testResults</small></div></section></div></div></div><Inspector /></main>;
}

function VariantC() {
  return <main className="shell layout-c"><Sidebar /><div className="workspace"><Header /><section className="stage-view"><div className="stage-intro"><span className="eyebrow">FEATURE DELIVERY</span><h2>From a design decision to a reviewed change.</h2><p>Every stage makes its ownership and handoff explicit before Orca starts a worker.</p></div><div className="stage-track">{steps.map((step, index) => <div className={`stage ${step.id === 'implement' ? 'in-focus' : ''}`} key={step.id}><div className="stage-number">{String(index + 1).padStart(2, '0')}</div><WorkflowNode {...step} active={step.id === 'implement'} />{index < steps.length - 1 && <div className="stage-arrow">↓</div>}</div>)}</div><section className="stage-summary"><div><Bot size={17} /><span><strong>3 Agent handoffs</strong><small>Architect → Implementer → Reviewer</small></span></div><div><ShieldCheck size={17} /><span><strong>1 human gate</strong><small>Before code changes begin</small></span></div><div><Split size={17} /><span><strong>0 write conflicts</strong><small>All edits are sequential</small></span></div></section></section></div></main>;
}

function Switcher({ current }: { current: Variant }) {
  const order: Variant[] = ['A', 'B', 'C'];
  const index = order.indexOf(current);
  const move = (offset: number) => setVariant(order[(index + offset + order.length) % order.length]);
  return <div className="prototype-switcher"><button aria-label="Previous variant" onClick={() => move(-1)}><ChevronLeft size={18} /></button><span><b>{current}</b> — {variants[current]}</span><button aria-label="Next variant" onClick={() => move(1)}><ChevronRight size={18} /></button></div>;
}

function App() {
  const getVariant = (): Variant => (new URLSearchParams(window.location.search).get('variant') as Variant) || 'A';
  const [variant, setCurrent] = useState<Variant>(getVariant);
  useEffect(() => { const sync = () => setCurrent(getVariant()); window.addEventListener('popstate', sync); return () => window.removeEventListener('popstate', sync); }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement).tagName)) return;
      if (event.key === 'ArrowLeft') setVariant((variant === 'A' ? 'C' : variant === 'B' ? 'A' : 'B'));
      if (event.key === 'ArrowRight') setVariant((variant === 'A' ? 'B' : variant === 'B' ? 'C' : 'A'));
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [variant]);
  const Page = useMemo(() => ({ A: VariantA, B: VariantB, C: VariantC })[variant], [variant]);
  return <><Page /><Switcher current={variant} /><button className="help" title="Prototype help"><CircleHelp size={19} /></button></>;
}

createRoot(document.getElementById('root')!).render(<App />);
