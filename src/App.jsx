import { useState, useEffect } from 'react';
import './styles/globals.css';
import './styles/App.css';
import Sidebar from './components/Sidebar';
import SetupScreen from './components/SetupScreen';
import InputStage from './components/InputStage';
import AlignmentPhase from './components/AlignmentPhase';
import BlueprintDashboard from './components/BlueprintDashboard';
import LoadingScreen from './components/LoadingScreen';
import CopilotDrawer from './components/CopilotDrawer';
import ThemeToggle from './components/ThemeToggle';
import { understandIdea, generateMasterBlueprint } from './services/gemini';
import { downloadProjectZip } from './services/zipper';
import { SAMPLE_IDEAS } from './data/samples';

const STATE = {
  SETUP:    'setup',
  INPUT:    'input',
  LOAD1:    'loading_phase1',
  ALIGN:    'alignment',
  LOAD2:    'loading_phase2',
  DASH:     'dashboard',
  ERROR:    'error',
};

export default function App() {
  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('rb_config');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // Apply saved theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('rb_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  // Saved projects history and active project tracking with localStorage
  const [savedProjects, setSavedProjects] = useState(() => {
    try {
      const saved = localStorage.getItem('rb_saved_projects');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeProjectId, setActiveProjectId] = useState(() => {
    return localStorage.getItem('rb_active_project_id') || '';
  });

  const [appState,      setAppState]      = useState(config ? STATE.INPUT : STATE.SETUP);
  const [loadingStage,  setLoadingStage]  = useState(0);
  const [understanding, setUnderstanding] = useState(null);
  const [blueprint,     setBlueprint]     = useState(null);
  const [error,         setError]         = useState('');
  const [sidebarOpen,   setSidebarOpen]   = useState(true);

  // Controlled states for deep Copilot action interaction with draft persistence
  const [inputIdeaText,    setInputIdeaText]    = useState(() => {
    try {
      return localStorage.getItem('rb_draft_idea') || '';
    } catch {
      return '';
    }
  });
  const [inputTab,         setInputTab]         = useState('sketch');
  const [alignmentAnswers, setAlignmentAnswers] = useState({});
  const [alignmentNotes,   setAlignmentNotes]   = useState('');
  const [dashboardTab,     setDashboardTab]     = useState('blueprint');
  const [estimatedDau,     setEstimatedDau]     = useState(5000);

  const handleIdeaTextChange = (text) => {
    setInputIdeaText(text);
    try {
      localStorage.setItem('rb_draft_idea', text);
    } catch (e) {
      console.warn('Failed to save draft:', e);
    }
  };

  // Restore active project on mount if previously viewed
  useEffect(() => {
    if (activeProjectId && savedProjects.length > 0) {
      const active = savedProjects.find(p => p.id === activeProjectId);
      if (active && active.blueprint && active.understanding) {
        setUnderstanding(active.understanding);
        setBlueprint(active.blueprint);
        if (active.ideaText) {
          setInputIdeaText(active.ideaText);
        } else if (active.understanding?.rawPrompt) {
          setInputIdeaText(active.understanding.rawPrompt);
        }
        if (config) setAppState(STATE.DASH);
      }
    }
  }, []);

  const handleSetupComplete = (cfg) => {
    localStorage.setItem('rb_config', JSON.stringify(cfg));
    setConfig(cfg);
    setAppState(STATE.INPUT);
  };

  const handleIdeaSubmit = async ({ ideaText, imageBase64, imageMime }) => {
    if (ideaText) {
      handleIdeaTextChange(ideaText);
    }
    setAppState(STATE.LOAD1);
    setLoadingStage(0);
    setError('');
    const stageTimer = setInterval(() => setLoadingStage(p => Math.min(p + 1, 1)), 1400);
    try {
      const result = await understandIdea(config, ideaText, imageBase64, imageMime);
      clearInterval(stageTimer);
      setUnderstanding(result);
      setAppState(STATE.ALIGN);
    } catch (err) {
      clearInterval(stageTimer);
      setError(formatError(err));
      setAppState(STATE.ERROR);
    }
  };

  const handleAlignmentConfirm = async (userRefinements = '') => {
    setAppState(STATE.LOAD2);
    setLoadingStage(0);
    setError('');
    let si = 0;
    const stageTimer = setInterval(() => { if (si < 5) setLoadingStage(++si); }, 2000);
    try {
      const combinedRefinements = userRefinements || (alignmentNotes ? `Additional requirements: ${alignmentNotes}` : '');
      const result = await generateMasterBlueprint(config, understanding, combinedRefinements);
      clearInterval(stageTimer);
      setLoadingStage(6);
      setBlueprint(result);

      // Save new project to history and active state in localStorage
      const projectId = 'proj_' + Date.now();
      const newProject = {
        id: projectId,
        title: result.repoName || understanding.projectTitle || 'Production Blueprint',
        tag: result.techStack?.backend?.name?.split(' ')[0] || result.techStack?.frontend?.name?.split(' ')[0] || 'Fullstack',
        date: new Date().toISOString(),
        ideaText: inputIdeaText,
        understanding,
        blueprint: result,
      };

      setSavedProjects(prev => {
        const updated = [newProject, ...prev.filter(p => p.title !== newProject.title && p.id !== projectId)];
        try {
          localStorage.setItem('rb_saved_projects', JSON.stringify(updated.slice(0, 50)));
        } catch (e) {
          console.warn('Failed to save project:', e);
        }
        return updated;
      });
      setActiveProjectId(projectId);
      try {
        localStorage.setItem('rb_active_project_id', projectId);
      } catch {}

      setTimeout(() => setAppState(STATE.DASH), 500);
    } catch (err) {
      clearInterval(stageTimer);
      setError(formatError(err));
      setAppState(STATE.ERROR);
    }
  };

  const handleReset = () => {
    setAppState(STATE.INPUT);
    setUnderstanding(null);
    setBlueprint(null);
    setActiveProjectId('');
    try {
      localStorage.removeItem('rb_active_project_id');
    } catch {}
    setError('');
  };

  const handleSelectProject = (item) => {
    if (!item) return;

    // 1. Saved custom project
    const match = savedProjects.find(p => p.id === item.id);
    if (match && match.blueprint && match.understanding) {
      setUnderstanding(match.understanding);
      setBlueprint(match.blueprint);
      setInputIdeaText(match.ideaText || match.title || '');
      setActiveProjectId(match.id);
      try {
        localStorage.setItem('rb_active_project_id', match.id);
      } catch {}
      setAppState(STATE.DASH);
      return;
    }

    // 2. Preset reference project
    const sample = SAMPLE_IDEAS.find(s => s.id === item.id || s.id.includes(item.id) || item.id.includes(s.id));
    if (sample && sample.sampleBlueprint && sample.sampleUnderstanding) {
      setUnderstanding(sample.sampleUnderstanding);
      setBlueprint(sample.sampleBlueprint);
      setInputIdeaText(sample.text || '');
      setActiveProjectId(sample.id);
      try {
        localStorage.setItem('rb_active_project_id', sample.id);
      } catch {}
      setAppState(STATE.DASH);
      return;
    }

    // 3. Fallback to default
    if (SAMPLE_IDEAS[0]) {
      setUnderstanding(SAMPLE_IDEAS[0].sampleUnderstanding);
      setBlueprint(SAMPLE_IDEAS[0].sampleBlueprint);
      setInputIdeaText(SAMPLE_IDEAS[0].text || '');
      setActiveProjectId(SAMPLE_IDEAS[0].id);
      try {
        localStorage.setItem('rb_active_project_id', SAMPLE_IDEAS[0].id);
      } catch {}
      setAppState(STATE.DASH);
    }
  };

  const handleDeleteProject = (projectId) => {
    setSavedProjects(prev => {
      const updated = prev.filter(p => p.id !== projectId);
      try {
        localStorage.setItem('rb_saved_projects', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    if (activeProjectId === projectId) {
      handleReset();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('rb_config');
    setConfig(null);
    setAppState(STATE.SETUP);
    setUnderstanding(null);
    setBlueprint(null);
  };

  const handleSwitchToDemo = () => {
    const demoCfg = { provider: 'demo', isDemo: true };
    localStorage.setItem('rb_config', JSON.stringify(demoCfg));
    setConfig(demoCfg);
    setError('');
    handleIdeaSubmit({ ideaText: inputIdeaText || 'AI-Powered Habit Tracker & Intelligent Architecture Co-Founder' });
  };

  // ── Execute Actions requested by Copilot ──
  const handleExecuteAction = (action) => {
    if (!action) return;

    switch (action.type) {
      case 'FILL_IDEA':
        if (action.params?.text) {
          handleIdeaTextChange(action.params.text);
          setInputTab('text');
          if (appState !== STATE.INPUT) setAppState(STATE.INPUT);
        }
        break;

      case 'APPEND_IDEA':
        if (action.params?.text) {
          handleIdeaTextChange(inputIdeaText ? inputIdeaText + '\n\n' + action.params.text : action.params.text);
          if (appState !== STATE.INPUT) setAppState(STATE.INPUT);
        }
        break;

      case 'SWITCH_INPUT_TAB':
        if (action.params?.tab) {
          setInputTab(action.params.tab);
          if (appState !== STATE.INPUT) setAppState(STATE.INPUT);
        }
        break;

      case 'LOAD_SAMPLE': {
        const sampleId = action.params?.sampleId || 'habit';
        const match = SAMPLE_IDEAS.find(s => s.id === sampleId) || SAMPLE_IDEAS[0];
        if (match) {
          setInputIdeaText(match.text);
          setInputTab('text');
          if (appState !== STATE.INPUT) setAppState(STATE.INPUT);
        }
        break;
      }

      case 'SUBMIT_IDEA':
        if (inputIdeaText.trim().length > 5) {
          handleIdeaSubmit({ ideaText: inputIdeaText });
        } else {
          const defaultText = SAMPLE_IDEAS[0].text;
          setInputIdeaText(defaultText);
          handleIdeaSubmit({ ideaText: defaultText });
        }
        break;

      case 'SELECT_ALIGNMENT_ANSWER': {
        const qIdx = action.params?.questionIndex ?? 0;
        const opt = action.params?.option;
        if (opt) {
          setAlignmentAnswers(prev => ({ ...prev, [qIdx]: opt }));
          if (appState !== STATE.ALIGN && understanding) setAppState(STATE.ALIGN);
        }
        break;
      }

      case 'SET_ALIGNMENT_NOTES':
        if (action.params?.notes) {
          setAlignmentNotes(action.params.notes);
          if (appState !== STATE.ALIGN && understanding) setAppState(STATE.ALIGN);
        }
        break;

      case 'CONFIRM_ALIGNMENT':
        if (understanding) {
          handleAlignmentConfirm();
        }
        break;

      case 'SWITCH_DASHBOARD_TAB':
        if (action.params?.tab) {
          setDashboardTab(action.params.tab);
          if (appState !== STATE.DASH && blueprint) setAppState(STATE.DASH);
        }
        break;

      case 'UPDATE_TECH_STACK':
      case 'MODIFY_BLUEPRINT': {
        const { layer, name, reason, alternatives, mermaidOld, mermaidNew } = action.params || {};
        setBlueprint(prev => {
          if (!prev) return prev;
          const updated = { ...prev };

          // Update techStack specifications
          if (layer && updated.techStack) {
            updated.techStack = {
              ...updated.techStack,
              [layer]: {
                name: name || updated.techStack[layer]?.name,
                reason: reason || updated.techStack[layer]?.reason || 'Updated based on architectural requirement.',
                alternatives: alternatives || updated.techStack[layer]?.alternatives || []
              }
            };
          }

          // Live update Mermaid topology diagram so the visual architecture reflects the change!
          if (updated.mermaidDiagram) {
            let diagram = updated.mermaidDiagram;
            if (mermaidOld && mermaidNew) {
              diagram = diagram.replaceAll(mermaidOld, mermaidNew);
            } else if (layer === 'database') {
              const newDb = name || 'MongoDB Atlas (NoSQL)';
              diagram = diagram
                .replace(/PostgreSQL\s*\([^)\n]*\)/gi, `${newDb}`)
                .replace(/PostgreSQL/gi, newDb)
                .replace(/Postgres/gi, newDb)
                .replace(/MySQL/gi, newDb);
            } else if (layer === 'backend') {
              const newBack = name || 'Node.js (API Gateway)';
              diagram = diagram
                .replace(/FastAPI\s*\([^)\n]*\)/gi, newBack)
                .replace(/FastAPI/gi, newBack);
            } else if (layer === 'frontend') {
              const newFront = name || 'Next.js 15';
              diagram = diagram
                .replace(/React\s*19\s*\+\s*Vite/gi, newFront)
                .replace(/React/gi, newFront);
            }
            updated.mermaidDiagram = diagram;
          }

          // Persist updated blueprint to saved projects
          setSavedProjects(projects => {
            const updatedProjects = projects.map(p => {
              if (p.id === activeProjectId || (!activeProjectId && p.title === updated.repoName)) {
                return { ...p, blueprint: updated };
              }
              return p;
            });
            try {
              localStorage.setItem('rb_saved_projects', JSON.stringify(updatedProjects));
            } catch {}
            return updatedProjects;
          });

          return updated;
        });
        break;
      }

      case 'SET_DAU':
        if (action.params?.dau) {
          setEstimatedDau(action.params.dau);
          setDashboardTab('cost');
          if (appState !== STATE.DASH && blueprint) setAppState(STATE.DASH);
        }
        break;

      case 'DOWNLOAD_REPO':
        if (understanding && blueprint) {
          downloadProjectZip(understanding, blueprint);
        }
        break;

      case 'SWITCH_TO_DEMO':
        handleSwitchToDemo();
        break;

      default:
        console.warn('Unknown action type:', action.type);
    }
  };

  const isLoading = appState === STATE.LOAD1 || appState === STATE.LOAD2;
  const showSidebar = appState !== STATE.SETUP && !isLoading;

  // Live context payload for Copilot
  const copilotAppContext = {
    stage: appState,
    ideaText: inputIdeaText || understanding?.rawPrompt || understanding?.corePurpose || understanding?.oneLiner || '',
    inputTab,
    understanding,
    alignmentAnswers,
    additionalNotes: alignmentNotes,
    blueprint,
    dashboardTab,
    dau: estimatedDau,
  };

  // Setup screen: full-page, no sidebar
  if (appState === STATE.SETUP) {
    return (
      <div className="app app--setup">
        <SetupScreen onComplete={handleSetupComplete} />
      </div>
    );
  }

  // Loading screens: full-page, no sidebar
  if (isLoading) {
    return (
      <div className="app app--loading">
        <LoadingScreen phase={appState === STATE.LOAD1 ? 1 : 2} currentStage={loadingStage} />
      </div>
    );
  }

  return (
    <div className={`app app--layout ${sidebarOpen ? 'sidebar-is-open' : 'sidebar-is-closed'}`}>
      {/* Editorial Left Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(prev => !prev)}
        onNewProject={handleReset}
        onSelectProject={handleSelectProject}
        onDeleteProject={handleDeleteProject}
        activeProjectId={activeProjectId}
        savedProjects={savedProjects}
        config={config}
        onOpenSettings={handleLogout}
      />

      {/* Main Content Area */}
      <div className="app-content">
        {/* Top Navbar */}
        <nav className="app-topbar">
          {/* Sidebar toggle (mobile or collapsed) */}
          <button
            type="button"
            id="sidebar-toggle-btn"
            className="btn-icon topbar-toggle-btn"
            onClick={() => setSidebarOpen(prev => !prev)}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* Breadcrumb / Stage indicator */}
          <div className="topbar-breadcrumb">
            <span className="topbar-brand">RepoBlueprint</span>
            <span className="topbar-sep">·</span>
            <span className="topbar-stage">{getStageLabel(appState)}</span>
          </div>

          {/* Right Actions */}
          <div className="topbar-actions">
            {config && (
              <div className="topbar-engine-badge">
                {config.provider === 'demo'
                  ? '⚡ Sandbox'
                  : config.provider === 'gemini'
                    ? `✨ Gemini`
                    : `🦙 ${config.ollamaModel || 'Ollama'}`}
              </div>
            )}
            {appState === STATE.DASH && (
              <button className="btn btn-secondary" onClick={handleReset} id="new-blueprint-btn">
                + New Blueprint
              </button>
            )}
            <ThemeToggle />
            <button className="btn btn-ghost" onClick={handleLogout} title="Change AI settings" id="settings-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            </button>
          </div>
        </nav>

        {/* Page Content */}
        <main className="app-main">
          {appState === STATE.INPUT && (
            <InputStage
              onSubmit={handleIdeaSubmit}
              ideaText={inputIdeaText}
              onIdeaTextChange={handleIdeaTextChange}
              activeTab={inputTab}
              onActiveTabChange={setInputTab}
            />
          )}

          {appState === STATE.ALIGN && understanding && (
            <AlignmentPhase
              understanding={understanding}
              onConfirm={handleAlignmentConfirm}
              onBack={handleReset}
              answers={alignmentAnswers}
              onAnswersChange={setAlignmentAnswers}
              additionalNotes={alignmentNotes}
              onNotesChange={setAlignmentNotes}
            />
          )}

          {appState === STATE.DASH && understanding && blueprint && (
            <BlueprintDashboard
              understanding={understanding}
              blueprint={blueprint}
              onBack={() => setAppState(STATE.ALIGN)}
              activeTab={dashboardTab}
              onActiveTabChange={setDashboardTab}
              estimatedDau={estimatedDau}
              onDauChange={setEstimatedDau}
            />
          )}

          {appState === STATE.ERROR && (
            <div className="error-screen">
              <div className="error-box card animate-fade-in" style={{ maxWidth: 540 }}>
                <div className="error-icon-wrap">⚠️</div>
                <h3 className="error-title">AI Engine Issue</h3>
                <p className="error-message">{error}</p>
                <div className="error-actions">
                  <button
                    id="error-switch-demo-btn"
                    className="btn btn-primary"
                    onClick={handleSwitchToDemo}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    ⚡ Continue with Instant Demo
                  </button>
                  <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                    <button className="btn btn-secondary" onClick={handleReset} style={{ flex: 1, justifyContent: 'center' }}>
                      ← Try Again
                    </button>
                    <button className="btn btn-ghost" onClick={handleLogout} style={{ flex: 1, justifyContent: 'center' }}>
                      ⚙️ Change Key
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        <footer className="app-footer">
          <span>RepoBlueprint AI · Hacktoberfest Hack Day 2026 · NIAT-KKH × MLH · MIT License</span>
          <span className="footer-sep">·</span>
          <span>Powered by {config?.provider === 'gemini' ? 'Google Gemini' : config?.provider === 'ollama' ? `Ollama (${config?.ollamaModel})` : 'Instant Sandbox'}</span>
        </footer>
      </div>

      {/* Always-Supported Co-Founder Chatbot */}
      <CopilotDrawer
        appContext={copilotAppContext}
        onExecuteAction={handleExecuteAction}
        config={config}
      />
    </div>
  );
}

function getStageLabel(state) {
  switch (state) {
    case STATE.INPUT:     return 'Idea Input';
    case STATE.ALIGN:     return 'Architecture Alignment';
    case STATE.DASH:      return 'Blueprint Dashboard';
    case STATE.ERROR:     return 'Error';
    default:              return '';
  }
}

function formatError(err) {
  const msg = err?.message || '';
  if (msg.includes('GOOGLE_404') || msg.includes('not found for API version v1beta') || msg.includes('is not found for API version')) {
    return 'Google returned 404 Not Found for this API key. The Generative Language API may not be enabled for this project, or the key was created for a different service. Get a free unrestricted key at aistudio.google.com/app/apikey, or click below to continue with Instant Demo mode!';
  }
  if (msg.includes('API_KEY') || msg.includes('401') || msg.includes('API key not valid')) {
    return 'Invalid API key. Please visit aistudio.google.com/app/apikey to create a free API key and re-enter it.';
  }
  if (msg.includes('429')) return 'Rate limit hit. The API is receiving high traffic. Wait 30 seconds and try again.';
  if (msg.includes('fetch') || msg.includes('network')) return 'Network error. Please check your internet connection and try again.';
  if (msg.includes('JSON')) return 'The AI returned an unexpected response format. Please try again.';
  return `Error: ${msg || 'Something went wrong. Please try again.'}`;
}
