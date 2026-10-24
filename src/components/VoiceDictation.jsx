import { useState, useEffect, useRef, useCallback } from 'react';
import './VoiceDictation.css';

import { DICTATION_LANGUAGES, SAMPLE_SPOKEN_IDEAS } from '../data/languages';

export default function VoiceDictation({
  value = '',
  onChange,
  onAppend,
  onSubmit,
  currentLanguage,
  onLanguageChange,
}) {
  const [selectedLang, setSelectedLang] = useState(() => {
    if (currentLanguage) {
      const match = DICTATION_LANGUAGES.find(
        l => l.code === currentLanguage.code || l.code.startsWith(currentLanguage.code.split('-')[0])
      );
      if (match) return match;
    }
    return DICTATION_LANGUAGES[0];
  });
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [audioLevel, setAudioLevel] = useState(0); // 0 to 100
  const [voiceDetected, setVoiceDetected] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef(null);
  const shouldKeepListeningRef = useRef(false);
  const activeLangCodeRef = useRef(DICTATION_LANGUAGES[0].code);
  const initialTextRef = useRef('');
  const finalTranscriptRef = useRef('');
  const interimTranscriptRef = useRef('');
  const mediaStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const animFrameRef = useRef(null);

  // Sync with global language change
  useEffect(() => {
    if (currentLanguage) {
      const match = DICTATION_LANGUAGES.find(
        l => l.code === currentLanguage.code || l.code.startsWith(currentLanguage.code.split('-')[0])
      );
      if (match && match.code !== selectedLang.code) {
        setSelectedLang(match);
        activeLangCodeRef.current = match.code;
      }
    }
  }, [currentLanguage]);

  const SpeechRecognitionAPI = typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;

  useEffect(() => {
    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
    }
    return () => {
      stopListening();
    };
  }, []);

  // Voice Activity Watchdog: If user is actively speaking into mic but regional model produces no results for 3.5s,
  // seamlessly switch to universal en-US recognizer so speech is never dropped!
  useEffect(() => {
    if (!isListening || activeLangCodeRef.current === 'en-US') return;

    let timeoutId = null;
    if (voiceDetected && !finalTranscriptRef.current && !interimTranscriptRef.current) {
      timeoutId = setTimeout(() => {
        if (shouldKeepListeningRef.current && !finalTranscriptRef.current && !interimTranscriptRef.current && activeLangCodeRef.current !== 'en-US') {
          console.log('[VoiceDictation Watchdog] Sound detected but no transcript from regional model. Auto-switching to universal en-US recognizer...');
          activeLangCodeRef.current = 'en-US';
          setStatusMsg('🟢 Universal English speech engine active (auto-tuned for Indian English accents). Speak naturally!');
          if (recognitionRef.current) {
            try {
              recognitionRef.current.abort();
            } catch (e) {}
          }
        }
      }, 3500);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isListening, voiceDetected]);

  const stopHardwareAudio = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      } catch (e) {}
      mediaStreamRef.current = null;
    }
    setAudioLevel(0);
    setVoiceDetected(false);
  };

  const checkMicrophonePermission = async () => {
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const status = await navigator.permissions.query({ name: 'microphone' });
        if (status.state === 'denied') {
          setErrorMsg('Microphone blocked. Click 🔒 in your address bar → Allow microphone, then try again.');
          return false;
        }
      } catch (e) {}
    }
    return true;
  };

  const commitFinalText = useCallback(() => {
    const spoken = (finalTranscriptRef.current + ' ' + interimTranscriptRef.current).trim();
    if (!spoken) return;
    const base = initialTextRef.current.trim();
    const result = base ? `${base} ${spoken}` : spoken;
    if (onChange) onChange(result);
    else if (onAppend) onAppend(spoken);
  }, [onChange, onAppend]);

  const initRecognition = () => {
    if (!SpeechRecognitionAPI) return null;

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      const activeCode = activeLangCodeRef.current || selectedLang.code;
      recognition.lang = activeCode;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setStatusMsg(activeCode === 'en-US' && selectedLang.code === 'en-IN'
          ? '🟢 Universal English recognizer active (tuned for Indian English accents). Speak naturally!'
          : `Listening in ${selectedLang.flag} ${selectedLang.native}… speak naturally`);
        setErrorMsg('');
        setVoiceDetected(true);
      };

      recognition.onaudiostart = () => {
        setIsListening(true);
        setVoiceDetected(true);
      };

      recognition.onsoundstart = () => {
        setVoiceDetected(true);
      };

      recognition.onspeechstart = () => {
        setVoiceDetected(true);
      };

      recognition.onspeechend = () => {
        // Natural speech pause
      };

      recognition.onaudioend = () => {
        setVoiceDetected(false);
      };

      recognition.onresult = (event) => {
        setVoiceDetected(true);
        let currentFinal = '';
        let currentInterim = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          const transcript = item[0]?.transcript || '';
          if (item.isFinal) {
            currentFinal += transcript + ' ';
          } else {
            currentInterim += transcript;
          }
        }

        if (currentFinal) {
          finalTranscriptRef.current += currentFinal;
        }
        interimTranscriptRef.current = currentInterim;
        setInterimText(currentInterim);

        // Live stream text directly into draft
        const allSpoken = (finalTranscriptRef.current + (currentInterim ? ' ' + currentInterim : '')).trim();
        if (allSpoken) {
          const base = initialTextRef.current.trim();
          const fullDraft = base ? `${base} ${allSpoken}` : allSpoken;
          if (onChange) onChange(fullDraft);
        }
      };

      recognition.onerror = (event) => {
        console.warn('[VoiceDictation] error event:', event.error, 'active code:', activeCode);
        if (event.error === 'aborted') {
          return;
        }

        if (event.error === 'no-speech') {
          // Normal pause in speech, keep listening!
          return;
        }

        if (event.error === 'not-allowed') {
          setErrorMsg('Microphone blocked. Click 🔒 in your address bar → Allow microphone, then try again.');
          shouldKeepListeningRef.current = false;
          setIsListening(false);
          return;
        }

        // Automatic Fallback for Indian English if Google regional en-IN server has network / speech-service issues
        if ((event.error === 'network' || event.error === 'language-not-supported' || event.error === 'service-not-allowed') && activeCode !== 'en-US') {
          console.log(`[VoiceDictation] Auto-switching from ${activeCode} to universal en-US recognizer...`);
          activeLangCodeRef.current = 'en-US';
          setStatusMsg('🟢 Universal English speech engine active (auto-tuned for Indian English accents). Speak naturally!');
          setErrorMsg('');
          if (shouldKeepListeningRef.current) {
            try {
              recognition.abort();
              setTimeout(() => {
                if (shouldKeepListeningRef.current) {
                  const nextRec = initRecognition();
                  if (nextRec) {
                    recognitionRef.current = nextRec;
                    nextRec.start();
                  }
                }
              }, 100);
              return;
            } catch (err) {
              console.warn('Fallback restart notice:', err);
            }
          }
          return;
        }

        if (event.error === 'network') {
          setErrorMsg(`Google Speech Server network issue. Switched to fallback, or click any 1-click spoken template below!`);
        } else {
          setErrorMsg(`Voice notice: ${event.error}. You can also click any spoken template below.`);
        }
      };

      recognition.onend = () => {
        // Auto-restart with fresh recognition instance if user has NOT clicked stop
        if (shouldKeepListeningRef.current) {
          try {
            const nextRec = initRecognition();
            if (nextRec) {
              recognitionRef.current = nextRec;
              nextRec.start();
            }
          } catch (e) {
            console.warn('Speech restart notice:', e);
          }
        } else {
          commitFinalText();
          setIsListening(false);
          setInterimText('');
          setStatusMsg('');
          setVoiceDetected(false);
        }
      };

      return recognition;
    } catch (e) {
      console.error('Failed to create SpeechRecognition:', e);
      return null;
    }
  };

  const startListening = async () => {
    setErrorMsg('');
    activeLangCodeRef.current = selectedLang.code;
    setStatusMsg(`Connecting microphone for ${selectedLang.flag} ${selectedLang.native}…`);
    shouldKeepListeningRef.current = true;

    // Reset transcription buffers
    initialTextRef.current = value || '';
    finalTranscriptRef.current = '';
    interimTranscriptRef.current = '';
    setInterimText('');
    setVoiceDetected(false);

    // Verify mic permission and IMMEDIATELY release device stream so SpeechRecognition gets exclusive access
    const allowed = await checkMicrophonePermission();
    if (!allowed) {
      shouldKeepListeningRef.current = false;
      setStatusMsg('');
      return;
    }

    if (!SpeechRecognitionAPI) {
      setErrorMsg('Web Speech API is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      setStatusMsg('');
      shouldKeepListeningRef.current = false;
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }

      const rec = initRecognition();
      if (!rec) {
        setErrorMsg('Could not initialize speech recognizer.');
        shouldKeepListeningRef.current = false;
        return;
      }

      recognitionRef.current = rec;
      rec.start();
      setStatusMsg('');
    } catch (err) {
      console.error('Recognition start error:', err);
      setErrorMsg(`Could not activate mic: ${err.message || 'Check browser permissions'}`);
      setStatusMsg('');
      shouldKeepListeningRef.current = false;
      setIsListening(false);
    }
  };

  const stopListening = () => {
    shouldKeepListeningRef.current = false;
    commitFinalText();

    if (recognitionRef.current) {
      try {
        // Use stop() so Chrome processes any final pending words before closing
        recognitionRef.current.stop();
      } catch (e) {
        try { recognitionRef.current.abort(); } catch (err) {}
      }
    }

    setIsListening(false);
    setInterimText('');
    setStatusMsg('');
    stopHardwareAudio();
  };

  const toggleListening = () => {
    if (isListening || shouldKeepListeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleLangChange = (lang) => {
    if (isListening) stopListening();
    setSelectedLang(lang);
    activeLangCodeRef.current = lang.code;
    setErrorMsg('');
    setStatusMsg('');
    if (onLanguageChange) {
      onLanguageChange(lang);
    }
  };

  const handleSimulateSpeech = (sample) => {
    setErrorMsg('');
    const sampleText = typeof sample === 'object' ? (sample.text || sample.label) : sample;
    const base = value.trim();
    const updated = base ? `${base} ${sampleText}` : sampleText;
    if (onChange) onChange(updated);
    else if (onAppend) onAppend(sampleText);
  };

  const currentSamples = SAMPLE_SPOKEN_IDEAS[selectedLang.code] || SAMPLE_SPOKEN_IDEAS['en-US'];

  if (!isSupported) {
    return (
      <div className="voice-unsupported card">
        <span className="unsupported-icon">🎙️</span>
        <div>
          <strong>Speech Recognition Notice</strong>
          <p>Native voice recognition is best experienced in Chrome or Edge. In this browser, you can insert realistic spoken prompts in any language with 1 click:</p>
          <div className="voice-samples-row">
            {currentSamples.map((sample, i) => (
              <button key={i} type="button" className="btn btn-secondary" onClick={() => handleSimulateSpeech(sample)}>
                Insert {selectedLang.flag} {selectedLang.native} Sample #{i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`voice-dictation-card ${isListening ? 'voice-card--active' : ''}`}>

      {/* Language Selector Bar */}
      <div className="dictation-lang-bar">
        <span className="dictation-lang-label">🎙️ Dictate Language:</span>
        <div className="lang-pills-row">
          {DICTATION_LANGUAGES.map(lang => (
            <button
              key={lang.code}
              type="button"
              className={`dictation-lang-pill ${selectedLang.code === lang.code ? 'active' : ''}`}
              onClick={() => handleLangChange(lang)}
              title={lang.name}
            >
              {lang.flag} {lang.native}
            </button>
          ))}
        </div>
      </div>

      {/* Mic Button + Live Audio Visualizer + Status */}
      <div className="voice-visualizer-area">
        <button
          type="button"
          id="main-voice-mic-btn"
          className={`voice-mic-btn ${isListening ? 'listening' : ''}`}
          onClick={toggleListening}
          aria-label={isListening ? 'Stop dictating' : 'Start dictating'}
        >
          <span className="voice-mic-icon">{isListening ? '⏹' : '🎙️'}</span>
          {isListening && <span className="voice-pulse-ring" />}
          {isListening && <span className="voice-pulse-ring delay" />}
        </button>

        <div className="voice-status-text">
          {statusMsg && !isListening && (
            <div className="status-pending">⏳ {statusMsg}</div>
          )}

          {isListening && (
            <>
              <div className="status-live">
                <span className="live-dot" />
                <span>
                  {statusMsg || `Listening in ${selectedLang.flag} ${selectedLang.native} (${selectedLang.name})… speak naturally`}
                </span>
              </div>

              {/* Dynamic VU Meter responding to actual voice volume */}
              <div className="voice-level-meter-row">
                <div className="wave-bars">
                  <span className="wave-bar" style={{ height: `${Math.max(6, Math.min(24, audioLevel * 0.4))}px` }} />
                  <span className="wave-bar" style={{ height: `${Math.max(8, Math.min(28, audioLevel * 0.6))}px` }} />
                  <span className="wave-bar" style={{ height: `${Math.max(10, Math.min(32, audioLevel * 0.8))}px` }} />
                  <span className="wave-bar" style={{ height: `${Math.max(8, Math.min(28, audioLevel * 0.6))}px` }} />
                  <span className="wave-bar" style={{ height: `${Math.max(6, Math.min(24, audioLevel * 0.4))}px` }} />
                </div>
                <span className="voice-indicator-pill">
                  {voiceDetected || audioLevel > 5 ? '🟢 Voice Detected' : '⚪ Speak into microphone…'}
                </span>
              </div>

              <div className="voice-vol-indicator">
                Click ⏹ to stop dictating and preserve your draft.
              </div>
            </>
          )}

          {!statusMsg && !isListening && (
            <>
              <div className="status-idle">
                Click Microphone to Dictate in {selectedLang.flag} {selectedLang.native} ({selectedLang.name})
              </div>
              <div className="status-sub">
                Speak your project idea, architecture choices, and requirements. Spoken words stream directly into your draft.
              </div>
            </>
          )}
        </div>
      </div>

      {/* If text is captured, provide 1-click proceed button right in VoiceDictation card */}
      {value && value.trim().length >= 2 && (
        <div className="voice-proceed-banner" style={{ marginTop: '12px', padding: '10px 16px', background: 'rgba(234, 88, 12, 0.12)', border: '1px solid rgba(234, 88, 12, 0.3)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '0.86rem', color: 'var(--color-text-secondary)' }}>
            🎙️ Captured <strong>{value.trim().length} characters</strong> of spoken draft: <em style={{ color: 'var(--color-text-primary)' }}>"{value.trim().slice(0, 45)}{value.trim().length > 45 ? '…' : ''}"</em>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              if (isListening) stopListening();
              if (onSubmit) onSubmit();
            }}
            style={{ padding: '7px 18px', fontSize: '0.85rem', fontWeight: '600', whiteSpace: 'nowrap' }}
          >
            🔬 Analyze My Blueprint →
          </button>
        </div>
      )}

      {/* Error or Warning Banner */}
      {errorMsg && (
        <div className="voice-error-banner">
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Live Interim Transcription Stream */}
      {isListening && interimText && (
        <div className="interim-stream animate-slide-up">
          <span className="stream-label">Hearing:</span>
          <span className="stream-text">"{interimText}"</span>
        </div>
      )}

      {/* Quick Test Samples for Selected Language */}
      <div className="voice-helpers-row">
        <span className="helpers-label">⚡ 1-Click Spoken Test Templates ({selectedLang.flag} {selectedLang.native}):</span>
        <div className="samples-pills">
          {currentSamples.map((sample, i) => {
            const label = typeof sample === 'object' ? sample.label : `Insert Sample #${i + 1}`;
            const text = typeof sample === 'object' ? sample.text : sample;
            return (
              <button
                key={i}
                type="button"
                className="sample-pill-btn"
                onClick={() => handleSimulateSpeech(text)}
                title={text}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
