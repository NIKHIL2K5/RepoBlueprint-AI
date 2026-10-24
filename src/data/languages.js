export const SUPPORTED_LANGUAGES = [
  { code: 'en-US', name: 'English', native: 'English', flag: '🇺🇸' },
  { code: 'hi-IN', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'te-IN', name: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
  { code: 'es-ES', name: 'Spanish', native: 'Español', flag: '🇪🇸' },
  { code: 'fr-FR', name: 'French', native: 'Français', flag: '🇫🇷' },
  { code: 'de-DE', name: 'German', native: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja-JP', name: 'Japanese', native: '日本語', flag: '🇯🇵' },
  { code: 'zh-CN', name: 'Chinese', native: '中文', flag: '🇨🇳' },
];

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

export const SAMPLE_SPOKEN_IDEAS = {
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
