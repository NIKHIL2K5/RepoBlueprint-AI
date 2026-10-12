import { useState, useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import './BlueprintDashboard.css';
import { downloadProjectZip } from '../services/zipper';
import { searchGitHubRepos } from '../services/github';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    background: '#060d1a',
    mainBkg: '#0c1629',
    nodeBorder: '#00c8ff',
    clusterBkg: '#0d1833',
    titleColor: '#f0f8ff',
    edgeLabelBackground: '#0c1629',
    lineColor: '#00c8ff',
    primaryColor: '#0f1f42',
    primaryTextColor: '#f0f8ff',
    primaryBorderColor: '#00c8ff',
    secondaryColor: '#1a2a5a',
    tertiaryColor: '#152348',
  },
  flowchart: { curve: 'basis', padding: 24 },
});

const TABS = [
  { id: 'blueprint', icon: '🌐', label: 'Architecture' },
  { id: 'stack',     icon: '⚙️', label: 'Tech Stack' },
  { id: 'cost',      icon: '💰', label: 'Cost Calculator' },
  { id: 'market',    icon: '🔎', label: 'Market & GitHub' },
  { id: 'repo',      icon: '📦', label: 'Starter Repo' },
  { id: 'roadmap',   icon: '⏱️', label: 'Sprint Roadmap' },
];

export default function BlueprintDashboard({
  understanding,
  blueprint,
  onBack,
  activeTab: externalActiveTab,
  onActiveTabChange,
  estimatedDau: externalDau,
  onDauChange,
}) {
  const [internalActiveTab, setInternalActiveTab] = useState('blueprint');
  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;
  const setActiveTab = onActiveTabChange || setInternalActiveTab;

  const [githubRepos, setGithubRepos] = useState([]);
  const [githubLoading, setGithubLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copiedFile, setCopiedFile] = useState(null);
  const [copiedMermaid, setCopiedMermaid] = useState(false);
  const [diagramZoom, setDiagramZoom] = useState(1);
  const [selectedFilePath, setSelectedFilePath] = useState(null);

  // Interactive Cost Calculator state
  const [internalDau, setInternalDau] = useState(5000);
  const estimatedDau = externalDau !== undefined ? externalDau : internalDau;
  const setEstimatedDau = onDauChange || setInternalDau;

  // Interactive Sprint checklist state
  const [completedMilestones, setCompletedMilestones] = useState(() => new Set());

  const mermaidRef = useRef(null);

  // Render Mermaid Diagram
  useEffect(() => {
    if (activeTab === 'blueprint' && blueprint?.mermaidDiagram && mermaidRef.current) {
      mermaidRef.current.innerHTML = '';
      const id = 'mermaid-' + Math.floor(Math.random() * 100000);

      // Clean diagram string if needed
      let cleanDiagram = (blueprint.mermaidDiagram || '').trim();
      if (!cleanDiagram.startsWith('graph') && !cleanDiagram.startsWith('flowchart')) {
        cleanDiagram = `graph LR\n${cleanDiagram}`;
      }

      mermaid.render(id, cleanDiagram).then(({ svg }) => {
        if (mermaidRef.current) mermaidRef.current.innerHTML = svg;
      }).catch(err => {
        console.error('Mermaid render error:', err);
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = `<pre class="mermaid-error">${cleanDiagram}</pre>`;
        }
      });
    }
  }, [activeTab, blueprint?.mermaidDiagram]);

  // Fetch GitHub repos when market tab opens
  useEffect(() => {
    if (activeTab === 'market' && githubRepos.length === 0 && blueprint?.githubSearchTerms) {
      setGithubLoading(true);
      searchGitHubRepos(blueprint.githubSearchTerms)
        .then(repos => {
          if (repos && repos.length > 0) {
            setGithubRepos(repos);
          } else {
            // Provide curated fallback cards if rate-limited
            setGithubRepos(getCuratedFallbacks(blueprint.githubSearchTerms));
          }
        })
        .catch(() => setGithubRepos(getCuratedFallbacks(blueprint.githubSearchTerms)))
        .finally(() => setGithubLoading(false));
    }
  }, [activeTab]);

  // Default selected file in Repo Scaffold
  useEffect(() => {
    if (!selectedFilePath && blueprint?.fileTree) {
      const firstFile = blueprint.fileTree.find(f => f.type === 'file' && f.content);
      if (firstFile) setSelectedFilePath(firstFile.path);
    }
  }, [blueprint?.fileTree, selectedFilePath]);

  const handleDownloadZip = async () => {
    setDownloading(true);
    try {
      await downloadProjectZip(understanding?.projectTitle || 'blueprint-repo', blueprint?.fileTree || []);
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyFile = (content, path) => {
    navigator.clipboard.writeText(content);
    setCopiedFile(path);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const handleCopyMermaid = () => {
    if (!blueprint?.mermaidDiagram) return;
    navigator.clipboard.writeText(blueprint.mermaidDiagram);
    setCopiedMermaid(true);
    setTimeout(() => setCopiedMermaid(false), 2000);
  };

  const handleDownloadSvg = () => {
    const svgElem = mermaidRef.current?.querySelector('svg');
    if (!svgElem) return;
    const svgData = new XMLSerializer().serializeToString(svgElem);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(understanding?.projectTitle || 'architecture').toLowerCase().replace(/\s+/g, '-')}-blueprint.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleMilestone = (milestoneKey) => {
    setCompletedMilestones(prev => {
      const next = new Set(prev);
      if (next.has(milestoneKey)) next.delete(milestoneKey);
      else next.add(milestoneKey);
      return next;
    });
  };

  // Cost calculation based on DAU slider
  const calcHostingCost = () => {
    if (estimatedDau <= 1000) return '$0 / mo (Free Tier)';
    if (estimatedDau <= 10000) return '$7 - $20 / mo (Render / Vercel Pro)';
    if (estimatedDau <= 50000) return '$45 - $80 / mo (Autoscaling Containers)';
    return '$150 - $350 / mo (Multi-region Kubernetes)';
  };

  const calcDatabaseCost = () => {
    if (estimatedDau <= 2500) return '$0 / mo (Neon / Supabase Free Tier)';
    if (estimatedDau <= 25000) return '$19 / mo (Neon Serverless Compute)';
    return '$65 / mo (High-Availability Postgres Cluster)';
  };

  const calcAiCost = () => {
    if (estimatedDau <= 1000) return '$0 / mo (Gemini Free Tier)';
    const approxCallsPerDay = estimatedDau * 2;
    const monthlyTokensM = (approxCallsPerDay * 30 * 1500) / 1000000;
    const cost = Math.max(0, Math.round(monthlyTokensM * 0.075));
    return `~$${cost} / mo (Gemini Flash Pay-As-You-Go)`;
  };

  // Milestone statistics
  const totalMilestones = Object.values(blueprint?.roadmap || {}).reduce((acc, p) => acc + (p.milestones?.length || 0), 0);
  const doneMilestones = completedMilestones.size;
  const progressPercent = totalMilestones > 0 ? Math.round((doneMilestones / totalMilestones) * 100) : 0;

  const currentFile = (blueprint?.fileTree || []).find(f => f.path === selectedFilePath);

  return (
    <div className="blueprint-dashboard">
      {/* Dashboard Top Header */}
      <div className="dashboard-header animate-slide-up">
        <div className="dashboard-title-row">
          <button type="button" className="btn btn-ghost back-btn" onClick={onBack}>
            ← Back to Alignment
          </button>
          <div className="dashboard-project-info">
            <h2 className="dashboard-project-name">📐 {understanding?.projectTitle || 'System Blueprint'}</h2>
            <p className="dashboard-project-liner">{understanding?.oneLiner || ''}</p>
          </div>
          <div className="dashboard-actions">
            <button
              type="button"
              id="top-download-zip-btn"
              className="btn btn-primary top-dl-btn"
              onClick={handleDownloadZip}
              disabled={downloading}
            >
              {downloading ? 'Packaging...' : '📥 Download Repo (.zip)'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="tab-list dashboard-tabs animate-slide-up" role="tablist">
        {TABS.map(tab => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            id={`tab-${tab.id}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Main Tab Panel */}
      <div className="tab-content animate-fade-in" key={activeTab}>

        {/* ─── TAB 1: Visual Architecture Blueprint ─── */}
        {activeTab === 'blueprint' && (
          <div className="tab-panel">
            <div className="tab-panel-header">
              <div>
                <h3>🌐 System Topology & Component Diagram</h3>
                <p>Interactive Mermaid.js architecture graph generated directly from your requirements.</p>
              </div>
              <div className="diagram-controls">
                <button
                  type="button"
                  className="diagram-btn"
                  onClick={() => setDiagramZoom(z => Math.min(z + 0.15, 1.8))}
                  title="Zoom In"
                >
                  🔍+ Zoom In
                </button>
                <button
                  type="button"
                  className="diagram-btn"
                  onClick={() => setDiagramZoom(z => Math.max(z - 0.15, 0.6))}
                  title="Zoom Out"
                >
                  🔍- Zoom Out
                </button>
                <button
                  type="button"
                  className="diagram-btn"
                  onClick={() => setDiagramZoom(1)}
                  title="Reset Zoom"
                >
                  ↺ Reset
                </button>
                <button
                  type="button"
                  className="diagram-btn"
                  onClick={handleCopyMermaid}
                  title="Copy Mermaid.js Code"
                >
                  {copiedMermaid ? '✓ Copied' : '📋 Copy Code'}
                </button>
                <button
                  type="button"
                  className="diagram-btn diagram-btn--accent"
                  onClick={handleDownloadSvg}
                  title="Download vector SVG"
                >
                  💾 Export SVG
                </button>
              </div>
            </div>

            {/* Architecture Canvas */}
            <div className="blueprint-canvas card">
              <div className="canvas-legend">
                <span className="legend-item"><span className="legend-dot dot-cyan" /> Frontend Client</span>
                <span className="legend-item"><span className="legend-dot dot-violet" /> API / Backend</span>
                <span className="legend-item"><span className="legend-dot dot-pink" /> AI Inference</span>
                <span className="legend-item"><span className="legend-dot dot-green" /> Database</span>
                <span className="legend-item"><span className="legend-dot dot-orange" /> Cache / Queue</span>
              </div>
              <div className="mermaid-container" style={{ transform: `scale(${diagramZoom})`, transformOrigin: 'top center' }}>
                <div ref={mermaidRef} className="mermaid-render" />
              </div>
            </div>

            {/* Data Flows Grid */}
            <div className="data-flows-section">
              <h4 className="flows-title">📡 Identified Communication Protocols & Pipelines</h4>
              <div className="flows-grid">
                {(understanding?.dataFlows || []).map((flow, i) => (
                  <div key={i} className="flow-card card">
                    <div className="flow-route">
                      <span className="flow-from">{flow.from}</span>
                      <span className="flow-arrow">⟶</span>
                      <span className="flow-to">{flow.to}</span>
                    </div>
                    <p className="flow-desc">{flow.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: Recommended Tech Stack ─── */}
        {activeTab === 'stack' && (
          <div className="tab-panel">
            <div className="tab-panel-header">
              <div>
                <h3>⚙️ Production Stack Specification</h3>
                <p>Architectural choices selected for developer velocity, low maintenance, and open-source synergy.</p>
              </div>
            </div>

            <div className="stack-main-grid">
              {Object.entries(blueprint?.techStack || {})
                .filter(([k]) => k !== 'extras')
                .map(([layer, info]) => (
                  <div key={layer} className="stack-card card">
                    <div className="stack-layer-label">{getLayerLabel(layer)}</div>
                    <div className="stack-name">{info?.name}</div>
                    <p className="stack-reason">{info?.reason}</p>
                    {info?.alternatives && info.alternatives.length > 0 && (
                      <div className="stack-alternatives">
                        <span className="alt-label">Trade-Off Alternatives:</span>
                        {info.alternatives.map((alt, i) => (
                          <span key={i} className="alt-tag">{alt}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>

            {blueprint?.techStack?.extras && blueprint.techStack.extras.length > 0 && (
              <div className="extras-section">
                <h4 className="extras-title">🧩 Essential Libraries, Middleware & Tooling</h4>
                <div className="extras-grid">
                  {blueprint.techStack.extras.map((extra, i) => (
                    <div key={i} className="extra-chip card">
                      <span className="extra-name">{extra.name}</span>
                      <span className="extra-purpose">{extra.purpose}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: Interactive Cost Calculator ─── */}
        {activeTab === 'cost' && (
          <div className="tab-panel">
            <div className="tab-panel-header">
              <div>
                <h3>💰 Interactive Cloud & Hosting Cost Calculator</h3>
                <p>Simulate how infrastructure costs evolve as your hackathon project scales from day 1 to 100k users.</p>
              </div>
            </div>

            {/* Interactive User Slider */}
            <div className="dau-calculator-card card">
              <div className="dau-header">
                <div>
                  <span className="dau-label">Projected Daily Active Users (DAU)</span>
                  <div className="dau-value">{estimatedDau.toLocaleString()} DAU</div>
                </div>
                <div className="dau-badge badge badge-cyan">
                  {estimatedDau <= 2500 ? '🚀 100% Free Tier Eligible' : '⚡ Scaled Cloud Tier'}
                </div>
              </div>
              <input
                type="range"
                min="500"
                max="100000"
                step="500"
                value={estimatedDau}
                onChange={(e) => setEstimatedDau(Number(e.target.value))}
                className="dau-slider"
              />
              <div className="dau-slider-ticks">
                <span>500 (MVP)</span>
                <span>10,000</span>
                <span>50,000</span>
                <span>100,000 (Scale)</span>
              </div>

              {/* Dynamic Estimates Grid */}
              <div className="dau-estimates-grid">
                <div className="dau-estimate-box">
                  <div className="dest-title">Compute & API</div>
                  <div className="dest-cost">{calcHostingCost()}</div>
                  <div className="dest-sub">Vercel / Cloudflare / Render</div>
                </div>
                <div className="dau-estimate-box">
                  <div className="dest-title">Database Storage</div>
                  <div className="dest-cost">{calcDatabaseCost()}</div>
                  <div className="dest-sub">PostgreSQL (Neon / Supabase)</div>
                </div>
                <div className="dau-estimate-box">
                  <div className="dest-title">AI Token Ingestion</div>
                  <div className="dest-cost">{calcAiCost()}</div>
                  <div className="dest-sub">Gemma / Gemini Inference</div>
                </div>
              </div>
            </div>

            {/* Static Tier Comparison Tables */}
            <h4 className="cost-section-title">Free Tier Services Matrix (Launch Zero-Dollar Budget)</h4>
            <div className="cost-table">
              <div className="cost-table-header">
                <span>Service Category</span><span>Provider</span><span>Generous Free Limit</span><span>Cost</span>
              </div>
              {(blueprint?.costBreakdown?.freeTier || []).map((row, i) => (
                <div key={i} className="cost-table-row">
                  <span className="cost-service">{row.service}</span>
                  <span className="cost-provider">{row.provider}</span>
                  <span className="cost-limit">{row.limit}</span>
                  <span className="cost-price free">{row.monthlyPrice || '$0'}</span>
                </div>
              ))}
            </div>

            <h4 className="cost-section-title" style={{ marginTop: '28px' }}>Production Scale Transitions</h4>
            <div className="cost-table">
              <div className="cost-table-header">
                <span>Service</span><span>Provider</span><span>Estimated Price</span><span>Upgrade Trigger</span>
              </div>
              {(blueprint?.costBreakdown?.productionTier || []).map((row, i) => (
                <div key={i} className="cost-table-row">
                  <span className="cost-service">{row.service}</span>
                  <span className="cost-provider">{row.provider}</span>
                  <span className="cost-price">{row.monthlyPrice}</span>
                  <span className="cost-notes">{row.notes}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 4: Market & GitHub Intelligence ─── */}
        {activeTab === 'market' && (
          <div className="tab-panel">
            <div className="tab-panel-header">
              <div>
                <h3>🔎 Competitive Intelligence & Target Audience</h3>
                <p>Live GitHub similar projects, unfair moat advantages, and target developer personas.</p>
              </div>
            </div>

            {blueprint?.targetAudience && (
              <div className="persona-section">
                <div className="primary-persona card">
                  <div className="persona-badge badge badge-cyan">Primary Target User</div>
                  <h4 className="persona-title">{blueprint.targetAudience.primaryPersona?.title}</h4>
                  <p className="persona-motivation">{blueprint.targetAudience.primaryPersona?.motivation}</p>
                  <div className="pain-points">
                    <div className="section-label">Core Pain Points:</div>
                    {(blueprint.targetAudience.primaryPersona?.painPoints || []).map((p, i) => (
                      <div key={i} className="pain-point">⚡ {p}</div>
                    ))}
                  </div>
                </div>
                <div className="market-size card">
                  <div className="section-label">Market Opportunity & Unfair Advantage</div>
                  <p>{blueprint.targetAudience.marketSize}</p>
                </div>
              </div>
            )}

            <div className="github-section-header">
              <h4 className="section-title">
                🐙 Live GitHub Repositories in This Space
                {githubLoading && <span className="github-spinner"><div className="spinner" /></span>}
              </h4>
              <div className="github-terms">
                Keywords: {(blueprint?.githubSearchTerms || []).map((t, i) => <span key={i} className="term-chip">{t}</span>)}
              </div>
            </div>

            <div className="github-repos-grid">
              {githubRepos.map((repo, i) => (
                <a key={i} href={repo.url} target="_blank" rel="noopener noreferrer" className="github-repo-card card">
                  <div className="repo-header">
                    <span className="repo-name">{repo.name}</span>
                    {repo.language && <span className="repo-lang">{repo.language}</span>}
                  </div>
                  <p className="repo-desc">{repo.description}</p>
                  <div className="repo-stats">
                    <span>⭐ {(repo.stars || 0).toLocaleString()}</span>
                    <span>🍴 {(repo.forks || 0).toLocaleString()}</span>
                    {repo.updatedAt && <span className="repo-updated">Updated {repo.updatedAt}</span>}
                  </div>
                  {repo.topics && repo.topics.length > 0 && (
                    <div className="repo-topics">
                      {repo.topics.slice(0, 4).map((t, ti) => (
                        <span key={ti} className="topic-tag">{t}</span>
                      ))}
                    </div>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 5: Starter Repo Scaffold ─── */}
        {activeTab === 'repo' && (
          <div className="tab-panel">
            <div className="tab-panel-header">
              <div>
                <h3>📦 Starter Repository Scaffold</h3>
                <p>Complete project structure with real starter boilerplate code ready to run immediately.</p>
              </div>
              <button
                type="button"
                id="download-zip-btn"
                className="btn btn-primary download-btn"
                onClick={handleDownloadZip}
                disabled={downloading}
              >
                {downloading ? (
                  <><div className="spinner" /> Packaging .zip...</>
                ) : (
                  <>📥 Download Complete Starter Repo (.zip)</>
                )}
              </button>
            </div>

            <div className="scaffold-layout">
              {/* Left: VS Code File Tree Explorer */}
              <div className="file-tree-panel card">
                <div className="panel-label">📁 Explorer ({(blueprint?.fileTree || []).length} files)</div>
                <div className="file-tree-interactive">
                  {(blueprint?.fileTree || []).map((item, i) => {
                    const isSelected = item.path === selectedFilePath;
                    const isFile = item.type === 'file';
                    return (
                      <button
                        key={i}
                        type="button"
                        className={`tree-item ${isFile ? 'tree-file' : 'tree-dir'} ${isSelected ? 'selected' : ''}`}
                        onClick={() => isFile && setSelectedFilePath(item.path)}
                      >
                        <span className="tree-icon">{isFile ? '📄' : '📁'}</span>
                        <span className="tree-path">{item.path}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right: Selected File Code Viewer */}
              <div className="file-viewer-panel card">
                {currentFile ? (
                  <>
                    <div className="file-viewer-header">
                      <div>
                        <span className="viewer-file-path">📄 {currentFile.path}</span>
                        {currentFile.description && (
                          <span className="viewer-file-desc">— {currentFile.description}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost copy-file-btn"
                        onClick={() => handleCopyFile(currentFile.content, currentFile.path)}
                      >
                        {copiedFile === currentFile.path ? '✓ Copied to Clipboard!' : '📋 Copy File Code'}
                      </button>
                    </div>
                    <pre className="file-code-block">
                      <code>{currentFile.content}</code>
                    </pre>
                  </>
                ) : (
                  <div className="no-file-selected">Select a file from the explorer on the left to view code</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 6: Sprint Roadmap & Execution Kanban ─── */}
        {activeTab === 'roadmap' && (
          <div className="tab-panel">
            <div className="tab-panel-header">
              <div>
                <h3>⏱️ Interactive Hackathon Sprint Roadmap</h3>
                <p>Click checkboxes to track completed milestones as you build during the hackathon.</p>
              </div>
              <div className="sprint-progress-pill">
                <span>Sprint Velocity: <strong>{progressPercent}%</strong> ({doneMilestones}/{totalMilestones} done)</span>
                <div className="progress-bar-inline">
                  <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            </div>

            {blueprint?.roadmap && (
              <div className="roadmap-phases">
                {Object.entries(blueprint.roadmap).map(([key, phase], i) => (
                  <div key={key} className={`roadmap-phase card phase-${i + 1}`}>
                    <div className="phase-header">
                      <div className="phase-num">{`Phase ${i + 1}`}</div>
                      <div>
                        <div className="phase-title">{phase.title}</div>
                        <div className="phase-duration">⏱ {phase.duration}</div>
                      </div>
                    </div>
                    <ul className="phase-milestones-interactive">
                      {(phase.milestones || []).map((m, mi) => {
                        const mKey = `${key}-${mi}`;
                        const isDone = completedMilestones.has(mKey);
                        return (
                          <li
                            key={mi}
                            className={`milestone-item ${isDone ? 'done' : ''}`}
                            onClick={() => toggleMilestone(mKey)}
                          >
                            <span className="milestone-checkbox">{isDone ? '✓' : ''}</span>
                            <span className="milestone-text">{m}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {/* Official Resources & Docs */}
            {blueprint?.resources && blueprint.resources.length > 0 && (
              <div className="resources-section">
                <h4 className="section-title" style={{ marginTop: '36px' }}>📚 Official Documentation & Technical Guides</h4>
                <div className="resources-grid">
                  {blueprint.resources.map((res, i) => (
                    <a key={i} href={res.url} target="_blank" rel="noopener noreferrer" className="resource-card card">
                      <div className="resource-header">
                        <span className={`badge badge-${res.type === 'docs' ? 'cyan' : res.type === 'api' ? 'violet' : 'green'}`}>
                          {res.type}
                        </span>
                      </div>
                      <div className="resource-title">{res.title}</div>
                      <p className="resource-desc">{res.description}</p>
                      <span className="resource-link">Open Official Docs ↗</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

/* ── Helper Functions ── */
function getLayerLabel(layer) {
  const labels = {
    frontend: '🎨 Frontend Layer',
    backend: '⚙️ Backend Core',
    database: '🗄️ Persistence & Database',
    ai: '🤖 AI Reasoning Engine',
    devops: '🚀 DevOps & Deployment',
  };
  return labels[layer] || layer;
}

function getCuratedFallbacks(searchTerms = []) {
  return [
    {
      name: 'tiangolo/fastapi',
      description: 'FastAPI framework, high performance, easy to learn, fast to code, ready for production',
      url: 'https://github.com/tiangolo/fastapi',
      stars: 76000,
      forks: 6200,
      language: 'Python',
      topics: ['python', 'asyncio', 'rest-api', 'fastapi'],
      updatedAt: 'Recently'
    },
    {
      name: 'google/gemma_pytorch',
      description: 'The official PyTorch implementation of Google\'s Gemma models',
      url: 'https://github.com/google/gemma_pytorch',
      stars: 8900,
      forks: 920,
      language: 'Python',
      topics: ['google', 'gemma', 'llm', 'open-weights'],
      updatedAt: 'Recently'
    },
    {
      name: 'shadcn-ui/ui',
      description: 'Beautifully designed components that you can copy and paste into your apps.',
      url: 'https://github.com/shadcn-ui/ui',
      stars: 64000,
      forks: 5800,
      language: 'TypeScript',
      topics: ['react', 'tailwind', 'radix-ui'],
      updatedAt: 'Recently'
    }
  ];
}
