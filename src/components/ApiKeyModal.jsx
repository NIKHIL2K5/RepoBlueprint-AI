import { useState } from 'react';
import './ApiKeyModal.css';

export default function ApiKeyModal({ onSave }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    if (key.trim().length < 20) {
      setError('That doesn\'t look like a valid Gemini API key. It should be longer than 20 characters.');
      return;
    }
    onSave(key.trim());
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box animate-slide-up">
        <div className="modal-logo">📐</div>
        <div className="badge badge-cyan" style={{ marginBottom: 16 }}>Welcome to RepoBlueprint AI</div>
        <h2 className="modal-title">Enter Your Gemini API Key</h2>
        <p className="modal-desc">
          RepoBlueprint uses Google's Gemma 4 via the Gemini API for multimodal AI understanding.
          Your key is stored only in your browser's localStorage — never sent to any server except Google's API.
        </p>

        <div className="key-steps">
          <div className="key-step">
            <span className="key-step-num">1</span>
            <span>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">aistudio.google.com/app/apikey</a></span>
          </div>
          <div className="key-step">
            <span className="key-step-num">2</span>
            <span>Click "Create API Key" — it's free with generous quotas</span>
          </div>
          <div className="key-step">
            <span className="key-step-num">3</span>
            <span>Copy and paste the key below</span>
          </div>
        </div>

        <div className="key-input-wrapper">
          <input
            id="api-key-input"
            type="password"
            className="input-field key-input"
            placeholder="AIza..."
            value={key}
            onChange={(e) => { setKey(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
          />
          {error && <div className="key-error">{error}</div>}
        </div>

        <button
          id="save-api-key-btn"
          className="btn btn-primary modal-save-btn"
          onClick={handleSave}
          disabled={!key.trim()}
        >
          🚀 Launch RepoBlueprint
        </button>

        <p className="modal-privacy">
          🔒 Your API key never leaves your browser except in requests directly to the Google Gemini API.
        </p>
      </div>
    </div>
  );
}
