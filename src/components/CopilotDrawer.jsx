import { useState, useEffect, useRef } from 'react';
import './CopilotDrawer.css';
import { sendChatMessage } from '../services/copilot';
import { getUserChat, saveUserChat, addCloudinaryAsset } from '../services/storageService';
import { uploadToCloudinary } from '../services/cloudinary';

import { SUPPORTED_LANGUAGES } from '../data/languages';

const STAGE_QUICK_ACTIONS = {
  setup: [
    { text: '🦙 How does local Ollama work?', query: 'How does local Ollama work and why is it private?' },
    { text: '⚡ Switch to Instant Demo', query: 'Switch to instant demo mode' },
  ],
  input: [
    { text: '✨ Enhance my project idea', query: 'Enhance my project idea with enterprise scalability and modular architecture' },
    { text: '🎙️ Switch to Voice Dictation', query: 'Switch to voice dictation so I can speak my idea' },
    { text: '🎨 Open Whiteboard Canvas', query: 'Open the napkin whiteboard canvas so I can draw' },
    { text: '⚡ Load AI Habit Coach', query: 'Load the AI Habit Coach preset template' },
    { text: '🚀 Proceed to Alignment', query: 'Submit my idea and proceed to technical co-founder alignment' },
  ],
  alignment: [
    { text: '💡 Recommend best database', query: 'Which database do you recommend for my app and why?' },
    { text: '🗄️ Select PostgreSQL', query: 'Select PostgreSQL for database in question 1' },
    { text: '📝 Add Docker & Tailwind constraints', query: 'Add Docker Compose and Tailwind CSS to additional constraints' },
    { text: '🚀 Generate Master Blueprint', query: 'Everything looks good, generate the master architecture blueprint' },
  ],
  dashboard: [
    { text: '📱 Convert to Mobile App', query: 'change the web to mobile app in architecture and tech stack' },
    { text: '🗄️ Switch DB to MongoDB', query: 'change the db to mongodb or oracle' },
    { text: '🎯 Explain my idea & features', query: 'Can you explain what my idea is and what are the key features?' },
    { text: '📦 Download Starter Repo .zip', query: 'Download the starter repository zip bundle now' },
    { text: '⚙️ Explain Tech Stack choices', query: 'Explain the chosen tech stack and trade-offs' },
    { text: '💰 View Cost Calculator', query: 'Switch to the Cost Calculator tab' },
    { text: '📈 Scale Cost to 50k DAU', query: 'Scale cost calculator estimate to 50000 DAU' },
    { text: '🔎 Open GitHub Market Intel', query: 'Open GitHub market intelligence tab to see similar repos' },
  ],
};

export default function CopilotDrawer({
  appContext = {},
  onExecuteAction,
  config,
  currentUser,
  activeProjectId = 'global',
  currentLanguage,
  onLanguageChange,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [selectedLang, setSelectedLang] = useState(currentLanguage || SUPPORTED_LANGUAGES[0]); // default en-US
  const [speakingMsgId, setSpeakingMsgId] = useState(null);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [autoApply, setAutoApply] = useState(true);
  const [ttsEnabled, setTtsEnabled] = useState(true); // default audio ON!
  const [unreadCount, setUnreadCount] = useState(0);

  const [attachedImage, setAttachedImage] = useState(null);

  // Sync selectedLang if parent changes language
  useEffect(() => {
    if (currentLanguage) {
      setSelectedLang(currentLanguage);
    }
  }, [currentLanguage]);

  const [messages, setMessages] = useState(() => {
    if (currentUser?.id) {
      return getUserChat(currentUser.id, activeProjectId);
    }
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content: `👋 **Hello! I'm your AI Technical Co-Founder & Architecture Copilot.**\n\nI can speak and guide you in **multiple languages** (English, हिन्दी, తెలుగు, Español, Français, Deutsch, 日本語, 中文), explain trade-offs, and **take real actions on this page** (editing your ideas, selecting choices, switching tabs, or downloading your starter repo).`,
        action: null,
        actionApplied: false,
      }
    ];
  });

  // Reload chat history whenever user or project changes
  useEffect(() => {
    if (currentUser?.id) {
      const saved = getUserChat(currentUser.id, activeProjectId);
      if (saved && saved.length > 0) {
        setMessages(saved);
      }
    }
  }, [currentUser?.id, activeProjectId]);

  const pushMessage = (newMsg) => {
    setMessages(prev => {
      const updated = [...prev, newMsg];
      if (currentUser?.id) {
        saveUserChat(currentUser.id, activeProjectId, updated);
      }
      return updated;
    });
  };

  const handleAttachImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (re) => {
      setAttachedImage({ file, preview: re.target.result, isUploading: true });
    };
    reader.readAsDataURL(file);

    try {
      const res = await uploadToCloudinary({
        file,
        fileName: file.name,
        folder: 'repo-blueprint/chat-attachments',
        tags: ['chat_attachment'],
        userId: currentUser?.id,
      });

      addCloudinaryAsset(currentUser?.id, {
        ...res,
        title: `Chat Attachment: ${file.name}`,
        type: 'upload',
      });

      setAttachedImage(prev => prev ? { ...prev, cldUrl: res.secure_url, isUploading: false } : null);
    } catch (err) {
      console.warn('Chat upload error:', err);
      setAttachedImage(prev => prev ? { ...prev, isUploading: false } : null);
    }
  };

  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioPlayerRef = useRef(null);

  // Stop any currently playing audio (SpeechSynthesis or HTML5 Audio proxy)
  const stopAudio = () => {
    if (audioPlayerRef.current) {
      try {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
      } catch (e) {}
      audioPlayerRef.current = null;
    }
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    setSpeakingMsgId(null);
  };

  // Load voices for speech synthesis
  useEffect(() => {
    const loadVoices = () => {
      if (window.speechSynthesis) {
        const v = window.speechSynthesis.getVoices();
        setAvailableVoices(v);
      }
    };

    loadVoices();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      stopAudio();
    };
  }, []);

  // Auto-scroll on new message
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  // Voice recognition setup for Chatbot mic
  const toggleVoice = () => {
    if (isListening) {
      try { recognitionRef.current?.stop(); } catch (e) {}
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selectedLang.code;

      let silenceTimeout = null;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; ++i) {
          transcript += event.results[i][0]?.transcript || '';
        }
        if (transcript.trim()) {
          setInputVal(transcript.trim());
        }
        if (silenceTimeout) clearTimeout(silenceTimeout);
        silenceTimeout = setTimeout(() => {
          try { recognition.stop(); } catch (e) {}
          setIsListening(false);
        }, 2200);
      };

      recognition.onerror = (e) => {
        console.warn('Copilot mic error:', e.error);
        if (e.error === 'not-allowed') {
          alert('Microphone permission blocked. Please click 🔒 in your address bar and allow microphone access.');
          setIsListening(false);
        } else if (e.error !== 'no-speech') {
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch (e) {
      console.warn('Failed to start copilot voice:', e);
      setIsListening(false);
    }
  };

  // Helper to determine if a true native OS voice is installed for this language
  const hasNativeVoice = (langCode) => {
    if (!availableVoices || availableVoices.length === 0) return false;
    const prefix = langCode.split('-')[0].toLowerCase();
    // Special case: Windows never has high-quality Telugu TTS installed by default
    if (prefix === 'te') return false;
    return availableVoices.some(v => v.lang.toLowerCase().startsWith(prefix));
  };

  const getBestVoice = (langCode) => {
    if (!availableVoices || availableVoices.length === 0) return null;
    const exact = availableVoices.find(v => v.lang.toLowerCase() === langCode.toLowerCase());
    if (exact) return exact;

    const prefix = langCode.split('-')[0].toLowerCase();
    const prefixMatch = availableVoices.find(v => v.lang.toLowerCase().startsWith(prefix));
    if (prefixMatch) return prefixMatch;

    return null;
  };

  // High-fidelity chunked audio player via Google Translate TTS proxy
  const playAudioViaProxy = (cleanText, langCode, msgId) => {
    stopAudio();

    const langShort = langCode.split('-')[0].toLowerCase();
    // STRICT CHUNKING TO MAX 75 CHARS PER CHUNK: Google Translate TTS returns 400 if chunk > 90 chars
    const words = cleanText.split(/\s+/).filter(Boolean);
    const chunks = [];
    let currentChunk = '';

    for (const word of words) {
      if ((currentChunk + ' ' + word).trim().length > 72) {
        if (currentChunk.trim()) chunks.push(currentChunk.trim());
        currentChunk = word;
      } else {
        currentChunk = currentChunk ? currentChunk + ' ' + word : word;
      }
    }
    if (currentChunk.trim()) chunks.push(currentChunk.trim());
    if (chunks.length === 0 && cleanText.trim()) chunks.push(cleanText.slice(0, 72));

    let currentIndex = 0;
    setSpeakingMsgId(msgId);

    const playNext = () => {
      if (currentIndex >= chunks.length) {
        setSpeakingMsgId(null);
        audioPlayerRef.current = null;
        return;
      }

      const chunk = chunks[currentIndex++];
      const url = `/tts/translate_tts?ie=UTF-8&tl=${encodeURIComponent(langShort)}&client=tw-ob&q=${encodeURIComponent(chunk)}`;
      const audio = new Audio(url);
      audioPlayerRef.current = audio;

      audio.onended = () => {
        playNext();
      };

      audio.onerror = (e) => {
        console.warn('TTS proxy chunk notice, skipping to next:', e);
        playNext();
      };

      audio.play().catch(playErr => {
        console.warn('Audio play autoplay restriction:', playErr);
        setSpeakingMsgId(null);
        audioPlayerRef.current = null;
      });
    };

    playNext();
  };

  // Audio Text-to-Speech Output (Hybrid Native + Proxy Engine)
  const speakText = (text, langCode = selectedLang.code, msgId = null) => {
    if (speakingMsgId === msgId) {
      stopAudio();
      return;
    }

    // Strip markdown formatting, code blocks, action tags, and emojis for clean voice output
    const clean = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`.*?`/g, '')
      .replace(/[*#_~>]/g, '')
      .replace(/<<<[\s\S]*?>>>/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .trim();

    if (!clean) return;

    const prefix = langCode.split('-')[0].toLowerCase();
    // For Telugu (and languages lacking high quality native OS packs), ALWAYS use the reliable proxy engine!
    if (prefix === 'te') {
      playAudioViaProxy(clean, langCode, msgId);
      return;
    }

    const canUseNative = hasNativeVoice(langCode);

    if (!canUseNative) {
      playAudioViaProxy(clean, langCode, msgId);
      return;
    }

    // Use native Web Speech Synthesis if an authentic native voice is present
    try {
      stopAudio();

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = langCode;

      const matchedVoice = getBestVoice(langCode);
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        setSpeakingMsgId(msgId);
      };

      utterance.onend = () => {
        setSpeakingMsgId(null);
      };

      utterance.onerror = () => {
        setSpeakingMsgId(null);
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error, falling back to proxy:', err);
      playAudioViaProxy(clean, langCode, msgId);
    }
  };

  const handleSend = async (customQuery = null) => {
    const textToSend = customQuery || inputVal.trim();
    if (!textToSend || isThinking) return;

    if (!customQuery) setInputVal('');

    const userMsg = {
      id: 'usr-' + Date.now(),
      role: 'user',
      content: textToSend,
      image: attachedImage?.cldUrl || attachedImage?.preview || null,
      timestamp: new Date().toISOString(),
    };

    setAttachedImage(null);
    pushMessage(userMsg);
    setIsThinking(true);

    const safetyTimer = setTimeout(() => {
      setIsThinking(false);
    }, 30000);

    try {
      const res = await sendChatMessage({
        config,
        history: [...messages, userMsg],
        userMessage: textToSend + (userMsg.image ? ` [Attached image hosted on Cloudinary: ${userMsg.image}]` : ''),
        appContext: {
          ...appContext,
          languageCode: selectedLang.code,
          languageName: selectedLang.name,
        },
      });

      let applied = false;
      if (res.action && onExecuteAction && autoApply) {
        try {
          onExecuteAction(res.action);
          applied = true;
        } catch (actErr) {
          console.warn('Auto action error:', actErr);
        }
      }

      const assistantMsg = {
        id: 'ast-' + Date.now(),
        role: 'assistant',
        content: res.text,
        action: res.action,
        actionApplied: applied,
        timestamp: new Date().toISOString(),
      };

      pushMessage(assistantMsg);

      // Automatic Audio Speech Out in chosen language if TTS enabled!
      if (ttsEnabled) {
        speakText(res.text, selectedLang.code, assistantMsg.id);
      }

      if (!isOpen) {
        setUnreadCount(c => c + 1);
      }
    } catch (err) {
      pushMessage({
        id: 'err-' + Date.now(),
        role: 'assistant',
        content: `⚠️ Error communicating with AI: ${err.message || 'Please try again.'}`,
        timestamp: new Date().toISOString(),
      });
    } finally {
      clearTimeout(safetyTimer);
      setIsThinking(false);
    }
  };

  const handleApplyAction = (msgId, action) => {
    if (!action || !onExecuteAction) return;
    try {
      onExecuteAction(action);
      setMessages(prev =>
        prev.map(m => (m.id === msgId ? { ...m, actionApplied: true } : m))
      );
    } catch (e) {
      console.error('Failed to apply action:', e);
    }
  };

  const currentStage = appContext.stage || 'input';
  const quickActions = STAGE_QUICK_ACTIONS[currentStage] || STAGE_QUICK_ACTIONS.input;

  return (
    <aside className="copilot-widget" aria-label="AI Technical Co-Founder Copilot">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          type="button"
          id="copilot-floating-trigger"
          className="copilot-floating-btn animate-float"
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
            setUnreadCount(0);
          }}
          title="Open AI Technical Co-Founder Copilot"
        >
          <span className="copilot-btn-icon">🤖</span>
          <span className="copilot-btn-text">Co-Founder Copilot</span>
          <span className="copilot-lang-pill">{selectedLang.flag}</span>
          <span className="copilot-pulse-dot" />
          {unreadCount > 0 && <span className="copilot-badge">{unreadCount}</span>}
        </button>
      )}

      {/* Main Drawer Window */}
      {isOpen && (
        <div className={`copilot-panel card ${isMinimized ? 'copilot-panel--minimized' : ''} animate-slide-up`}>
          {/* Enhanced 2-Row Header */}
          <div className="copilot-header">
            {/* Top Bar: Title & Window Controls */}
            <div className="copilot-header-top">
              <div className="copilot-brand-wrap">
                <span className="copilot-avatar">🤖</span>
                <div className="copilot-title-box">
                  <div className="copilot-title">
                    Architect Co-Founder
                    <span className="live-status-dot" title="Active & Ready" />
                  </div>
                  <span className="copilot-role-label">AI Principal Architect</span>
                </div>
              </div>

              <div className="copilot-header-ctrls">
                {/* Voice Audio Toggle */}
                <button
                  type="button"
                  className={`ctrl-btn ${ttsEnabled ? 'active' : ''}`}
                  onClick={() => {
                    const nextState = !ttsEnabled;
                    setTtsEnabled(nextState);
                    if (!nextState) stopAudio();
                  }}
                  title={ttsEnabled ? `Voice Output: ON (${selectedLang.native})` : 'Voice Output: OFF (Muted)'}
                >
                  <span className="ctrl-btn-icon">{ttsEnabled ? '🔊' : '🔇'}</span>
                  <span className="ctrl-btn-text">{ttsEnabled ? 'Voice' : 'Mute'}</span>
                </button>

                {/* Auto Action Toggle */}
                <button
                  type="button"
                  className={`ctrl-btn ${autoApply ? 'active' : ''}`}
                  onClick={() => setAutoApply(!autoApply)}
                  title={autoApply ? 'Auto-Execute Actions: ON' : 'Auto-Execute Actions: OFF'}
                >
                  <span className="ctrl-btn-icon">⚡</span>
                  <span className="ctrl-btn-text">Auto</span>
                </button>

                {/* Minimize Drawer */}
                <button
                  type="button"
                  className="ctrl-icon-btn"
                  onClick={() => setIsMinimized(!isMinimized)}
                  title={isMinimized ? 'Expand Drawer' : 'Minimize Drawer'}
                >
                  {isMinimized ? '▲' : '▼'}
                </button>

                {/* Close Drawer */}
                <button
                  type="button"
                  className="ctrl-icon-btn ctrl-close-btn"
                  onClick={() => {
                    stopAudio();
                    setIsOpen(false);
                  }}
                  title="Close Copilot"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Sub Bar: Stage pill, Engine pill, and Full Language Picker */}
            <div className="copilot-header-sub">
              <div className="copilot-meta-pills">
                <span className="copilot-stage-tag">📍 {getStageLabel(currentStage)}</span>
                <span className="copilot-engine-tag">
                  {config?.provider === 'ollama' ? `🦙 ${config?.ollamaModel || 'Ollama'}` : config?.provider === 'gemini' ? '✨ Gemini' : '⚡ Sandbox'}
                </span>
              </div>

              <div className="copilot-lang-picker" title="Choose language for conversation and voice speech">
                <span className="lang-globe-icon">🌐</span>
                <select
                  className="copilot-lang-select"
                  value={selectedLang.code}
                  onChange={(e) => {
                    const found = SUPPORTED_LANGUAGES.find(l => l.code === e.target.value);
                    if (found) {
                      setSelectedLang(found);
                      if (onLanguageChange) onLanguageChange(found);
                    }
                  }}
                  aria-label="Choose Language"
                >
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.native} ({lang.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Dynamic Quick Prompt Chips */}
              <div className="copilot-quick-actions">
                <div className="quick-actions-scroll">
                  {quickActions.map((qa, i) => (
                    <button
                      key={i}
                      type="button"
                      className="quick-chip"
                      onClick={() => handleSend(qa.query)}
                      disabled={isThinking}
                    >
                      {qa.text}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Messages Body */}
              <div className="copilot-messages-container">
                {messages.map(msg => (
                  <div key={msg.id} className={`copilot-bubble copilot-bubble--${msg.role}`}>
                    <div className="bubble-content">
                      {msg.image && (
                        <div className="bubble-img-wrap" style={{ marginBottom: 8 }}>
                          <a href={msg.image} target="_blank" rel="noreferrer">
                            <img
                              src={msg.image}
                              alt="Attachment"
                              style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 8, display: 'block', border: '1px solid var(--border)' }}
                            />
                          </a>
                          <span style={{ fontSize: '0.72rem', color: 'var(--accent)', marginTop: 4, display: 'inline-block' }}>
                            ☁️ Cloudinary CDN Hosted
                          </span>
                        </div>
                      )}
                      {formatMessage(msg.content)}
                    </div>

                    {/* Audio Speech Out Button on Assistant Messages */}
                    {msg.role === 'assistant' && (
                      <div className="bubble-speech-bar">
                        <button
                          type="button"
                          className={`bubble-audio-btn ${speakingMsgId === msg.id ? 'is-speaking' : ''}`}
                          onClick={() => speakText(msg.content, selectedLang.code, msg.id)}
                          title={speakingMsgId === msg.id ? 'Stop Audio' : `Listen Audio in ${selectedLang.native}`}
                        >
                          {speakingMsgId === msg.id ? (
                            <>
                              <span className="mini-sound-wave">
                                <span className="mini-wave" />
                                <span className="mini-wave" />
                                <span className="mini-wave" />
                              </span>
                              <span>⏹️ Stop Audio</span>
                            </>
                          ) : (
                            <>
                              <span>🔊 Listen ({selectedLang.flag} {selectedLang.native})</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Interactive Action Card */}
                    {msg.action && (
                      <div className={`action-card ${msg.actionApplied ? 'action-card--applied' : ''}`}>
                        <div className="action-card-header">
                          <span className="action-card-icon">⚡</span>
                          <span className="action-card-title">Recommended Page Action</span>
                          {msg.actionApplied && <span className="action-status-badge">✓ Executed</span>}
                        </div>
                        <div className="action-card-desc">
                          {getActionDescription(msg.action)}
                        </div>
                        <button
                          type="button"
                          className={`btn action-exec-btn ${msg.actionApplied ? 'btn-ghost' : 'btn-primary'}`}
                          onClick={() => handleApplyAction(msg.id, msg.action)}
                          disabled={msg.actionApplied}
                        >
                          {msg.actionApplied ? '✓ Action Applied to Screen' : `👉 ${msg.action.label || 'Apply Action to Page'}`}
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {isThinking && (
                  <div className="copilot-bubble copilot-bubble--assistant thinking-bubble">
                    <span className="thinking-dot" />
                    <span className="thinking-dot" />
                    <span className="thinking-dot" />
                    <span className="thinking-label">
                      Co-Founder responding in {selectedLang.native}...
                    </span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Footer */}
              <div className="copilot-input-area">
                {attachedImage && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, padding: '4px 8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: '0.78rem' }}>
                    <img src={attachedImage.preview} alt="Attached" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover' }} />
                    <span style={{ flex: 1, color: 'var(--accent)' }}>
                      {attachedImage.isUploading ? '☁️ Uploading to Cloudinary...' : '☁️ Cloudinary CDN attached'}
                    </span>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                      onClick={() => setAttachedImage(null)}
                    >
                      ✕
                    </button>
                  </div>
                )}
                {isListening && (
                  <div className="copilot-listening-banner" style={{ fontSize: '0.8rem', color: '#ea580c', padding: '4px 10px', background: 'rgba(234, 88, 12, 0.12)', border: '1px solid rgba(234, 88, 12, 0.25)', borderRadius: '6px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block', boxShadow: '0 0 8px #ef4444' }} />
                    <span>Listening in <strong>{selectedLang.flag} {selectedLang.native}</strong>... speak your command</span>
                  </div>
                )}
                <div className="copilot-input-wrapper">
                  <label className="copilot-mic-btn" style={{ cursor: 'pointer' }} title="Attach image / sketch via Cloudinary">
                    📎
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleAttachImage}
                    />
                  </label>
                  <input
                    type="text"
                    className="copilot-input"
                    placeholder={`Ask in ${selectedLang.native} (${selectedLang.name}) or enter command...`}
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSend();
                    }}
                    disabled={isThinking}
                  />

                  {/* Built-in Voice Dictation Button (Configured to selected language) */}
                  <button
                    type="button"
                    className={`copilot-mic-btn ${isListening ? 'listening' : ''}`}
                    onClick={toggleVoice}
                    title={isListening ? 'Stop Listening' : `Speak in ${selectedLang.native} (${selectedLang.code})`}
                  >
                    {isListening ? '⏹️' : '🎙️'}
                  </button>

                  <button
                    type="button"
                    className="copilot-send-btn"
                    onClick={() => handleSend()}
                    disabled={isThinking || (!inputVal.trim() && !attachedImage)}
                    title="Send message"
                  >
                    ➤
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </aside>
  );
}

function getStageLabel(stage) {
  const labels = {
    setup: 'Engine Setup',
    input: 'Napkin / Voice Input',
    loading_phase1: 'Analyzing Idea...',
    alignment: 'Technical Alignment',
    loading_phase2: 'Synthesizing Blueprint...',
    dashboard: 'Master Blueprint',
    error: 'Troubleshooting',
  };
  return labels[stage] || 'Active';
}

function getActionDescription(action) {
  if (!action) return '';
  switch (action.type) {
    case 'FILL_IDEA':
      return 'Fills your project idea text with enhanced architecture details.';
    case 'SWITCH_INPUT_TAB':
      return `Switches the input screen to the "${action.params?.tab}" tab.`;
    case 'LOAD_SAMPLE':
      return 'Loads an instant pre-engineered hackathon sample project.';
    case 'SUBMIT_IDEA':
      return 'Submits the project idea to begin the Technical Co-Founder Alignment interview.';
    case 'SELECT_ALIGNMENT_ANSWER':
      return `Selects "${action.params?.option}" for clarifying question #${(action.params?.questionIndex ?? 0) + 1}.`;
    case 'SET_ALIGNMENT_NOTES':
      return 'Adds custom technical constraints to the blueprint generation parameters.';
    case 'CONFIRM_ALIGNMENT':
      return 'Generates the comprehensive Master Architecture Blueprint.';
    case 'SWITCH_DASHBOARD_TAB':
      return `Switches dashboard tab to "${action.params?.tab}".`;
    case 'SET_DAU':
      return `Sets cost calculator scale to ${(action.params?.dau || 0).toLocaleString()} Daily Active Users.`;
    case 'DOWNLOAD_REPO':
      return 'Packages and downloads the starter boilerplate repository as a .zip file.';
    case 'SWITCH_TO_DEMO':
      return 'Switches immediately to the Instant Sandbox Demo mode.';
    default:
      return 'Executes an automated architectural enhancement on this screen.';
  }
}

function formatMessage(content) {
  if (!content) return null;
  const paragraphs = content.split('\n\n');
  return paragraphs.map((p, idx) => {
    const lines = p.split('\n');
    return (
      <p key={idx} className="bubble-paragraph">
        {lines.map((line, lIdx) => {
          const parts = line.split(/(\*\*.*?\*\*)/g);
          return (
            <span key={lIdx}>
              {parts.map((part, pIdx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
                }
                return part;
              })}
              {lIdx < lines.length - 1 && <br />}
            </span>
          );
        })}
      </p>
    );
  });
}
