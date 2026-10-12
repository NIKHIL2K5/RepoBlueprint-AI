import { useRef, useState, useEffect } from 'react';
import './WhiteboardCanvas.css';

const PALETTE = [
  { color: '#00c8ff', label: 'Cyan' },
  { color: '#8b5cf6', label: 'Violet' },
  { color: '#10b981', label: 'Green' },
  { color: '#f59e0b', label: 'Orange' },
  { color: '#ffffff', label: 'White' },
];

const QUICK_BOX_PRESETS = [
  { title: 'Web / Mobile UI', sub: '(React + Vite)', color: '#00c8ff' },
  { title: 'API Gateway', sub: '(FastAPI / Python)', color: '#8b5cf6' },
  { title: 'PostgreSQL DB', sub: '(Primary + ACID)', color: '#f59e0b' },
  { title: 'Redis Cache', sub: '(In-Memory / Queue)', color: '#f59e0b' },
  { title: 'AI / LLM Service', sub: '(Gemini / Ollama)', color: '#10b981' },
  { title: 'Auth / Security', sub: '(OAuth2 + JWT)', color: '#8b5cf6' },
];

export default function WhiteboardCanvas({ onExportImage }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [tool, setTool] = useState('pen'); // 'pen' | 'box' | 'text' | 'arrow' | 'eraser'
  const [color, setColor] = useState('#00c8ff');
  const [lineWidth, setLineWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState([]);

  // Text Prompt Modal State (for box labeling or freeform text)
  const [textModal, setTextModal] = useState({
    isOpen: false,
    mode: 'box', // 'box' | 'freeform'
    coords: { x: 0, y: 0, w: 0, h: 0 },
    title: '',
    subtitle: '',
  });

  const startPos = useRef({ x: 0, y: 0 });
  const snapshotRef = useRef(null);
  const textInputRef = useRef(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Fill background with blueprint dark blue
    ctx.fillStyle = '#060d1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, canvas.width, canvas.height);

    saveSnapshot();
  }, []);

  useEffect(() => {
    if (textModal.isOpen && textInputRef.current) {
      setTimeout(() => textInputRef.current?.focus(), 50);
    }
  }, [textModal.isOpen]);

  const drawGrid = (ctx, w, h) => {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 200, 255, 0.07)';
    ctx.lineWidth = 1;
    const step = 28;
    for (let x = 0; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();
  };

  const saveSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setHistory(prev => [...prev.slice(-12), dataUrl]);
    // Notify parent
    const base64 = dataUrl.split(',')[1];
    if (onExportImage) onExportImage(base64);
  };

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e) => {
    if (textModal.isOpen) return;
    const coords = getCanvasCoords(e);
    startPos.current = coords;

    if (tool === 'text') {
      // Open freeform text prompt at click coordinates
      setTextModal({
        isOpen: true,
        mode: 'freeform',
        coords: { x: coords.x, y: coords.y, w: 0, h: 0 },
        title: '',
        subtitle: '',
      });
      return;
    }

    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (tool === 'pen' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.strokeStyle = tool === 'eraser' ? '#060d1a' : color;
      ctx.lineWidth = tool === 'eraser' ? 24 : lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  };

  const handlePointerMove = (e) => {
    if (!isDrawing) return;
    const coords = getCanvasCoords(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (tool === 'pen' || tool === 'eraser') {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else if (snapshotRef.current) {
      // Restore previous state for shape preview
      ctx.putImageData(snapshotRef.current, 0, 0);

      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';

      if (tool === 'box') {
        const x = Math.min(startPos.current.x, coords.x);
        const y = Math.min(startPos.current.y, coords.y);
        const w = Math.abs(coords.x - startPos.current.x);
        const h = Math.abs(coords.y - startPos.current.y);

        ctx.fillStyle = hexToRgba(color, 0.08);
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
      } else if (tool === 'arrow') {
        drawArrow(ctx, startPos.current.x, startPos.current.y, coords.x, coords.y);
      }
    }
  };

  const handlePointerUp = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (tool === 'box') {
      const coords = getCanvasCoords(e);
      const x = Math.min(startPos.current.x, coords.x);
      const y = Math.min(startPos.current.y, coords.y);
      const w = Math.abs(coords.x - startPos.current.x);
      const h = Math.abs(coords.y - startPos.current.y);

      // If drawn box is big enough, trigger the label popup
      if (w >= 45 && h >= 30) {
        setTextModal({
          isOpen: true,
          mode: 'box',
          coords: { x, y, w, h },
          title: '',
          subtitle: '',
        });
      }
    }

    saveSnapshot();
  };

  const drawArrow = (ctx, fromX, fromY, toX, toY) => {
    const headLen = 14;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };

  const hexToRgba = (hex, alpha) => {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
    const g = parseInt(cleanHex.substring(2, 4), 16) || 200;
    const b = parseInt(cleanHex.substring(4, 6), 16) || 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Render text inside box or at freeform location
  const handleApplyText = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { mode, coords, title, subtitle } = textModal;

    if (!title.trim() && !subtitle.trim()) {
      setTextModal({ isOpen: false, mode: 'box', coords: { x: 0, y: 0, w: 0, h: 0 }, title: '', subtitle: '' });
      return;
    }

    ctx.save();
    if (mode === 'box') {
      const centerX = coords.x + coords.w / 2;
      const centerY = coords.y + coords.h / 2;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (subtitle.trim()) {
        // Two lines
        ctx.font = 'bold 14px Outfit, Inter, sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(title.trim(), centerX, centerY - 9);

        ctx.font = '11.5px JetBrains Mono, monospace';
        ctx.fillStyle = color || '#00c8ff';
        ctx.fillText(subtitle.trim(), centerX, centerY + 11);
      } else {
        // Single line
        ctx.font = 'bold 15px Outfit, Inter, sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(title.trim(), centerX, centerY);
      }
    } else {
      // Freeform text
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.font = 'bold 14px Outfit, Inter, sans-serif';
      ctx.fillStyle = color || '#00c8ff';
      ctx.fillText(title.trim(), coords.x, coords.y);

      if (subtitle.trim()) {
        ctx.font = '11.5px JetBrains Mono, monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(subtitle.trim(), coords.x, coords.y + 18);
      }
    }
    ctx.restore();

    setTextModal({ isOpen: false, mode: 'box', coords: { x: 0, y: 0, w: 0, h: 0 }, title: '', subtitle: '' });
    saveSnapshot();
  };

  // Stamp a pre-engineered component block onto the canvas
  const handleStampPreset = (preset) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Find safe random/staggered position
    const boxW = 160;
    const boxH = 75;
    const stampCount = history.length;
    const x = 60 + ((stampCount * 70) % (canvas.width - boxW - 100));
    const y = 80 + ((stampCount * 50) % (canvas.height - boxH - 120));

    ctx.save();
    // Box
    ctx.strokeStyle = preset.color;
    ctx.fillStyle = hexToRgba(preset.color, 0.08);
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, boxW, boxH);
    ctx.fillRect(x, y, boxW, boxH);

    // Text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 14px Outfit, Inter, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(preset.title, x + boxW / 2, y + boxH / 2 - 9);

    ctx.font = '11.5px JetBrains Mono, monospace';
    ctx.fillStyle = preset.color;
    ctx.fillText(preset.sub, x + boxW / 2, y + boxH / 2 + 11);
    ctx.restore();

    saveSnapshot();
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#060d1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, canvas.width, canvas.height);
    saveSnapshot();
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const newHistory = history.slice(0, -1);
    const prevImage = newHistory[newHistory.length - 1];
    setHistory(newHistory);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = prevImage;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const base64 = prevImage.split(',')[1];
      if (onExportImage) onExportImage(base64);
    };
  };

  const handleLoadSampleSketch = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Clear
    ctx.fillStyle = '#060d1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, canvas.width, canvas.height);

    // Draw stylized napkin blueprint
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 1. Client box
    ctx.strokeStyle = '#00c8ff';
    ctx.fillStyle = 'rgba(0, 200, 255, 0.08)';
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 140, 150, 80);
    ctx.fillRect(60, 140, 150, 80);
    ctx.font = 'bold 14.5px Outfit, Inter, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Web / Mobile UI', 135, 170);
    ctx.font = '11.5px JetBrains Mono, monospace';
    ctx.fillStyle = '#00c8ff';
    ctx.fillText('(React + PWA)', 135, 192);

    // Arrow to API
    drawArrow(ctx, 210, 180, 310, 180);
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('REST / WS', 260, 168);

    // 2. Backend box
    ctx.strokeStyle = '#8b5cf6';
    ctx.fillStyle = 'rgba(139, 92, 246, 0.08)';
    ctx.lineWidth = 2;
    ctx.strokeRect(310, 140, 160, 80);
    ctx.fillRect(310, 140, 160, 80);
    ctx.font = 'bold 14.5px Outfit, Inter, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('FastAPI Gateway', 390, 170);
    ctx.font = '11.5px JetBrains Mono, monospace';
    ctx.fillStyle = '#a78bfa';
    ctx.fillText('(Python Async)', 390, 192);

    // Arrow to AI
    drawArrow(ctx, 470, 160, 570, 100);

    // 3. AI box
    ctx.strokeStyle = '#10b981';
    ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
    ctx.strokeRect(570, 60, 160, 80);
    ctx.fillRect(570, 60, 160, 80);
    ctx.font = 'bold 14.5px Outfit, Inter, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Gemma 3 / Gemini', 650, 90);
    ctx.font = '11.5px JetBrains Mono, monospace';
    ctx.fillStyle = '#10b981';
    ctx.fillText('(Reasoning Engine)', 650, 112);

    // Arrow to DB
    drawArrow(ctx, 470, 200, 570, 260);

    // 4. DB box
    ctx.strokeStyle = '#f59e0b';
    ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
    ctx.strokeRect(570, 220, 160, 80);
    ctx.fillRect(570, 220, 160, 80);
    ctx.font = 'bold 14.5px Outfit, Inter, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('PostgreSQL + Redis', 650, 250);
    ctx.font = '11.5px JetBrains Mono, monospace';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('(ACID + Cache)', 650, 272);

    saveSnapshot();
  };

  return (
    <div className="whiteboard-canvas-wrapper" ref={containerRef}>
      {/* 1. Main Toolbar */}
      <div className="whiteboard-toolbar">
        {/* Drawing Tools */}
        <div className="tool-group">
          <button
            type="button"
            className={`wb-btn ${tool === 'pen' ? 'active' : ''}`}
            onClick={() => setTool('pen')}
            title="Freehand Sketch Pen"
          >
            ✏️ Pen
          </button>
          <button
            type="button"
            className={`wb-btn ${tool === 'box' ? 'active' : ''}`}
            onClick={() => setTool('box')}
            title="Drag to Draw a Component Box"
          >
            ◻️ Component Box
          </button>
          <button
            type="button"
            className={`wb-btn ${tool === 'text' ? 'active' : ''}`}
            onClick={() => setTool('text')}
            title="Click Anywhere to Type Text / Label"
          >
            🔤 Text / Label
          </button>
          <button
            type="button"
            className={`wb-btn ${tool === 'arrow' ? 'active' : ''}`}
            onClick={() => setTool('arrow')}
            title="Connection Arrow"
          >
            ➡️ Arrow
          </button>
          <button
            type="button"
            className={`wb-btn ${tool === 'eraser' ? 'active' : ''}`}
            onClick={() => setTool('eraser')}
            title="Eraser"
          >
            🧹 Eraser
          </button>
        </div>

        {/* Color Palette */}
        <div className="palette-group">
          {PALETTE.map(p => (
            <button
              key={p.color}
              type="button"
              className={`color-dot ${color === p.color ? 'selected' : ''}`}
              style={{ backgroundColor: p.color }}
              onClick={() => { setColor(p.color); if (tool === 'eraser') setTool('pen'); }}
              title={p.label}
            />
          ))}
        </div>

        {/* Action Controls */}
        <div className="wb-action-group">
          <button
            type="button"
            className="wb-btn-ghost"
            onClick={handleLoadSampleSketch}
            title="Load an example architecture napkin diagram"
          >
            ✨ Example Napkin
          </button>
          <button
            type="button"
            className="wb-btn-ghost"
            onClick={handleUndo}
            disabled={history.length <= 1}
            title="Undo"
          >
            ↺ Undo
          </button>
          <button
            type="button"
            className="wb-btn-ghost"
            onClick={handleClear}
            title="Clear all"
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      {/* 2. Quick Component Stencils (1-Click Stamped Architecture Blocks) */}
      <div className="whiteboard-stencils-row">
        <span className="stencils-label">⚡ 1-Click Component Stamps:</span>
        <div className="stencils-list">
          {QUICK_BOX_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              className="stencil-chip"
              onClick={() => handleStampPreset(preset)}
              title={`Stamp ${preset.title} onto whiteboard`}
            >
              <span className="stencil-chip-dot" style={{ background: preset.color }} />
              <span>+ {preset.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Main Canvas Area */}
      <div className="canvas-frame">
        <canvas
          ref={canvasRef}
          width={800}
          height={380}
          className={`whiteboard-canvas cursor-${tool}`}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />
        <div className="canvas-watermark">📐 Whiteboard Architecture Canvas · Multimodal Vision Ready</div>

        {/* 4. Text Label Entry Popup directly over Box / Canvas */}
        {textModal.isOpen && (
          <div className="canvas-text-overlay" onClick={(e) => { if (e.target === e.currentTarget) setTextModal(prev => ({ ...prev, isOpen: false })); }}>
            <div className="canvas-text-dialog card animate-slide-up">
              <div className="text-dialog-header">
                <span className="text-dialog-icon">🏷️</span>
                <span className="text-dialog-title">
                  {textModal.mode === 'box' ? 'Add Label to Component Box' : 'Add Text on Canvas'}
                </span>
                <button
                  type="button"
                  className="dialog-close-btn"
                  onClick={() => setTextModal(prev => ({ ...prev, isOpen: false }))}
                >
                  ✕
                </button>
              </div>

              <div className="text-dialog-body">
                <div className="dialog-field">
                  <label>Title / Component Name:</label>
                  <input
                    ref={textInputRef}
                    type="text"
                    className="input-field"
                    placeholder="e.g. FastAPI Gateway, React UI, PostgreSQL..."
                    value={textModal.title}
                    onChange={(e) => setTextModal(prev => ({ ...prev, title: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleApplyText(); if (e.key === 'Escape') setTextModal(prev => ({ ...prev, isOpen: false })); }}
                  />
                </div>

                <div className="dialog-field">
                  <label>Subtitle / Tech Info (optional):</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. (Python Async), (ACID DB), (REST / WS)..."
                    value={textModal.subtitle}
                    onChange={(e) => setTextModal(prev => ({ ...prev, subtitle: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleApplyText(); }}
                  />
                </div>

                {/* Instant Quick Suggestions */}
                <div className="dialog-suggestions">
                  <span className="sugg-label">Quick Suggestions:</span>
                  <div className="sugg-chips">
                    {[
                      { t: 'Web UI', s: '(React + Vite)' },
                      { t: 'API Gateway', s: '(FastAPI)' },
                      { t: 'PostgreSQL', s: '(Primary DB)' },
                      { t: 'Redis Cache', s: '(In-Memory)' },
                      { t: 'AI Worker', s: '(Gemma / LLM)' },
                      { t: 'Auth Service', s: '(JWT / OAuth)' },
                    ].map((item, i) => (
                      <button
                        key={i}
                        type="button"
                        className="sugg-chip"
                        onClick={() => {
                          setTextModal(prev => ({ ...prev, title: item.t, subtitle: item.s }));
                        }}
                      >
                        {item.t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="dialog-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setTextModal(prev => ({ ...prev, isOpen: false }))}
                  >
                    Skip
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleApplyText}
                  >
                    ✓ Apply Label
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
