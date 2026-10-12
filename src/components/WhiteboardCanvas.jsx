import { useRef, useState, useEffect } from 'react';
import './WhiteboardCanvas.css';

const PALETTE = [
  { color: '#00c8ff', label: 'Cyan' },
  { color: '#8b5cf6', label: 'Violet' },
  { color: '#10b981', label: 'Green' },
  { color: '#f59e0b', label: 'Orange' },
  { color: '#ffffff', label: 'White' },
];

export default function WhiteboardCanvas({ onExportImage }) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState('pen'); // 'pen' | 'box' | 'arrow' | 'eraser'
  const [color, setColor] = useState('#00c8ff');
  const [lineWidth, setLineWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState([]);
  const startPos = useRef({ x: 0, y: 0 });
  const snapshotRef = useRef(null);

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
    setHistory(prev => [...prev.slice(-10), dataUrl]);
    // Notify parent
    const base64 = dataUrl.split(',')[1];
    onExportImage(base64);
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
    const coords = getCanvasCoords(e);
    startPos.current = coords;
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

        ctx.fillStyle = 'rgba(0, 200, 255, 0.05)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
      } else if (tool === 'arrow') {
        drawArrow(ctx, startPos.current.x, startPos.current.y, coords.x, coords.y);
      }
    }
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
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
      onExportImage(base64);
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
    ctx.font = 'bold 15px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 1. Client box
    ctx.strokeStyle = '#00c8ff';
    ctx.fillStyle = 'rgba(0, 200, 255, 0.08)';
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 140, 150, 80);
    ctx.fillRect(60, 140, 150, 80);
    ctx.fillStyle = '#f0f8ff';
    ctx.fillText('Web / Mobile UI', 135, 170);
    ctx.font = '12px Outfit, sans-serif';
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
    ctx.font = 'bold 15px Outfit, sans-serif';
    ctx.fillStyle = '#f0f8ff';
    ctx.fillText('FastAPI Gateway', 390, 170);
    ctx.font = '12px Outfit, sans-serif';
    ctx.fillStyle = '#a78bfa';
    ctx.fillText('(Python Async)', 390, 192);

    // Arrow to AI
    drawArrow(ctx, 470, 160, 570, 100);

    // 3. AI box
    ctx.strokeStyle = '#10b981';
    ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
    ctx.strokeRect(570, 60, 160, 80);
    ctx.fillRect(570, 60, 160, 80);
    ctx.font = 'bold 15px Outfit, sans-serif';
    ctx.fillStyle = '#f0f8ff';
    ctx.fillText('Gemma 3 / Gemini', 650, 90);
    ctx.font = '12px Outfit, sans-serif';
    ctx.fillStyle = '#10b981';
    ctx.fillText('(Reasoning Engine)', 650, 112);

    // Arrow to DB
    drawArrow(ctx, 470, 200, 570, 260);

    // 4. DB box
    ctx.strokeStyle = '#f59e0b';
    ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
    ctx.strokeRect(570, 220, 160, 80);
    ctx.fillRect(570, 220, 160, 80);
    ctx.font = 'bold 15px Outfit, sans-serif';
    ctx.fillStyle = '#f0f8ff';
    ctx.fillText('PostgreSQL + Redis', 650, 250);
    ctx.font = '12px Outfit, sans-serif';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('(ACID + Cache)', 650, 272);

    saveSnapshot();
  };

  return (
    <div className="whiteboard-canvas-wrapper">
      {/* Canvas Toolbar */}
      <div className="whiteboard-toolbar">
        {/* Tools */}
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
            title="Component Box"
          >
            ◻️ Component Box
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

        {/* Colors */}
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

        {/* Action Buttons */}
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

      {/* Main Canvas Area */}
      <div className="canvas-frame">
        <canvas
          ref={canvasRef}
          width={800}
          height={380}
          className="whiteboard-canvas"
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />
        <div className="canvas-watermark">📐 Whiteboard Architecture Canvas · Multimodal Vision Ready</div>
      </div>
    </div>
  );
}
