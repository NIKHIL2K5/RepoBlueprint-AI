import { useState, useMemo } from 'react';
import './Sidebar.css';
import ThemeToggle from './ThemeToggle';
import { SAMPLE_IDEAS } from '../data/samples';

export default function Sidebar({
  isOpen = true,
  onToggle,
  onNewProject,
  activeProjectId = '',
  onSelectProject,
  onDeleteProject,
  savedProjects = [],
  config,
  onOpenSettings,
  currentUser,
  onOpenAuth,
  onOpenCloudinary,
}) {
  const [searchQuery, setSearchQuery] = useState('');

  // Combine user's saved projects with preset reference blueprints
  const groupedProjects = useMemo(() => {
    const list = [];

    // 1. User's custom saved blueprints
    if (savedProjects && savedProjects.length > 0) {
      const now = new Date();
      const today = [];
      const yesterday = [];
      const earlier = [];

      savedProjects.forEach(proj => {
        const pDate = proj.date || proj.createdAt ? new Date(proj.date || proj.createdAt) : null;
        if (!pDate || isNaN(pDate.getTime())) {
          today.push({
            id: proj.id,
            title: proj.title || 'Custom Architecture Blueprint',
            tag: proj.tag || 'Custom',
            isUserProject: true,
          });
          return;
        }

        const diffDays = Math.floor((now - pDate) / (1000 * 60 * 60 * 24));
        const item = {
          id: proj.id,
          title: proj.title || 'Custom Architecture Blueprint',
          tag: proj.tag || 'Custom',
          isUserProject: true,
        };

        if (diffDays === 0) today.push(item);
        else if (diffDays === 1) yesterday.push(item);
        else earlier.push(item);
      });

      if (today.length > 0) list.push({ group: 'Today', items: today });
      if (yesterday.length > 0) list.push({ group: 'Yesterday', items: yesterday });
      if (earlier.length > 0) list.push({ group: 'Earlier Blueprints', items: earlier });
    }

    // 2. Preset reference blueprints from library
    const presets = SAMPLE_IDEAS.map(s => ({
      id: s.id,
      title: s.title,
      tag: s.tag,
      isUserProject: false,
    }));

    list.push({ group: 'Reference Blueprints', items: presets });

    // Apply search filter if query is entered
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list
      .map(g => ({
        ...g,
        items: g.items.filter(
          item =>
            item.title.toLowerCase().includes(q) ||
            item.tag.toLowerCase().includes(q)
        ),
      }))
      .filter(g => g.items.length > 0);
  }, [savedProjects, searchQuery]);

  const modelLabel =
    config?.provider === 'ollama'
      ? `Ollama · ${config?.ollamaModel || 'llama3.2:3b'}`
      : config?.provider === 'gemini'
      ? `Gemini · ${config?.geminiModel || '2.5 Flash'}`
      : 'Instant Sandbox';

  const modelIcon =
    config?.provider === 'ollama'
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

        {/* User Profile Card */}
        {currentUser && (
          <div className="sidebar-user-card" onClick={onOpenAuth} title="Click to view profile or switch account">
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.fullName}
              className="sidebar-user-avatar"
            />
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{currentUser.fullName}</span>
              <span className="sidebar-user-role">@{currentUser.username} · {currentUser.role}</span>
            </div>
            <span className="sidebar-user-menu-icon" title="Switch User">⇄</span>
          </div>
        )}

        {/* Primary CTAs: New Blueprint + Cloudinary Vault */}
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
          
          <button
            type="button"
            className="sidebar-cld-vault-btn"
            onClick={onOpenCloudinary}
            title="Open Cloudinary Media Vault"
          >
            <span className="cld-icon">☁️</span>
            <span>Cloudinary Vault</span>
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
              placeholder="Search blueprints..."
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

        {/* Recents & Blueprints List */}
        <div className="sidebar-recents-list">
          {groupedProjects.map(group => (
            <div key={group.group} className="recents-group">
              <div className="recents-group-title">{group.group}</div>
              <div className="recents-items">
                {group.items.map(item => (
                  <div
                    key={item.id}
                    className={`recent-item-row ${activeProjectId === item.id ? 'is-active' : ''}`}
                  >
                    <button
                      type="button"
                      className="recent-item-btn"
                      onClick={() => onSelectProject && onSelectProject(item)}
                      title={item.title}
                    >
                      <span className="recent-item-title">{item.title}</span>
                      <span className="recent-item-tag">{item.tag}</span>
                    </button>
                    {item.isUserProject && onDeleteProject && (
                      <button
                        type="button"
                        className="recent-item-del-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete saved blueprint "${item.title}"?`)) {
                            onDeleteProject(item.id);
                          }
                        }}
                        title="Delete blueprint"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {groupedProjects.length === 0 && (
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
            <button
              type="button"
              className="sidebar-account-btn"
              onClick={onOpenAuth}
              title="Manage Account / Switch User"
            >
              👤 Switch User
            </button>
            <ThemeToggle className="sidebar-theme-toggle" />
          </div>
        </div>
      </aside>
    </>
  );
}
