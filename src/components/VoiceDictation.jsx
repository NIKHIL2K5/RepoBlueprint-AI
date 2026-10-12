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
  ],
};

export default function VoiceDictation({ value = '', onChange, onAppend }) {
  const [selectedLang, setSelectedLang] = useState(DICTATION_LANGUAGES[0]);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef(null);
  const initialTextRef = useRef('');
  const finalTranscriptRef = useRef('');
  const interimTranscriptRef = useRef('');

  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

  useEffect(() => {
    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
    }
    return () => {
      stopRecognition();
    };
  }, []);

  const stopRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
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

  const startListening = async () => {
    setErrorMsg('');
    setStatusMsg('Requesting microphone access…');

    // CRITICAL FIX: Request mic permission and immediately release hardware lock
    // Windows WASAPI blocks WebkitSpeechRecognition if AudioContext holds the track open
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Immediately stop all tracks to release the hardware lock back to OS
        stream.getTracks().forEach(track => track.stop());
        setStatusMsg('Microphone access granted. Starting…');
      } catch (err) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setErrorMsg('Microphone permission denied. Click the 🔒 icon in your address bar → select "Allow" for microphone, then try again.');
          setStatusMsg('');
          return;
        }
        // On some browsers getUserMedia fails but SpeechRecognition still works — continue
        console.warn('getUserMedia failed (non-blocking):', err.message);
      }
    }

    if (!SpeechRecognitionAPI) {
      setErrorMsg('Speech recognition is not available in this browser. Please use Chrome or Edge.');
      setStatusMsg('');
      return;
    }

    stopRecognition(); // Clean up any existing instance

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selectedLang.code;
      recognition.maxAlternatives = 1;

      // Reset transcript buffers
      initialTextRef.current = value || '';
      finalTranscriptRef.current = '';
      interimTranscriptRef.current = '';

      recognition.onstart = () => {
        setIsListening(true);
        setStatusMsg('');
        setErrorMsg('');
      };

      recognition.onresult = (event) => {
        let currentFinal = '';
        let currentInterim = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0]?.transcript || '';
          if (event.results[i].isFinal) {
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

        // Live update — stream words to textarea
        const allSpoken = (finalTranscriptRef.current + (currentInterim ? ' ' + currentInterim : '')).trim();
        if (allSpoken) {
          const base = initialTextRef.current.trim();
          const fullDraft = base ? `${base} ${allSpoken}` : allSpoken;
          if (onChange) onChange(fullDraft);
        }
      };

      recognition.onerror = (event) => {
        if (event.error === 'aborted' || event.error === 'no-speech') {
          // Benign: user stopped or no audio yet
          return;
        }
        console.warn('[VoiceDictation] error:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMsg('Microphone access blocked. Click 🔒 in address bar → Allow microphone.');
          setIsListening(false);
        } else if (event.error === 'network') {
          setErrorMsg('Network error with browser speech service. Try using the Sample buttons below.');
          commitFinalText();
          setIsListening(false);
        } else if (event.error === 'audio-capture') {
          setErrorMsg('Could not capture audio. Make sure your microphone is connected and not in use by another app.');
          setIsListening(false);
        } else if (event.error === 'service-not-allowed') {
          setErrorMsg('Speech service not allowed. Make sure you\'re using HTTPS or localhost.');
          setIsListening(false);
        } else {
          setErrorMsg(`Voice error: ${event.error}. Try the sample buttons below.`);
        }
      };

      recognition.onend = () => {
        // Auto-commit on recognition ending
        commitFinalText();
        setIsListening(false);
        setInterimText('');
        setStatusMsg('');
      };

      recognitionRef.current = recognition;

      // Small delay after releasing mic hardware lock to let OS reset
      await new Promise(res => setTimeout(res, 120));
      recognition.start();

    } catch (err) {
      console.error('[VoiceDictation] Failed to start:', err);
      setErrorMsg(`Could not start voice: ${err.message || 'Check microphone permissions.'}`);
      setStatusMsg('');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    commitFinalText();
    stopRecognition();
    setIsListening(false);
    setInterimText('');
    setStatusMsg('');
  };

  const toggleListening = () => {
    if (isListening) {
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
      <div className="voice-unsupported">
        <span>⚠️</span>
        <div>
          <strong>Speech Recognition Unavailable</strong>
          <p>Please use Chrome or Edge. In the meantime, use these sample ideas:</p>
          <div className="voice-samples-row">
            {(SAMPLE_SPOKEN_IDEAS['en-US']).map((sample, i) => (
              <button key={i} type="button" className="btn btn-ghost" onClick={() => handleSimulateSpeech(sample)}>
                Insert Sample #{i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`voice-dictation-card ${isListening ? 'voice-card--active' : ''}`}>

      {/* Language Pill Bar */}
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

      {/* Mic Button + Status */}
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
                <span>Listening in {selectedLang.flag} {selectedLang.native}… speak naturally</span>
              </div>
              <div className="wave-bars">
                <span className="wave-bar" /><span className="wave-bar" /><span className="wave-bar" />
                <span className="wave-bar" /><span className="wave-bar" />
              </div>
              <div className="voice-vol-indicator">
                Click ⏹ to stop and save your speech
              </div>
            </>
          )}
          {!statusMsg && !isListening && (
            <>
              <div className="status-idle">
                Click Microphone to Dictate in {selectedLang.flag} {selectedLang.native} ({selectedLang.name})
              </div>
              <div className="status-sub">
                Speak your project idea, tech stack, and goals. Words stream into the draft below.
              </div>
            </>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="voice-error-banner">
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Live interim preview */}
      {isListening && interimText && (
        <div className="interim-stream">
          <span className="stream-label">Hearing:</span>
          <span className="stream-text">"{interimText}"</span>
        </div>
      )}

      {/* Quick Sample Buttons */}
      <div className="voice-helpers-row">
        <span className="helpers-label">⚡ Test sample input ({selectedLang.native}):</span>
        <div className="samples-pills">
          {currentSamples.map((sample, i) => (
            <button
              key={i}
              type="button"
              className="sample-pill-btn"
              onClick={() => handleSimulateSpeech(sample)}
              title={sample}
            >
              Sample #{i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
