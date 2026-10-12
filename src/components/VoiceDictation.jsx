import { useState, useEffect, useRef, useCallback } from 'react';
import './VoiceDictation.css';

export const DICTATION_LANGUAGES = [
  { code: 'en-US', name: 'English', native: 'English', flag: '🇺🇸' },
  { code: 'te-IN', name: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
  { code: 'hi-IN', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'es-ES', name: 'Spanish', native: 'Español', flag: '🇪🇸' },
  { code: 'fr-FR', name: 'French', native: 'Français', flag: '🇫🇷' },
  { code: 'de-DE', name: 'German', native: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja-JP', name: 'Japanese', native: '日本語', flag: '🇯🇵' },
  { code: 'zh-CN', name: 'Chinese', native: '中文', flag: '🇨🇳' },
];

const SAMPLE_SPOKEN_IDEAS = {
  'en-US': [
    'I want to build an open-source decentralized video streaming platform using WebRTC, IPFS, and React with end-to-end encryption.',
    'An autonomous AI bug triage bot for GitHub repositories that analyzes issues, locates relevant code, and proposes pull request branches.',
    'A real-time collaborative whiteboard with AI architecture generation, Mermaid diagrams, and 1-click Docker starter repos.',
  ],
  'te-IN': [
    'నేను WebRTC, IPFS మరియు React ఉపయోగించి ఓపెన్ సోర్స్ డీసెంట్రలైజ్డ్ వీడియో స్ట్రీమింగ్ ప్లాట్‌ఫామ్‌ను నిర్మించాలనుకుంటున్నాను.',
    'GitHub రిపోజిటరీల కోసం ఆటోమేటెడ్ AI బగ్ ట్రియాజ్ బాట్, ఇది సమస్యలను విశ్లేషిస్తుంది మరియు పుల్ రిక్వెస్ట్‌లను సృష్టిస్తుంది.',
    'రియల్-టైమ్ వైట్‌బోర్డ్ మరియు ఆర్కిటెక్చర్ బ్లూప్రింట్లను డాకర్ స్టార్టర్ కోడ్‌తో స్వయంచాలకంగా రూపొందించే AI సాధనం.',
  ],
  'hi-IN': [
    'मैं WebRTC, IPFS और React का उपयोग करके एक ओपन-सोर्स वीडियो स्ट्रीमिंग प्लेटफॉर्म बनाना चाहता हूँ।',
    'GitHub रिपॉजिटरी के लिए एक AI बग ट्राइएज बॉट जो समस्याओं का विश्लेषण करता है और पुल रिक्वेस्ट बनाता है।',
    'रीयल-टाइम व्हाइटबोर्ड और आर्किटेक्चर ब्लूप्रिंट्स को डॉकर स्टार्टर कोड के साथ ऑटोमैटिक जनरेट करने वाला AI टूल।',
  ],
  'es-ES': [
    'Quiero construir una plataforma de streaming de video descentralizada con WebRTC, IPFS y React con cifrado de extremo a extremo.',
    'Un bot de triaje de errores con IA para repositorios de GitHub que analiza issues y propone pull requests.',
  ],
  'fr-FR': [
    'Je souhaite créer une plateforme de streaming vidéo décentralisée et open source utilisant WebRTC, IPFS et React avec chiffrement de bout en bout.',
  ],
  'de-DE': [
    'Ich möchte eine dezentrale Open-Source-Videostreaming-Plattform mit WebRTC, IPFS und React entwickeln.',
  ],
  'ja-JP': [
    'WebRTC、IPFS、Reactを使用して、エンドツーエンド暗号化を備えた分散型動画配信プラットフォームを構築したいです。',
  ],
  'zh-CN': [
    '我想使用 WebRTC、IPFS 和 React 构建一个具有端到端加密的开源去中心化视频流媒体平台。',
  ],
};

export default function VoiceDictation({ value = '', onChange, onAppend }) {
  const [selectedLang, setSelectedLang] = useState(DICTATION_LANGUAGES[0]);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [audioLevel, setAudioLevel] = useState(0); // 0 to 100
  const [voiceDetected, setVoiceDetected] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef(null);
  const shouldKeepListeningRef = useRef(false);
  const initialTextRef = useRef('');
  const finalTranscriptRef = useRef('');
  const interimTranscriptRef = useRef('');
  const mediaStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const animFrameRef = useRef(null);

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
    if (!navigator.mediaDevices?.getUserMedia) return true;
    try {
      // Test mic permission and IMMEDIATELY stop track so SpeechRecognition gets exclusive Windows mic access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      return true;
    } catch (err) {
      console.warn('Microphone permission notice:', err.message);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg('Microphone blocked. Click 🔒 in your address bar → Allow microphone, then try again.');
        return false;
      }
      return true;
    }
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
      recognition.lang = selectedLang.code;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setStatusMsg('');
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
        console.warn('[VoiceDictation] error event:', event.error);
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
        } else if (event.error === 'network') {
          setErrorMsg(`Google Speech Server unreachable in this session (Chrome Incognito mode automatically blocks Google speech servers for privacy). Open in standard Chrome, or click any 1-click spoken template below!`);
        } else {
          setErrorMsg(`Voice notice: ${event.error}. You can also click any spoken template below.`);
        }
      };

      recognition.onend = () => {
        // Auto-restart if user has NOT clicked stop (Chrome terminates recognition on short pauses)
        if (shouldKeepListeningRef.current) {
          try {
            recognition.start();
          } catch (e) {
            // Already started or restarting
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
    setErrorMsg('');
  };

  const handleSimulateSpeech = (sample) => {
    setErrorMsg('');
    const base = value.trim();
    const updated = base ? `${base} ${sample}` : sample;
    if (onChange) onChange(updated);
    else if (onAppend) onAppend(sample);
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
          {statusMsg && (
            <div className="status-pending">⏳ {statusMsg}</div>
          )}

          {!statusMsg && isListening && (
            <>
              <div className="status-live">
                <span className="live-dot" />
                <span>Listening in {selectedLang.flag} {selectedLang.native} ({selectedLang.name})… speak naturally</span>
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
          {currentSamples.map((sample, i) => (
            <button
              key={i}
              type="button"
              className="sample-pill-btn"
              onClick={() => handleSimulateSpeech(sample)}
              title={sample}
            >
              Insert Sample #{i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
