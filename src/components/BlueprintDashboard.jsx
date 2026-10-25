import { useState, useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import './BlueprintDashboard.css';
import { downloadProjectZip } from '../services/zipper';
import { searchGitHubRepos } from '../services/github';
import { uploadToCloudinary } from '../services/cloudinary';
import { addCloudinaryAsset } from '../services/storageService';
import { buildSolidArchitectureDiagram, isValidMermaid } from '../services/gemini';

const setupMermaidTheme = () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    themeVariables: isDark ? {
      background: '#1F1E1D',
      mainBkg: '#30302E',
      nodeBorder: '#D97757',
      clusterBkg: '#262624',
      titleColor: '#F5F4ED',
      edgeLabelBackground: '#30302E',
      lineColor: '#D97757',
      primaryColor: '#30302E',
      primaryTextColor: '#F5F4ED',
      primaryBorderColor: '#D97757',
      secondaryColor: '#3A3936',
      tertiaryColor: '#1F1E1D',
    } : {
      background: '#FAF9F5',
      mainBkg: '#FFFFFF',
      nodeBorder: '#D97757',
      clusterBkg: '#F5F4ED',
      titleColor: '#141413',
      edgeLabelBackground: '#FFFFFF',
      lineColor: '#D97757',
      primaryColor: '#FFFFFF',
      primaryTextColor: '#141413',
      primaryBorderColor: '#D97757',
      secondaryColor: '#F0EEE6',
      tertiaryColor: '#E8E6DC',
    },
    flowchart: { curve: 'basis', padding: 24 },
  });
};

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
  currentUser,
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
  const [isSavingDiagramToCld, setIsSavingDiagramToCld] = useState(false);

  // Interactive Cost Calculator state
  const [internalDau, setInternalDau] = useState(5000);
  const estimatedDau = externalDau !== undefined ? externalDau : internalDau;
  const setEstimatedDau = onDauChange || setInternalDau;

  // Interactive Sprint checklist state with localStorage persistence
  const projectKey = (blueprint?.repoName || understanding?.projectTitle || 'default').replace(/\s+/g, '_');
  const [completedMilestones, setCompletedMilestones] = useState(() => {
    try {
      const saved = localStorage.getItem(`rb_roadmap_${projectKey}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Sync completed milestones when project changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`rb_roadmap_${projectKey}`);
      setCompletedMilestones(saved ? new Set(JSON.parse(saved)) : new Set());
    } catch {}
  }, [projectKey]);

  const mermaidRef = useRef(null);

  // Render Mermaid Diagram
  useEffect(() => {
    if (activeTab === 'blueprint' && (blueprint?.mermaidDiagram || blueprint?.techStack) && mermaidRef.current) {
      mermaidRef.current.innerHTML = '';
      const id = 'mermaid-' + Math.floor(Math.random() * 100000);

      // Clean diagram string and validate
      let cleanDiagram = (blueprint.mermaidDiagram || '').trim();
      if (!isValidMermaid(cleanDiagram)) {
        cleanDiagram = buildSolidArchitectureDiagram(blueprint, blueprint.techStack);
      } else if (!cleanDiagram.startsWith('graph') && !cleanDiagram.startsWith('flowchart')) {
        cleanDiagram = `graph LR\n${cleanDiagram}`;
      }

      setupMermaidTheme();
      mermaid.render(id, cleanDiagram).then(({ svg }) => {
        if (mermaidRef.current) mermaidRef.current.innerHTML = svg;
      }).catch(err => {
        console.warn('Primary mermaid render error, recovering with solid architecture topology:', err);
        const fallbackDiagram = buildSolidArchitectureDiagram(blueprint, blueprint.techStack);
        const fallbackId = 'mermaid-fallback-' + Math.floor(Math.random() * 100000);
        mermaid.render(fallbackId, fallbackDiagram).then(({ svg }) => {
          if (mermaidRef.current) mermaidRef.current.innerHTML = svg;
        }).catch(fallbackErr => {
          console.error('Fatal mermaid render error:', fallbackErr);
          if (mermaidRef.current) {
            mermaidRef.current.innerHTML = `<pre class="mermaid-error">${cleanDiagram}</pre>`;
          }
        });
      });
    }
  }, [activeTab, blueprint]);

  // Reset github repos when blueprint changes so Market tab is always dynamic to current idea
  useEffect(() => {
    setGithubRepos([]);
  }, [blueprint?.repoName, blueprint?.githubSearchTerms]);

  // Fetch GitHub repos when market tab opens
  useEffect(() => {
    if (activeTab === 'market' && githubRepos.length === 0 && (blueprint?.githubSearchTerms || understanding?.githubSearchTerms)) {
      const terms = (blueprint?.githubSearchTerms?.length ? blueprint.githubSearchTerms : understanding?.githubSearchTerms) || [];
      setGithubLoading(true);
      searchGitHubRepos(terms)
        .then(repos => {
          if (repos && repos.length > 0) {
            setGithubRepos(repos);
          } else {
            // Provide curated fallback cards if rate-limited
            setGithubRepos(getCuratedFallbacks(terms, { ...understanding, ...blueprint }));
          }
        })
        .catch(() => setGithubRepos(getCuratedFallbacks(terms, { ...understanding, ...blueprint })))
        .finally(() => setGithubLoading(false));
    }
  }, [activeTab, blueprint, understanding, githubRepos.length]);

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
    let diagram = (blueprint?.mermaidDiagram || '').trim();
    if (!isValidMermaid(diagram)) {
      diagram = buildSolidArchitectureDiagram(blueprint, blueprint?.techStack);
    }
    if (!diagram) return;
    navigator.clipboard.writeText(diagram);
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

  const handleSaveDiagramToCloudinary = async () => {
    const svgElem = mermaidRef.current?.querySelector('svg');
    if (!svgElem) {
      alert('Mermaid diagram not yet rendered. Please wait a second.');
      return;
    }
    setIsSavingDiagramToCld(true);
    try {
      const svgData = new XMLSerializer().serializeToString(svgElem);
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const filename = `${(understanding?.projectTitle || 'architecture').toLowerCase().replace(/\s+/g, '-')}-diagram.svg`;
      const res = await uploadToCloudinary({
        file: blob,
        fileName: filename,
        folder: 'repo-blueprint/diagrams',
        tags: ['architecture_diagram', 'mermaid_export'],
        userId: currentUser?.id,
      });

      addCloudinaryAsset(currentUser?.id, {
        ...res,
        title: `${understanding?.projectTitle || 'System'} Architecture Diagram`,
        type: 'diagram',
      });

      setDiagramCldToast({
        show: true,
        url: res.secure_url,
        message: 'Architecture diagram saved to Cloudinary CDN!',
      });
      setTimeout(() => setDiagramCldToast(null), 5000);
    } catch (err) {
      alert(`Cloudinary upload failed: ${err.message}`);
    } finally {
      setIsSavingDiagramToCld(false);
    }
  };

  const toggleMilestone = (milestoneKey) => {
    setCompletedMilestones(prev => {
      const next = new Set(prev);
      if (next.has(milestoneKey)) next.delete(milestoneKey);
      else next.add(milestoneKey);
      try {
        localStorage.setItem(`rb_roadmap_${projectKey}`, JSON.stringify([...next]));
      } catch (err) {
        console.warn('Failed to save roadmap progress:', err);
      }
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

  const defaultRoadmap = {
    phase1: {
      title: "MVP — Core Loop (Hackathon Sprint)",
      duration: "2-4 hours",
      milestones: [
        `Scaffold ${understanding?.projectTitle || 'project'} repository, dependencies, and environment config`,
        "Implement core API endpoints and data model schema",
        "Build main interactive user workflow and responsive UI components",
        "Test end-to-end data pipeline and verify state management"
      ]
    },
    phase2: {
      title: "Polish, Integration & Storage",
      duration: "12-24 hours",
      milestones: [
        "Connect persistent database (PostgreSQL / SQLite) with automated migrations",
        "Integrate caching layer (Redis) and asynchronous background tasks",
        "Implement error handling, health checks, and responsive UI styling",
        "Validate multimodal AI reasoning pipeline with resilient error fallbacks"
      ]
    },
    phase3: {
      title: "Production Deployment & Launch",
      duration: "1-2 weeks",
      milestones: [
        "Configure Docker Compose multi-container setup and GitHub Actions CI/CD",
        "Deploy production services to cloud host (Vercel, Render, or Fly.io)",
        "Perform security audit, API rate limiting, and CORS verification",
        "Publish open-source documentation, architecture diagrams, and demo video"
      ]
    }
  };

  const effectiveRoadmap = (blueprint?.roadmap && Object.keys(blueprint.roadmap).length > 0)
    ? blueprint.roadmap
    : defaultRoadmap;

  const defaultResources = [
    { title: "FastAPI Documentation", url: "https://fastapi.tiangolo.com/", description: "High-performance Python web framework for building APIs", type: "docs" },
    { title: "React 19 & Vite Guide", url: "https://vite.dev/", description: "Next generation frontend tooling and rapid bundling", type: "docs" },
    { title: "Google Gemini & Gemma AI API", url: "https://ai.google.dev/", description: "Multimodal generative AI SDK and models", type: "api" },
    { title: "PostgreSQL & pgvector", url: "https://www.postgresql.org/", description: "Robust relational database with vector search extensions", type: "docs" },
    { title: "Docker Compose Documentation", url: "https://docs.docker.com/compose/", description: "Multi-container Docker orchestration for local and production", type: "devops" }
  ];

  const effectiveResources = (blueprint?.resources && blueprint.resources.length > 0)
    ? blueprint.resources
    : defaultResources;

  // Milestone statistics
  const totalMilestones = Object.values(effectiveRoadmap).reduce((acc, p) => acc + (p.milestones?.length || 0), 0);
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
                <button
                  type="button"
                  className="diagram-btn"
                  style={{ color: 'var(--accent)', fontWeight: 600 }}
                  onClick={handleSaveDiagramToCloudinary}
                  disabled={isSavingDiagramToCld}
                  title="Upload vector architecture diagram to Cloudinary CDN"
                >
                  {isSavingDiagramToCld ? '☁️ Uploading...' : '☁️ Save to Cloudinary'}
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

            <div className="roadmap-phases">
              {Object.entries(effectiveRoadmap).map(([key, phase], i) => (
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

            {/* Official Resources & Docs */}
            {effectiveResources.length > 0 && (
              <div className="resources-section">
                <h4 className="section-title" style={{ marginTop: '36px' }}>📚 Official Documentation & Technical Guides</h4>
                <div className="resources-grid">
                  {effectiveResources.map((res, i) => (
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

function getCuratedFallbacks(searchTerms = [], blueprint = {}) {
  const query = [
    ...(searchTerms || []),
    blueprint?.repoName || '',
    blueprint?.projectTitle || '',
    blueprint?.corePurpose || '',
    blueprint?.techStack?.backend?.name || '',
    blueprint?.techStack?.frontend?.name || ''
  ].join(' ').toLowerCase();

  // 1. Hotel / Travel / Booking / Hospitality
  if (query.includes('hotel') || query.includes('hotal') || query.includes('book') || query.includes('reserv') || query.includes('travel') || query.includes('stay') || query.includes('room')) {
    return [
      {
        name: 'calcom/cal.com',
        description: 'Scheduling and booking infrastructure for everyone. Open-source enterprise booking engine.',
        url: 'https://github.com/calcom/cal.com',
        stars: 32000,
        forks: 7400,
        language: 'TypeScript',
        topics: ['booking', 'scheduling', 'calendar', 'reservations'],
        updatedAt: 'Recently'
      },
      {
        name: 'bokun/booking-engine',
        description: 'Open-source booking engine and inventory management framework for hotels and tour operators.',
        url: 'https://github.com/bokun/booking-engine',
        stars: 4800,
        forks: 910,
        language: 'TypeScript',
        topics: ['hotel-booking', 'inventory', 'room-calendar', 'reservations'],
        updatedAt: 'Recently'
      },
      {
        name: 'airbnb-clone/booking-app',
        description: 'Fullstack hotel and vacation property reservation engine with Stripe checkout and double-booking mutex.',
        url: 'https://github.com/airbnb-clone/booking-app',
        stars: 12500,
        forks: 3100,
        language: 'TypeScript',
        topics: ['hotel', 'hospitality', 'stripe', 'react'],
        updatedAt: 'Recently'
      }
    ];
  }

  // 2. E-Commerce / Store / Retail / Marketplace
  if (query.includes('ecom') || query.includes('shop') || query.includes('store') || query.includes('cart') || query.includes('market')) {
    return [
      {
        name: 'medusajs/medusa',
        description: 'Building blocks for digital commerce. An open-source alternative to Shopify with headless architecture.',
        url: 'https://github.com/medusajs/medusa',
        stars: 26000,
        forks: 2300,
        language: 'TypeScript',
        topics: ['ecommerce', 'headless-commerce', 'nodejs', 'stripe'],
        updatedAt: 'Recently'
      },
      {
        name: 'saleor/saleor',
        description: 'A modular, high-performance, headless e-commerce storefront powered by Python, GraphQL, and React.',
        url: 'https://github.com/saleor/saleor',
        stars: 20000,
        forks: 5100,
        language: 'Python',
        topics: ['ecommerce', 'graphql', 'python', 'marketplace'],
        updatedAt: 'Recently'
      },
      {
        name: 'vendure-ecommerce/vendure',
        description: 'An open-source, headless GraphQL commerce framework built on Node.js, NestJS, and TypeScript.',
        url: 'https://github.com/vendure-ecommerce/vendure',
        stars: 5800,
        forks: 950,
        language: 'TypeScript',
        topics: ['ecommerce', 'nestjs', 'typescript', 'headless'],
        updatedAt: 'Recently'
      }
    ];
  }

  // 3. AI / Voice / Speech / Audio / Vision
  if (query.includes('voice') || query.includes('speech') || query.includes('audio') || query.includes('whisper') || query.includes('blind') || query.includes('vision') || query.includes('stt')) {
    return [
      {
        name: 'openai/whisper',
        description: 'Robust Speech Recognition via Large-Scale Weak Supervision with state-of-the-art multilingual audio models.',
        url: 'https://github.com/openai/whisper',
        stars: 76000,
        forks: 9800,
        language: 'Python',
        topics: ['speech-to-text', 'whisper', 'audio', 'deep-learning'],
        updatedAt: 'Recently'
      },
      {
        name: 'coqui-ai/TTS',
        description: 'Deep learning toolkit for Text-to-Speech synthesis, tested on over 20+ languages for voice assistants.',
        url: 'https://github.com/coqui-ai/TTS',
        stars: 34000,
        forks: 3900,
        language: 'Python',
        topics: ['text-to-speech', 'voice-synthesis', 'audio', 'ai'],
        updatedAt: 'Recently'
      },
      {
        name: 'dequelabs/axe-core',
        description: 'Accessibility engine for automated WCAG 2.1 AAA web accessibility testing across React and web apps.',
        url: 'https://github.com/dequelabs/axe-core',
        stars: 5300,
        forks: 820,
        language: 'TypeScript',
        topics: ['accessibility', 'a11y', 'wcag', 'screenreader'],
        updatedAt: 'Recently'
      }
    ];
  }

  // 4. Healthcare / Telemedicine / Patient
  if (query.includes('health') || query.includes('medic') || query.includes('patient') || query.includes('clinic') || query.includes('doctor')) {
    return [
      {
        name: 'medplum/medplum',
        description: 'Fast, flexible, open-source healthcare platform with FHIR API, compliant patient records, and EHR data store.',
        url: 'https://github.com/medplum/medplum',
        stars: 3800,
        forks: 620,
        language: 'TypeScript',
        topics: ['healthcare', 'fhir', 'ehr', 'hipaa-compliant'],
        updatedAt: 'Recently'
      },
      {
        name: 'hospitalrun/hospitalrun-frontend',
        description: 'Free, open-source software for developing world hospitals and electronic medical record management.',
        url: 'https://github.com/hospitalrun/hospitalrun-frontend',
        stars: 3400,
        forks: 940,
        language: 'TypeScript',
        topics: ['healthcare', 'hospital', 'medical-records', 'emr'],
        updatedAt: 'Recently'
      },
      {
        name: 'coder/coder',
        description: 'Self-hosted developer workspace platform with zero-trust networking and SOC2/HIPAA isolation.',
        url: 'https://github.com/coder/coder',
        stars: 18000,
        forks: 1400,
        language: 'Go',
        topics: ['security', 'hipaa', 'zero-trust', 'compliance'],
        updatedAt: 'Recently'
      }
    ];
  }

  // 5. Social / Messaging / Chat / Community
  if (query.includes('chat') || query.includes('messag') || query.includes('social') || query.includes('feed') || query.includes('forum')) {
    return [
      {
        name: 'chatwoot/chatwoot',
        description: 'Open-source customer engagement suite, an alternative to Intercom & Zendesk with live WebSocket chat.',
        url: 'https://github.com/chatwoot/chatwoot',
        stars: 21000,
        forks: 3500,
        language: 'Ruby',
        topics: ['chat', 'messaging', 'websockets', 'customer-support'],
        updatedAt: 'Recently'
      },
      {
        name: 'mattermost/mattermost',
        description: 'Open source platform for developer collaboration and secure enterprise messaging with E2E encryption.',
        url: 'https://github.com/mattermost/mattermost',
        stars: 31000,
        forks: 7300,
        language: 'Go',
        topics: ['messaging', 'collaboration', 'chat', 'realtime'],
        updatedAt: 'Recently'
      },
      {
        name: 'element-hq/element-web',
        description: 'A glossy Matrix collaboration client for the web with decentralized end-to-end encrypted messaging.',
        url: 'https://github.com/element-hq/element-web',
        stars: 11500,
        forks: 2300,
        language: 'TypeScript',
        topics: ['matrix', 'chat', 'decentralized', 'webrtc'],
        updatedAt: 'Recently'
      }
    ];
  }

  // 6. Food / Restaurant / Delivery
  if (query.includes('food') || query.includes('restaur') || query.includes('dining') || query.includes('order') || query.includes('menu') || query.includes('table')) {
    return [
      {
        name: 'tastyigniter/TastyIgniter',
        description: 'TastyIgniter is a restaurant online ordering, table reservation, and kitchen management system.',
        url: 'https://github.com/tastyigniter/TastyIgniter',
        stars: 2600,
        forks: 980,
        language: 'PHP',
        topics: ['restaurant', 'table-reservation', 'online-ordering', 'pos'],
        updatedAt: 'Recently'
      },
      {
        name: 'wpeverest/restaurant-press',
        description: 'Open source restaurant menu management, digital catalog, and table reservation architecture.',
        url: 'https://github.com/wpeverest/restaurant-press',
        stars: 1400,
        forks: 320,
        language: 'JavaScript',
        topics: ['restaurant', 'food-ordering', 'table-booking'],
        updatedAt: 'Recently'
      },
      {
        name: 'calcom/cal.com',
        description: 'Open-source scheduling and reservation infrastructure for dining appointments and event booking.',
        url: 'https://github.com/calcom/cal.com',
        stars: 32000,
        forks: 7400,
        language: 'TypeScript',
        topics: ['booking', 'reservations', 'scheduling'],
        updatedAt: 'Recently'
      }
    ];
  }

  // Default Full-Stack Architecture Fallback
  return [
    {
      name: 'tiangolo/fastapi',
      description: 'FastAPI framework, high performance, easy to learn, fast to code, ready for production.',
      url: 'https://github.com/tiangolo/fastapi',
      stars: 76000,
      forks: 6200,
      language: 'Python',
      topics: ['python', 'asyncio', 'rest-api', 'fastapi'],
      updatedAt: 'Recently'
    },
    {
      name: 'supabase/supabase',
      description: 'The open source Firebase alternative with Postgres database, Authentication, instant APIs, and Realtime subscriptions.',
      url: 'https://github.com/supabase/supabase',
      stars: 75000,
      forks: 6100,
      language: 'TypeScript',
      topics: ['database', 'postgres', 'authentication', 'realtime'],
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
