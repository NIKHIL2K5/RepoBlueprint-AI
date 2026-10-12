import './LoadingScreen.css';

const STAGES = [
  { icon: '👁️', text: 'Reading your idea...' },
  { icon: '🧠', text: 'Understanding components & flows...' },
  { icon: '🏗️', text: 'Designing the architecture...' },
  { icon: '💰', text: 'Calculating cost estimates...' },
  { icon: '🔎', text: 'Researching the market & tech...' },
  { icon: '📦', text: 'Scaffolding the repo structure...' },
  { icon: '✨', text: 'Finalizing your blueprint...' },
];

export default function LoadingScreen({ phase = 1, currentStage = 0 }) {
  const stageList = phase === 1 ? STAGES.slice(0, 2) : STAGES;
  const title = phase === 1
    ? 'Gemma 4 is analyzing your idea...'
    : 'Generating your Master Blueprint...';

  return (
    <div className="loading-screen">
      <div className="loading-content">
        {/* Pulsing Blueprint Logo */}
        <div className="loading-logo">
          <div className="loading-ring loading-ring--outer" />
          <div className="loading-ring loading-ring--middle" />
          <div className="loading-ring loading-ring--inner" />
          <span className="loading-icon">📐</span>
        </div>

        <h2 className="loading-title">{title}</h2>
        <p className="loading-subtitle">
          {phase === 1
            ? 'Powered by Google Gemma 4 Multimodal Vision'
            : 'Building your complete project architecture & scaffold'}
        </p>

        {/* Progress Stages */}
        <div className="loading-stages">
          {stageList.map((stage, i) => (
            <div
              key={i}
              className={`loading-stage ${i < currentStage ? 'done' : i === currentStage ? 'active' : 'pending'}`}
            >
              <div className="stage-indicator">
                {i < currentStage ? '✓' : i === currentStage ? <div className="spinner" /> : '○'}
              </div>
              <span>{stage.icon} {stage.text}</span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="loading-bar">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${Math.round((currentStage / stageList.length) * 100)}%` }}
            />
          </div>
          <span className="loading-pct">{Math.round((currentStage / stageList.length) * 100)}%</span>
        </div>

        <p className="loading-tip">
          💡 Tip: The more detail you gave, the more accurate and complete your blueprint will be.
        </p>
      </div>
    </div>
  );
}
