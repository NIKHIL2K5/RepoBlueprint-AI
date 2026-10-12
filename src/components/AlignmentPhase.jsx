import { useState, useEffect } from 'react';
import { synthesizeProsAndConsAndCompetitors } from '../services/gemini';
import './AlignmentPhase.css';

export default function AlignmentPhase({
  understanding,
  onUpdateUnderstanding,
  onConfirm,
  onBack,
  answers: externalAnswers,
  onAnswersChange,
  additionalNotes: externalNotes,
  onNotesChange,
}) {
  const [internalAnswers, setInternalAnswers] = useState({});
  const answers = externalAnswers !== undefined ? externalAnswers : internalAnswers;
  const setAnswers = onAnswersChange || setInternalAnswers;

  const [internalNotes, setInternalNotes] = useState('');
  const additionalNotes = externalNotes !== undefined ? externalNotes : internalNotes;
  const setAdditionalNotes = onNotesChange || setInternalNotes;

  const [customAnswer, setCustomAnswer] = useState({});
  const [selectedInnovations, setSelectedInnovations] = useState(() => {
    const set = new Set();
    (understanding?.innovationSuggestions || []).forEach((_, i) => set.add(i));
    return set;
  });

  // Inline editing state for Idea Name & Description
  const [isEditingIdea, setIsEditingIdea] = useState(false);
  const [editedTitle, setEditedTitle] = useState(understanding?.projectTitle || '');
  const [editedOneLiner, setEditedOneLiner] = useState(understanding?.oneLiner || '');
  const [editedPurpose, setEditedPurpose] = useState(understanding?.corePurpose || '');

  useEffect(() => {
    setEditedTitle(understanding?.projectTitle || '');
    setEditedOneLiner(understanding?.oneLiner || '');
    setEditedPurpose(understanding?.corePurpose || '');
  }, [understanding?.projectTitle, understanding?.oneLiner, understanding?.corePurpose]);

  const handleSaveIdea = () => {
    if (onUpdateUnderstanding && understanding) {
      onUpdateUnderstanding({
        ...understanding,
        projectTitle: editedTitle.trim() || understanding.projectTitle,
        oneLiner: editedOneLiner.trim() || understanding.oneLiner,
        corePurpose: editedPurpose.trim() || understanding.corePurpose,
      });
    }
    setIsEditingIdea(false);
  };

  const handleCancelIdea = () => {
    setEditedTitle(understanding?.projectTitle || '');
    setEditedOneLiner(understanding?.oneLiner || '');
    setEditedPurpose(understanding?.corePurpose || '');
    setIsEditingIdea(false);
  };

  const handleOptionSelect = (qIdx, option) => {
    setAnswers(prev => ({ ...prev, [qIdx]: option }));
  };

  const toggleInnovation = (idx) => {
    setSelectedInnovations(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const buildRefinementString = () => {
    const parts = [];

    // Clarifying answers
    (understanding?.clarifyingQuestions || []).forEach((q, i) => {
      const ans = customAnswer[i]?.trim() || answers[i];
      if (ans) parts.push(`Clarification on "${q.question}": ${ans}`);
    });

    // Selected innovations
    const chosenFeatures = (understanding?.innovationSuggestions || [])
      .filter((_, i) => selectedInnovations.has(i))
      .map(s => s.title);
    if (chosenFeatures.length > 0) {
      parts.push(`Include these innovation features: ${chosenFeatures.join(', ')}`);
    }

    if (additionalNotes.trim()) {
      parts.push(`Additional Architectural Requirements: ${additionalNotes.trim()}`);
    }

    return parts.join('\n\n');
  };

  const handleGenerate = () => {
    onConfirm(buildRefinementString());
  };

  // Safe fallback synthesizer ensures Pros & Cons, Websites, and GitHub projects are ALWAYS fully populated
  const rawQuery = understanding?.rawPrompt || understanding?.projectTitle || '';
  const fallbackData = (!understanding?.prosAndCons?.pros?.length || !understanding?.similarWebsites?.length || !understanding?.openSourceProjects?.length)
    ? synthesizeProsAndConsAndCompetitors(rawQuery, understanding?.projectTitle || '', understanding?.corePurpose || '')
    : null;

  const pros = (understanding?.prosAndCons?.pros?.length ? understanding.prosAndCons.pros : fallbackData?.prosAndCons?.pros) || [];
  const cons = (understanding?.prosAndCons?.cons?.length ? understanding.prosAndCons.cons : fallbackData?.prosAndCons?.cons) || [];
  const similarWebsites = (understanding?.similarWebsites?.length ? understanding.similarWebsites : fallbackData?.similarWebsites) || [];
  const openSourceProjects = (understanding?.openSourceProjects?.length ? understanding.openSourceProjects : fallbackData?.openSourceProjects) || [];

  const questions = understanding?.clarifyingQuestions || [];
  const innovations = understanding?.innovationSuggestions || [];
  const components = understanding?.identifiedComponents || [];
  const actors = understanding?.keyActors || [];
  const assumptions = understanding?.assumptions || [];

  return (
    <div className="alignment-phase">
      {/* Header */}
      <div className="alignment-header animate-slide-up">
        <div className="step-indicator">
          <div className="step-dot active" />
          <div className="step-line" />
          <div className="step-dot active" />
        </div>
        <h2 className="alignment-title">
          🤝 Technical Co-Founder Alignment
        </h2>
        <p className="alignment-subtitle">
          Here is how the AI synthesized your idea. Review the generated project identity,
          explore pros & cons, market benchmarks, and open-source foundations before generating your repository.
        </p>
      </div>

      {/* 1. Generated Idea Name, One-Liner & Deep Description Card */}
      <div className="idea-identity-card card animate-slide-up">
        <div className="idea-card-header">
          <div className="idea-card-title-group">
            <span className="idea-badge-icon">💡</span>
            <div>
              <h3 className="idea-section-heading">Generated Project Identity & Purpose</h3>
              <p className="idea-section-subheading">Understood and analyzed by AI Technical Co-Founder</p>
            </div>
          </div>
          {!isEditingIdea ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm edit-idea-btn"
              onClick={() => setIsEditingIdea(true)}
              title="Edit idea title and description"
            >
              ✏️ Edit Idea
            </button>
          ) : (
            <div className="idea-edit-actions">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSaveIdea}
              >
                💾 Save Changes
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleCancelIdea}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {!isEditingIdea ? (
          <div className="idea-display-body">
            <div className="project-title-row">
              <div className="project-icon">📐</div>
              <div className="project-title-info">
                <h1 className="project-name">{understanding?.projectTitle || 'Untitled Architecture'}</h1>
                <p className="project-one-liner">{understanding?.oneLiner || ''}</p>
              </div>
            </div>

            <div className="understanding-section">
              <div className="section-label">Core Purpose & Technical Solution</div>
              <p className="section-content purpose-text">{understanding?.corePurpose || ''}</p>
            </div>
          </div>
        ) : (
          <div className="idea-edit-form">
            <div className="edit-field-group">
              <label className="edit-label">Project / Idea Name</label>
              <input
                className="input-field edit-input"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                placeholder="e.g. VisionBridge AI"
              />
            </div>
            <div className="edit-field-group">
              <label className="edit-label">One-Line High Impact Pitch</label>
              <input
                className="input-field edit-input"
                value={editedOneLiner}
                onChange={(e) => setEditedOneLiner(e.target.value)}
                placeholder="One-sentence elevator pitch..."
              />
            </div>
            <div className="edit-field-group">
              <label className="edit-label">Core Purpose & Problem/Solution Breakdown</label>
              <textarea
                className="input-field edit-textarea"
                rows={4}
                value={editedPurpose}
                onChange={(e) => setEditedPurpose(e.target.value)}
                placeholder="Explain the real-world problem and technical solution..."
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. Strategic Pros & Cons Analysis */}
      {(pros.length > 0 || cons.length > 0) && (
        <div className="pros-cons-section card animate-slide-up">
          <div className="section-header-row">
            <div>
              <h3 className="section-title">⚖️ Strategic Architectural Pros & Cons Analysis</h3>
              <p className="section-subtitle">
                Rigorous evaluation of architectural advantages versus engineering bottlenecks with mitigations:
              </p>
            </div>
          </div>

          <div className="pros-cons-grid">
            {/* Pros Column */}
            <div className="pros-column">
              <div className="column-header column-header--pros">
                <span className="column-icon">✅</span>
                <span className="column-title">Architectural & Competitive Pros</span>
                <span className="badge badge-green">{pros.length} Strengths</span>
              </div>
              <div className="pros-list">
                {pros.map((pro, i) => (
                  <div key={i} className="pro-card">
                    <div className="pro-card-header">
                      <span className="pro-badge">{pro.badge || 'Advantage'}</span>
                      <h4 className="pro-title">{pro.title}</h4>
                    </div>
                    <p className="pro-detail">{pro.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Cons Column */}
            <div className="cons-column">
              <div className="column-header column-header--cons">
                <span className="column-icon">⚠️</span>
                <span className="column-title">Technical Bottlenecks & Mitigations</span>
                <span className="badge badge-warning">{cons.length} Challenges</span>
              </div>
              <div className="cons-list">
                {cons.map((con, i) => (
                  <div key={i} className="con-card">
                    <div className="con-card-header">
                      <span className="con-badge">{con.badge || 'Trade-off'}</span>
                      <h4 className="con-title">{con.title}</h4>
                    </div>
                    <p className="con-detail">{con.detail}</p>
                    {con.mitigation && (
                      <div className="mitigation-box">
                        <span className="mitigation-label">💡 Engineering Mitigation:</span>
                        <p className="mitigation-text">{con.mitigation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Similar Websites Over The Web */}
      {similarWebsites.length > 0 && (
        <div className="similar-websites-section card animate-slide-up">
          <div className="section-header-row">
            <div>
              <h3 className="section-title">🌐 Similar Websites Over The Web (Market Landscape)</h3>
              <p className="section-subtitle">
                Real commercial products across the web and how your idea carves a competitive moat:
              </p>
            </div>
            <span className="badge badge-cyan">{similarWebsites.length} Analyzed</span>
          </div>

          <div className="similar-websites-grid">
            {similarWebsites.map((site, i) => (
              <div key={i} className="website-card">
                <div className="website-card-top">
                  <div className="website-info">
                    <div className="website-title-row">
                      <h4 className="website-name">{site.name}</h4>
                      <a
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="website-link"
                        title={`Open ${site.name} in new tab`}
                      >
                        Visit ↗
                      </a>
                    </div>
                    <span className="website-category">{site.category}</span>
                  </div>
                </div>
                <p className="website-desc">{site.description}</p>
                {site.moat && (
                  <div className="website-moat">
                    <span className="moat-badge">⚡ Our Competitive Edge:</span>
                    <p className="moat-text">{site.moat}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Top Open-Source Projects (GitHub) */}
      {openSourceProjects.length > 0 && (
        <div className="open-source-section card animate-slide-up">
          <div className="section-header-row">
            <div>
              <h3 className="section-title">🐙 Top Open-Source Projects (GitHub Ecosystem)</h3>
              <p className="section-subtitle">
                Real, high-impact GitHub repositories to benchmark, fork, or integrate into your architecture:
              </p>
            </div>
            <span className="badge badge-violet">{openSourceProjects.length} Repositories</span>
          </div>

          <div className="github-projects-grid">
            {openSourceProjects.map((repo, i) => (
              <div key={i} className="github-project-card">
                <div className="repo-card-top">
                  <div>
                    <div className="repo-title-row">
                      <span className="repo-octo-icon">📦</span>
                      <h4 className="repo-name">{repo.name}</h4>
                    </div>
                    <a
                      href={repo.url || `https://github.com/${repo.repo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="repo-slug"
                    >
                      {repo.repo} ↗
                    </a>
                  </div>
                  {repo.stars && <span className="repo-stars">{repo.stars}</span>}
                </div>

                {repo.techStack && (
                  <div className="repo-tech-stack">
                    <span className="stack-tag">{repo.techStack}</span>
                  </div>
                )}

                <p className="repo-desc">{repo.description}</p>

                {repo.integration && (
                  <div className="repo-synergy">
                    <span className="synergy-label">🔗 Architectural Synergy:</span>
                    <p className="synergy-text">{repo.integration}</p>
                  </div>
                )}

                <a
                  href={repo.url || `https://github.com/${repo.repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm github-view-btn"
                >
                  View on GitHub ↗
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Key Actors, Workflow & Topology Components */}
      <div className="understanding-card card animate-slide-up">
        <div className="understanding-header">
          <h3>🏗️ System Architecture & Workflow Pipeline</h3>
          <span className="badge badge-cyan">Topology Specs</span>
        </div>

        {actors.length > 0 && (
          <div className="understanding-section">
            <div className="section-label">Key Actors & Roles Identified</div>
            <div className="tags-row">
              {actors.map((actor, i) => (
                <span key={i} className="tag">{actor}</span>
              ))}
            </div>
          </div>
        )}

        {understanding?.coreWorkflow && (
          <div className="understanding-section">
            <div className="section-label">Core Workflow Pipeline</div>
            <p className="section-content workflow">{understanding.coreWorkflow}</p>
          </div>
        )}

        {components.length > 0 && (
          <div className="understanding-section">
            <div className="section-label">Detected Topology Components ({components.length})</div>
            <div className="components-grid">
              {components.map((comp, i) => (
                <div key={i} className={`component-chip component-chip--${comp.type}`}>
                  <span className="comp-icon">{getComponentIcon(comp.type)}</span>
                  <div>
                    <div className="comp-name">{comp.name}</div>
                    <div className="comp-role">{comp.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {assumptions.length > 0 && (
          <div className="assumptions-banner">
            <span>💡 Architectural Assumptions:</span>
            <ul>
              {assumptions.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* 6. Innovation Suggestions with Toggles */}
      {innovations.length > 0 && (
        <div className="innovations-section animate-slide-up">
          <div className="section-header-row">
            <div>
              <h3 className="section-title">💡 Smart Architectural Enhancements</h3>
              <p className="section-subtitle">Features identified to give your repo a technical edge. Click to toggle:</p>
            </div>
            <span className="badge badge-violet">{selectedInnovations.size} Selected</span>
          </div>

          <div className="innovations-grid">
            {innovations.map((sug, i) => {
              const isSelected = selectedInnovations.has(i);
              return (
                <div
                  key={i}
                  className={`innovation-card card ${isSelected ? 'innovation-card--selected' : ''}`}
                  onClick={() => toggleInnovation(i)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="innovation-header">
                    <div className="innovation-toggle-indicator">
                      {isSelected ? '✓' : '+'}
                    </div>
                    <span className="innovation-title">{sug.title}</span>
                    <span className={`badge ${sug.complexity === 'Low' ? 'badge-green' : sug.complexity === 'High' ? 'badge-violet' : 'badge-cyan'}`}>
                      {sug.complexity} Complexity
                    </span>
                  </div>
                  <p className="innovation-desc">{sug.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. Clarifying Questions */}
      {questions.length > 0 && (
        <div className="questions-section animate-slide-up">
          <h3 className="section-title">❓ Quick Technical Decisions</h3>
          <p className="section-subtitle">Select your preferred architectural path or write custom requirements:</p>
          <div className="questions-list">
            {questions.map((q, qIdx) => (
              <div key={qIdx} className="question-card card">
                <div className="question-text">{qIdx + 1}. {q.question}</div>
                <div className="question-why">💭 <em>Architecture Impact:</em> {q.why}</div>
                <div className="question-options">
                  {(q.options || []).map((opt, oIdx) => (
                    <button
                      key={oIdx}
                      type="button"
                      className={`option-btn ${answers[qIdx] === opt && !customAnswer[qIdx] ? 'option-btn--selected' : ''}`}
                      onClick={() => {
                        handleOptionSelect(qIdx, opt);
                        setCustomAnswer(prev => ({ ...prev, [qIdx]: '' }));
                      }}
                    >
                      {answers[qIdx] === opt && !customAnswer[qIdx] ? '✓ ' : ''}{opt}
                    </button>
                  ))}
                </div>
                <input
                  className="input-field custom-answer"
                  placeholder="Or enter your custom architectural choice..."
                  value={customAnswer[qIdx] || ''}
                  onChange={(e) => setCustomAnswer(prev => ({ ...prev, [qIdx]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. Additional Constraints */}
      <div className="additional-notes card animate-slide-up">
        <div className="section-label">📝 Additional Constraints or Preferences (Optional)</div>
        <textarea
          className="input-field"
          placeholder="e.g. 'Must use Tailwind CSS', 'Prefers Docker Compose for local development', 'Targeting Vercel deployment'..."
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          rows={3}
        />
      </div>

      {/* 9. Actions */}
      <div className="alignment-actions animate-slide-up">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          ← Back to Sketch
        </button>
        <button
          id="generate-blueprint-btn"
          type="button"
          className="btn btn-primary generate-btn"
          onClick={handleGenerate}
        >
          <span>🚀</span>
          <span>Generate Master Architecture Blueprint</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}

function getComponentIcon(type) {
  const icons = {
    frontend: '🎨', backend: '⚙️', database: '🗄️',
    ai: '🤖', cache: '⚡', 'external-api': '🔌', other: '📦'
  };
  return icons[type] || '📦';
}
