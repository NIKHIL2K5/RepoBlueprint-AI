import { useState, useMemo } from 'react';
import './Sidebar.css';
import ThemeToggle from './ThemeToggle';

const DEFAULT_RECENTS = [
  {
    group: 'Today',
    items: [
      { id: 'habit', title: 'HabitForge AI — Habit Coach', tag: 'Fullstack' },
      { id: 'video', title: 'Decentralized Video Streaming', tag: 'WebRTC' },
      { id: 'whiteboard', title: 'Napkin Whiteboard Doodle', tag: 'Vision' },
    ]
  },
  {
    group: 'Yesterday',
    items: [
      { id: 'oss', title: 'Autonomous GitHub Triage Bot', tag: 'AI Bot' },
      { id: 'fastapi', title: 'FastAPI + Postgres Starter', tag: 'Backend' },
    ]
  },
  {
    group: 'Previous 7 days',
    items: [
      { id: 'devops', title: 'DevOps Multi-Cluster Wizard', tag: 'Docker' },
      { id: 'market', title: 'Market Intelligence Explorer', tag: 'Analytics' },
    ]
  }
];

export default function Sidebar({
  isOpen = true,
  onToggle,
  onNewProject,
  activeProjectId = 'habit',
  onSelectProject,
  config,
  onOpenSettings,
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return DEFAULT_RECENTS;
    const q = searchQuery.toLowerCase();
    return DEFAULT_RECENTS.map(g => ({
      ...g,
      items: g.items.filter(item => item.title.toLowerCase().includes(q) || item.tag.toLowerCase().includes(q))
    })).filter(g => g.items.length > 0);
  }, [searchQuery]);

  const modelLabel = config?.provider === 'ollama'
    ? `Ollama · ${config?.ollamaModel || 'llama3.2:3b'}`
    : config?.provider === 'gemini'
      ? `Gemini · ${config?.geminiModel || '2.5 Flash'}`
      : 'Instant Sandbox';

  const modelIcon = config?.provider === 'ollama'
    ? '🦙'
    : config?.provider === 'gemini'
      ? '✨'
      : '⚡';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && <div className="sidebar-mobile-backdrop" onClick={onToggle} />}

      <aside className={`editorial-sidebar ${isOpen ? 'is-open' : 'is-collapsed'}`}>
        {/* Header / Brand */}
        <div className="sidebar-header">
          <div className="sidebar-brand" onClick={onNewProject} title="RepoBlueprint AI Home">
            {/* Minimalist Editorial Terracotta Logo Mark */}
            <div className="sidebar-logo-mark" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07l14.14-14.14" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
            <div className="sidebar-brand-text">
              <span className="brand-title">RepoBlueprint</span>
              <span className="brand-subtitle">Architecture AI</span>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={onToggle}
            aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>

        {/* Primary CTA: New Project / New Chat */}
        <div className="sidebar-actions">
          <button
            type="button"
            id="sidebar-new-project-btn"
            className="sidebar-new-btn"
            onClick={onNewProject}
          >
            <span className="plus-icon">＋</span>
            <span>New Blueprint</span>
          </button>
        </div>

        {/* Search */}
        <div className="sidebar-search">
          <div className="search-input-wrapper">
            <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sidebar-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Recent Items grouped by Today / Yesterday / Previous 7 days */}
        <div className="sidebar-recents-list">
          {filteredGroups.map(group => (
            <div key={group.group} className="recents-group">
              <div className="recents-group-title">{group.group}</div>
              <div className="recents-items">
                {group.items.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className={`recent-item-btn ${activeProjectId === item.id ? 'is-active' : ''}`}
                    onClick={() => onSelectProject && onSelectProject(item)}
                    title={item.title}
                  >
                    <span className="recent-item-title">{item.title}</span>
                    <span className="recent-item-tag">{item.tag}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {filteredGroups.length === 0 && (
            <div className="recents-empty">No projects match "{searchQuery}"</div>
          )}
        </div>

        {/* Footer: User / Model Profile & Theme Toggle */}
        <div className="sidebar-footer">
          <div className="sidebar-model-status" title={`Active engine: ${modelLabel}`}>
            <span className="model-avatar">{modelIcon}</span>
            <div className="model-info">
              <span className="model-name">{modelLabel}</span>
              <span className="model-status-indicator">
                <span className="status-dot" />
                <span>Ready & Private</span>
              </span>
            </div>
            <button
              type="button"
              className="btn-icon sidebar-settings-btn"
              onClick={onOpenSettings}
              title="Configure AI Engine"
            >
              ⚙️
            </button>
          </div>

          <div className="sidebar-footer-row">
            <ThemeToggle className="sidebar-theme-toggle" />
          </div>
        </div>
      </aside>
    </>
  );
}
