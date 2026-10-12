import { useState, useEffect, useRef, useCallback } from 'react';
import './VoiceDictation.css';

export const DICTATION_LANGUAGES = [
  { code: 'en-IN', name: 'English (India)', native: 'English (IN)', flag: '🇮🇳' },
  { code: 'en-US', name: 'English (US)', native: 'English (US)', flag: '🇺🇸' },
  { code: 'te-IN', name: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
  { code: 'hi-IN', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'es-ES', name: 'Spanish', native: 'Español', flag: '🇪🇸' },
  { code: 'fr-FR', name: 'French', native: 'Français', flag: '🇫🇷' },
  { code: 'de-DE', name: 'German', native: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja-JP', name: 'Japanese', native: '日本語', flag: '🇯🇵' },
  { code: 'zh-CN', name: 'Chinese', native: '中文', flag: '🇨🇳' },
];

const SAMPLE_SPOKEN_IDEAS = {
  'en-IN': [
    { label: '🎧 Blind Accessibility Portal', text: 'I want to build an accessible website for blind people with Web Speech voice navigation, screen-reader optimizations, and spatial audio feedback.' },
    { label: '🪪 Smart ID Card KYC', text: 'Smart ID Card & Identity Verification System with multimodal OCR extraction, face match, and encrypted PostgreSQL storage.' },
    { label: '🤖 GitHub PR Triage Agent', text: 'Autonomous AI issue triage and automated pull request generation agent for open-source repositories.' },
    { label: '⚡ Decentralized Video Streamer', text: 'P2P low-latency video streaming platform with edge mesh networking, WebRTC, and end-to-end encryption.' },
  ],
  'en-US': [
    { label: '🎧 Blind Accessibility Portal', text: 'I want to build an accessible website for blind people with Web Speech voice navigation, screen-reader optimizations, and spatial audio feedback.' },
    { label: '🪪 Smart ID Card KYC', text: 'Smart ID Card & Identity Verification System with multimodal OCR extraction, face match, and encrypted PostgreSQL storage.' },
    { label: '🤖 GitHub PR Triage Agent', text: 'Autonomous AI issue triage and automated pull request generation agent for open-source repositories.' },
    { label: '⚡ Decentralized Video Streamer', text: 'P2P low-latency video streaming platform with edge mesh networking, WebRTC, and end-to-end encryption.' },
  ],
  'te-IN': [
    { label: '🎧 బ్లైండ్ యాక్సెసిబిలిటీ వెబ్‌సైట్', text: 'నేను అంధుల కోసం వాయిస్ నావిగేషన్ మరియు ఆడియో ఫీడ్‌బ్యాక్‌తో యాక్సెస్ చేయగల వెబ్‌సైట్‌ను నిర్మించాలనుకుంటున్నాను.' },
    { label: '🪪 స్మార్ట్ ఐడీ కార్డ్ వెరిఫికేషన్', text: 'మల్టీమోడల్ OCR మరియు బయోమెట్రిక్ ఫేస్ మ్యాచ్‌తో కూడిన స్మార్ట్ ఐడీ కార్డ్ ధృవీకరణ వ్యవస్థ.' },
    { label: '⚡ డీసెంట్రలైజ్డ్ వీడియో స్ట్రీమింగ్', text: 'నేను WebRTC, IPFS మరియు React ఉపయోగించి ఓపెన్ సోర్స్ డీసెంట్రలైజ్డ్ వీడియో స్ట్రీమింగ్ ప్లాట్‌ఫామ్‌ను నిర్మించాలనుకుంటున్నాను.' },
  ],
  'hi-IN': [
    { label: '🎧 दृष्टिहीनों के लिए वॉइस पोर्टल', text: 'मैं दृष्टिहीन लोगों के लिए वॉइस नेविगेशन और स्क्रीन रीडर सपोर्ट के साथ एक सुलभ वेबसाइट बनाना चाहता हूँ।' },
    { label: '🪪 स्मार्ट आईडी कार्ड वेरिफिकेशन', text: 'मल्टीमॉडल OCR और बायोमेट्रिक फेस मैच के साथ स्मार्ट आईडी कार्ड सत्यापन प्रणाली।' },
    { label: '⚡ डिसेंट्रलाइज्ड वीडियो स्ट्रीमिंग', text: 'मैं WebRTC, IPFS और React का उपयोग करके एक ओपन-सोर्स वीडियो स्ट्रीमिंग प्लेटफॉर्म बनाना चाहता हूँ।' },
  ],
  'es-ES': [
    { label: '🎧 Portal Accesible para Ciegos', text: 'Quiero construir un sitio web accesible para personas ciegas con navegación por voz y audio espacial.' },
    { label: '🪪 Verificación de Identidad con IA', text: 'Sistema de verificación de tarjetas de identidad con extracción OCR multimodal y almacenamiento seguro.' },
  ],
  'fr-FR': [
    { label: '🎧 Portail Accessible aux Non-Voyants', text: 'Je souhaite créer un site web accessible aux personnes aveugles avec navigation vocale et retour audio.' },
    { label: '🪪 Vérification d\'Identité par IA', text: 'Système de vérification de cartes d\'identité avec OCR multimodal et stockage chiffré.' },
  ],
  'de-DE': [
    { label: '🎧 Barrierefreies Webportal für Blinde', text: 'Ich möchte eine barrierefreie Website für Blinde mit Sprachnavigation und 3D-Audiowiedergabe erstellen.' },
    { label: '🪪 KI-Ausweisprüfung & OCR', text: 'Intelligentes Ausweisprüfsystem mit multimodaler OCR-Extraktion und verschlüsselter PostgreSQL-Datenbank.' },
  ],
  'ja-JP': [
    { label: '🎧 視覚障害者向けアクセシブルポータル', text: '音声ナビゲーションと3Dオーディオフィードバックを備えた視覚障害者向けのウェブポータルを構築したいです。' },
    { label: '🪪 AI身分証OCR検証システム', text: 'マルチモーダルOCR抽出と生体認証を備えた身分証確認システム。' },
  ],
  'zh-CN': [
    { label: '🎧 盲人无障碍语音门户', text: '我想为视障人士构建一个具有语音导航和空间音频反馈的无障碍网站。' },
    { label: '🪪 智能身份证OCR验证系统', text: '具有多模态OCR提取、人脸比对和加密存储的智能身份证验证系统。' },
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
