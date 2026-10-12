import { useState } from 'react';
import './InputStage.css';
import WhiteboardCanvas from './WhiteboardCanvas';
import VoiceDictation from './VoiceDictation';
import { SAMPLE_IDEAS } from '../data/samples';

export default function InputStage({
  onSubmit,
  ideaText: externalIdeaText,
  onIdeaTextChange,
  activeTab: externalActiveTab,
  onActiveTabChange,
}) {
  const [internalActiveTab, setInternalActiveTab] = useState('sketch');
  const [internalIdeaText, setInternalIdeaText] = useState('');

  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;
  const setActiveTab = onActiveTabChange || setInternalActiveTab;

  const ideaText = externalIdeaText !== undefined ? externalIdeaText : internalIdeaText;
  const setIdeaText = onIdeaTextChange || setInternalIdeaText;

  const [linkUrl, setLinkUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [imageMime, setImageMime] = useState(null);
  const [canvasBase64, setCanvasBase64] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleImageFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
      const base64 = e.target.result.split(',')[1];
      setImageBase64(base64);
      setImageMime(file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleImageFile(file);
    setActiveTab('image');
  };

  const handleSampleSelect = (sample) => {
    setIdeaText(sample.text);
    setActiveTab('text');
  };

  const handleSubmit = () => {
    let finalBase64 = null;
    let finalMime = null;

    if (activeTab === 'sketch' && canvasBase64) {
      finalBase64 = canvasBase64;
      finalMime = 'image/png';
    } else if (activeTab === 'image' && imageBase64) {
      finalBase64 = imageBase64;
      finalMime = imageMime;
    }

    let combinedText = ideaText.trim();
    if (linkUrl.trim()) {
      combinedText += `\n\nReference Link: ${linkUrl.trim()}`;
    }

    // If drawing napkin sketch without extra text, add default context
    if (!combinedText && finalBase64) {
      combinedText = 'Hand-drawn architecture napkin sketch. Extract all components, user flows, database layers, and data pipelines directly from the diagram.';
    }

    onSubmit({ ideaText: combinedText, imageBase64: finalBase64, imageMime: finalMime });
  };

  const canSubmit = ideaText.trim().length > 10 || (activeTab === 'sketch' && canvasBase64) || imageBase64 !== null;

  return (
    <div className="input-stage">
      {/* Header */}
      <div className="input-hero animate-slide-up">
        <div className="input-hero__badge">
          <span className="badge badge-cyan">✨ Multimodal Vision + Speech Recognition</span>
          <span className="badge badge-violet">🏆 MLH Hacktoberfest 2026</span>
        </div>
        <h1 className="input-hero__title">
          Turn Any Idea Into a
          <br />
          <span className="gradient-text">Production Blueprint</span>
        </h1>
        <p className="input-hero__subtitle">
          Doodle on the napkin whiteboard, dictate your vision via speech, snap a chalkboard photo,
          or write in plain words. RepoBlueprint acts as your technical co-founder: conducting an architectural
          alignment interview, designing interactive topology, estimating hosting costs, and generating a 1-click starter repo.
        </p>
      </div>

      {/* Preset Demos */}
      <div className="samples-section animate-slide-up delay-1">
        <div className="samples-header-row">
          <span className="samples-label">⚡ Test with an instant preset project:</span>
        </div>
        <div className="samples-grid">
          {SAMPLE_IDEAS.map((sample) => (
            <button
              key={sample.id}
              type="button"
              className="sample-card"
              onClick={() => handleSampleSelect(sample)}
            >
              <span className="sample-emoji">{sample.emoji}</span>
              <div className="sample-meta">
                <div className="sample-title">{sample.label}</div>
                <div className="sample-desc">{sample.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Input Card */}
      <div className="input-panel card animate-slide-up delay-2">
        {/* Tab switcher */}
        <div className="tab-list" role="tablist">
          {[
            { id: 'sketch', icon: '🎨', label: 'Draw on Napkin Canvas' },
            { id: 'voice',  icon: '🎙️', label: 'Dictate via Voice' },
            { id: 'text',   icon: '✍️', label: 'Describe Your Idea' },
            { id: 'image',  icon: '📸', label: 'Upload Board Photo' },
            { id: 'link',   icon: '🔗', label: 'Paste Doc / GitHub Link' },
          ].map(tab => (
            <button
              key={tab.id}
              role="tab"
              type="button"
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* 1. Whiteboard Canvas Tab */}
        {activeTab === 'sketch' && (
          <div className="input-body animate-slide-up">
            <WhiteboardCanvas onExportImage={(b64) => setCanvasBase64(b64)} />
            <div className="sketch-notes-row">
              <input
                type="text"
                className="input-field sketch-notes-input"
                placeholder="(Optional) Add any notes about your sketch — e.g., 'Targeting 10k users, prefer Python for backend'..."
                value={ideaText}
                onChange={(e) => setIdeaText(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* 2. Voice Dictation Tab (NEW!) */}
        {activeTab === 'voice' && (
          <div className="input-body animate-slide-up">
            <VoiceDictation
              value={ideaText}
              onChange={setIdeaText}
              onAppend={(newText) => setIdeaText(prev => (prev ? prev + ' ' + newText : newText))}
            />
            <div className="voice-transcript-wrapper">
              <div className="transcript-header-row">
                <span className="transcript-label">📝 Transcribed Idea Draft</span>
                <span className="char-count">{ideaText.length} characters</span>
              </div>
              <textarea
                className="input-field idea-textarea"
                placeholder="Your spoken words will transcribe here automatically. You can also edit, format, or type additional notes..."
                value={ideaText}
                onChange={(e) => setIdeaText(e.target.value)}
                rows={6}
              />
            </div>
          </div>
        )}

        {/* 3. Text Input Tab */}
        {activeTab === 'text' && (
          <div className="input-body animate-slide-up">
            <div className="textarea-top-actions">
              <span className="textarea-hint">Describe your project freely:</span>
              <button
                type="button"
                className="btn btn-ghost quick-voice-btn"
                onClick={() => setActiveTab('voice')}
                title="Switch to Voice Dictation"
              >
                🎙️ Dictate with Voice
              </button>
            </div>
            <textarea
              id="idea-text-input"
              className="input-field idea-textarea"
              placeholder="Describe your project freely: What problem does it solve? Who uses it? What tech stack do you imagine? Even rough thoughts work — our AI architect will organize the structure..."
              value={ideaText}
              onChange={(e) => setIdeaText(e.target.value)}
              rows={8}
            />
            <div className="char-count">
              {ideaText.length} characters
              {ideaText.length < 15 && <span className="char-hint"> — write at least a sentence or pick a preset above</span>}
            </div>
          </div>
        )}

        {/* 4. Image Upload Tab */}
        {activeTab === 'image' && (
          <div className="input-body animate-slide-up">
            <div
              className={`dropzone ${isDragging ? 'dropzone--active' : ''} ${imagePreview ? 'dropzone--filled' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input').click()}
              role="button"
              tabIndex={0}
              aria-label="Upload photo of your sketch or whiteboard"
            >
              <input
                id="file-input"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => handleImageFile(e.target.files[0])}
              />
              {imagePreview ? (
                <div className="dropzone__preview">
                  <img src={imagePreview} alt="Uploaded sketch" />
                  <button
                    type="button"
                    className="btn btn-ghost remove-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageFile(null);
                      setImagePreview(null);
                      setImageBase64(null);
                    }}
                  >
                    ✕ Remove Image
                  </button>
                </div>
              ) : (
                <div className="dropzone__empty">
                  <div className="dropzone__icon">📸</div>
                  <p className="dropzone__title">Drop your chalkboard or whiteboard photo here</p>
                  <p className="dropzone__subtitle">or click to browse — PNG, JPG, WEBP supported</p>
                  <p className="dropzone__tip">💡 Vision AI will trace every arrow, component label, and flow.</p>
                </div>
              )}
            </div>
            {imagePreview && (
              <textarea
                className="input-field idea-textarea"
                placeholder="(Optional) Add any extra constraints or explanations about this photo..."
                value={ideaText}
                onChange={(e) => setIdeaText(e.target.value)}
                rows={3}
                style={{ marginTop: '16px' }}
              />
            )}
          </div>
        )}

        {/* 5. Link Input Tab */}
        {activeTab === 'link' && (
          <div className="input-body animate-slide-up">
            <div className="link-input-group">
              <span className="link-icon">🔗</span>
              <input
                id="link-url-input"
                type="url"
                className="input-field link-input"
                placeholder="Paste link to Notion, GitHub issue, Markdown gist, Excalidraw, or blog post..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
            </div>
            <textarea
              className="input-field idea-textarea"
              placeholder="Describe the idea or specify what you want to extract from the link..."
              value={ideaText}
              onChange={(e) => setIdeaText(e.target.value)}
              rows={5}
              style={{ marginTop: '16px' }}
            />
          </div>
        )}

        {/* Action Footer */}
        <div className="input-footer">
          <div className="input-footer__info">
            <span className="info-dot" />
            <span>Processed securely by your chosen AI engine. Zero telemetry.</span>
          </div>
          <button
            id="analyze-idea-btn"
            type="button"
            className="btn btn-primary submit-btn"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            <span>🔬</span>
            <span>Analyze My Blueprint</span>
            <span className="btn-arrow">→</span>
          </button>
        </div>
      </div>

      {/* Two-step workflow visual */}
      <div className="how-it-works animate-slide-up delay-3">
        <p className="how-label">How the co-founder loop works:</p>
        <div className="how-steps">
          <div className="how-step">
            <div className="how-step__num">1</div>
            <div>
              <div className="how-step__title">AI Alignment Interview</div>
              <div className="how-step__desc">
                The AI parses your napkin sketch or voice dictation, confirms understanding, and asks 3-4 targeted questions to lock down database, auth, and scaling choices.
              </div>
            </div>
          </div>
          <div className="how-divider">⟶</div>
          <div className="how-step">
            <div className="how-step__num">2</div>
            <div>
              <div className="how-step__title">Master Production Blueprint</div>
              <div className="how-step__desc">
                Receive interactive topology diagrams, hosting cost breakdown, GitHub market intel, and a 1-click downloadable starter repo .zip with real code.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
