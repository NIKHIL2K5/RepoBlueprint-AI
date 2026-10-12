import { useState } from 'react';
import './AlignmentPhase.css';

export default function AlignmentPhase({
  understanding,
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
    // Select all by default
    const set = new Set();
    (understanding?.innovationSuggestions || []).forEach((_, i) => set.add(i));
    return set;
  });

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
          Here is how the AI parsed your napkin idea. Review the detected components,
          answer a few architecture questions, and select innovations to include in your blueprint.
        </p>
      </div>

      {/* Understanding Summary Card */}
      <div className="understanding-card card animate-slide-up">
        <div className="understanding-header">
          <h3>🧠 Architecture Understanding</h3>
          <span className="badge badge-cyan">Phase 1 Parsed</span>
        </div>

        <div className="project-title-row">
          <div className="project-icon">📐</div>
          <div>
            <h4 className="project-name">{understanding?.projectTitle || 'Project Title'}</h4>
            <p className="project-one-liner">{understanding?.oneLiner || ''}</p>
          </div>
        </div>

        <div className="understanding-section">
          <div className="section-label">Core Purpose & Value Proposition</div>
          <p className="section-content">{understanding?.corePurpose || ''}</p>
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

      {/* Innovation Suggestions with Toggles */}
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

      {/* Clarifying Questions */}
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

      {/* Additional Constraints */}
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

      {/* Actions */}
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
