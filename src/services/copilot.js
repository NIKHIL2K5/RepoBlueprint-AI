import { SAMPLE_IDEAS } from '../data/samples';

/**
 * Sends a chat message to the configured AI engine (Ollama, Gemini, or smart local fallback)
 * with complete live app context, returning structured response text and optional executable actions.
 */
export async function sendChatMessage({ config, history = [], userMessage, appContext = {} }) {
  const systemPrompt = buildSystemPrompt(appContext);

  // Demo mode: Use the intelligent offline sandbox
  if (config?.provider === 'demo' || config?.isDemo) {
    return generateOfflineCopilotResponse(userMessage, appContext);
  }

  // 1. Try Ollama if configured — throw actual errors so user can see them
  if (config?.provider === 'ollama') {
    try {
      const result = await callOllamaChat(config, systemPrompt, history, userMessage);
      return result;
    } catch (ollamaErr) {
      console.error('[Copilot Ollama Error]', ollamaErr);
      // Return a helpful error message rather than silently falling to static fallback
      const errMsg = ollamaErr?.message || 'Connection failed';
      const isOffline = errMsg.includes('fetch') || errMsg.includes('network') || errMsg.includes('Failed to fetch');
      if (isOffline) {
        return {
          text: `⚠️ **Ollama Connection Issue**: I couldn't reach Ollama at \`${config.ollamaUrl || 'http://localhost:11434'}\`. Please verify Ollama is running (\`ollama serve\`) and the URL is correct in your settings.\n\nIn the meantime, I can still use the Instant Demo engine — just ask me anything!`,
          action: null
        };
      }
      // Real error from Ollama (model not found, etc.)
      return {
        text: `⚠️ **Ollama Error**: ${errMsg}. Make sure model \`${config.ollamaModel || 'llama3.2:3b'}\` is pulled (\`ollama pull ${config.ollamaModel || 'llama3.2:3b'}\`) and running.`,
        action: null
      };
    }
  }

  // 2. Try Gemini if configured
  if (config?.provider === 'gemini' && config?.geminiKey) {
    try {
      const result = await callGeminiChat(config, systemPrompt, history, userMessage);
      return result;
    } catch (geminiErr) {
      console.error('[Copilot Gemini Error]', geminiErr);
      const errMsg = geminiErr?.message || 'Connection failed';
      return {
        text: `⚠️ **Gemini API Error**: ${errMsg}. Please verify your API key is valid (from [aistudio.google.com](https://aistudio.google.com/app/apikey)) and try again.`,
        action: null
      };
    }
  }

  // No provider configured — use offline fallback
  return generateOfflineCopilotResponse(userMessage, appContext);
}

/* ──────────────── CONSTRUCT DYNAMIC CONTEXTUAL SYSTEM PROMPT ──────────────── */
function buildSystemPrompt(appContext = {}) {
  const stage = appContext.stage || 'input';
  let contextDetails = `CURRENT SCREEN STAGE: ${stage.toUpperCase()}\n`;

  if (stage === 'input') {
    contextDetails += `Active Input Tab: ${appContext.inputTab || 'sketch'}\n`;
    contextDetails += `Current Draft Text: ${appContext.ideaText ? `"${appContext.ideaText}"` : '(Empty - user has not typed an idea yet)'}\n`;
  } else if (stage === 'alignment') {
    contextDetails += `Project Title: ${appContext.understanding?.projectTitle || 'Untitled'}\n`;
    contextDetails += `One Liner: ${appContext.understanding?.oneLiner || ''}\n`;
    contextDetails += `Core Purpose: ${appContext.understanding?.corePurpose || ''}\n`;
    contextDetails += `Identified Components: ${(appContext.understanding?.identifiedComponents || []).map(c => c.name).join(', ')}\n`;
    contextDetails += `Clarifying Questions: ${JSON.stringify(appContext.understanding?.clarifyingQuestions || [])}\n`;
    contextDetails += `User Selected Answers: ${JSON.stringify(appContext.alignmentAnswers || {})}\n`;
    contextDetails += `Custom Architectural Notes: ${appContext.additionalNotes || 'None'}\n`;
  } else if (stage === 'dashboard') {
    contextDetails += `Project Title: ${appContext.understanding?.projectTitle || 'Untitled'}\n`;
    contextDetails += `Active Dashboard Tab: ${appContext.dashboardTab || 'blueprint'}\n`;
    contextDetails += `Tech Stack: Frontend=${appContext.blueprint?.techStack?.frontend?.name}, Backend=${appContext.blueprint?.techStack?.backend?.name}, Database=${appContext.blueprint?.techStack?.database?.name}\n`;
    contextDetails += `Current Cost Slider DAU: ${appContext.dau || 5000} users\n`;
    contextDetails += `Generated Files Count: ${appContext.blueprint?.fileTree?.length || 0}\n`;
  } else if (stage === 'setup') {
    contextDetails += `Setup Screen: Selecting between Ollama (Local open-source models) and Google Gemini\n`;
  }

  const langCode = appContext.languageCode || 'en-US';
  const langName = appContext.languageName || 'English';
  let langInstruction = '';
  if (langCode !== 'en-US' && langName !== 'English') {
    langInstruction = `
CRITICAL MULTILINGUAL REQUIREMENT:
The user has requested responses in ${langName} (${langCode}).
You MUST write your entire conversational response, explanations, guidance, and reasoning in ${langName}.
Keep industry standard technical names (like PostgreSQL, React, Docker, FastAPI, Mermaid) intact, but speak to the user fluently and naturally in ${langName}.
`;
  }

  return `You are RepoBlueprint's Autonomous AI Technical Co-Founder & Principal Architect Copilot.
You are embedded directly inside the RepoBlueprint AI web application to guide the user through building their hackathon project.
Be pragmatic, enthusiastic, technically rigorous, and concise (2-4 paragraphs max).
${langInstruction}
LIVE APPLICATION STATE:
${contextDetails}

YOU CAN TRIGGER EXECUTABLE ACTIONS ON THE APPLICATION:
When you advise the user or when they ask you to do something (e.g., write an idea, answer a question, switch tabs, download repo), append an executable action tag at the very end of your response.
Action Tag Format:
<<<ACTION>>>
{
  "type": "ACTION_TYPE",
  "params": { ... },
  "label": "Button text for action"
}
<<<END_ACTION>>>

Supported Action Types:
1. "FILL_IDEA": params: { "text": "Enhanced idea text" } — Fills/updates the idea box on the input page.
2. "APPEND_IDEA": params: { "text": "Additional requirements" } — Appends to the idea box.
3. "SWITCH_INPUT_TAB": params: { "tab": "sketch" | "voice" | "text" | "image" | "link" } — Switches input tab.
4. "LOAD_SAMPLE": params: { "sampleId": "habit" | "oss" | "devops" } — Loads a preset sample project.
5. "SUBMIT_IDEA": params: {} — Submits the current idea to enter alignment phase.
6. "SELECT_ALIGNMENT_ANSWER": params: { "questionIndex": 0, "option": "option string" } — Auto-selects an answer on the alignment screen.
7. "SET_ALIGNMENT_NOTES": params: { "notes": "custom constraints" } — Adds custom architectural constraints.
8. "CONFIRM_ALIGNMENT": params: {} — Generates the Master Architecture Blueprint.
9. "SWITCH_DASHBOARD_TAB": params: { "tab": "blueprint" | "stack" | "cost" | "market" | "repo" | "roadmap" } — Switches dashboard tab.
10. "SET_DAU": params: { "dau": 25000 } — Adjusts cost calculator slider.
11. "DOWNLOAD_REPO": params: {} — Downloads starter repo .zip bundle.
12. "SWITCH_TO_DEMO": params: {} — Launches instant demo mode.

Only provide an action tag when an action is appropriate. Make sure the action JSON is strictly valid.`;
}

/* ──────────────── OLLAMA CHAT CALL ──────────────── */
async function callOllamaChat(config, systemPrompt, history, userMessage) {
  const baseUrl = (config.ollamaUrl || 'http://localhost:11434').replace(/\/$/, '');
  const isLocalhost = baseUrl.includes('localhost:11434') || baseUrl.includes('127.0.0.1:11434');
  const chatUrl = isLocalhost ? '/ollama/api/chat' : `${baseUrl}/api/chat`;
  const model = config.ollamaModel || 'llama3.2:3b';

  // Build messages array for proper multi-turn chat API
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-8).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content
    })),
    { role: 'user', content: userMessage }
  ];

  const res = await fetch(chatUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: { temperature: 0.75, num_predict: 1024 }
    })
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`Ollama error ${res.status}: ${errBody.slice(0, 200)}`);
  }

  const data = await res.json();
  const responseText = data?.message?.content || data?.response || '';
  if (!responseText) {
    throw new Error('Ollama returned empty response');
  }
  return parseCopilotResponse(responseText);
}

/* ──────────────── GEMINI CHAT CALL ──────────────── */
async function callGeminiChat(config, systemPrompt, history, userMessage) {
  const cleanKey = config.geminiKey.trim();
  const model = config.geminiModel || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;

  let prompt = `${systemPrompt}\n\n`;
  for (const m of history.slice(-6)) {
    prompt += `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}\n\n`;
  }
  prompt += `User: ${userMessage}\nAssistant:`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
    })
  });

  if (!res.ok) throw new Error(`Gemini error ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return parseCopilotResponse(text);
}

/* ──────────────── PARSE TEXT & ACTIONS ──────────────── */
export function parseCopilotResponse(rawText) {
  if (!rawText) {
    return {
      text: "I'm here to help you architect and ship your project! What would you like to explore next?",
      action: null
    };
  }

  let action = null;
  let cleanText = rawText;

  // Pattern 1: Check for explicit <<<ACTION>>> or <<ACTION>> block
  const blockRegex = /<{2,3}[A-Z_]+>{2,3}\s*([\s\S]*?)\s*<{2,3}END[A-Z_]*>{2,3}/i;
  const blockMatch = rawText.match(blockRegex);

  if (blockMatch) {
    try {
      action = JSON.parse(blockMatch[1].trim());
      cleanText = rawText.replace(blockRegex, '').trim();
    } catch (e) {
      console.warn('Failed to parse block action JSON:', e);
    }
  }

  // Pattern 2: Search for balanced curly braces around any action "type": "..."
  if (!action) {
    const typeKeywordIdx = cleanText.search(/"type"\s*:\s*"(FILL_IDEA|APPEND_IDEA|SWITCH_INPUT_TAB|LOAD_SAMPLE|SUBMIT_IDEA|SELECT_ALIGNMENT_ANSWER|SET_ALIGNMENT_NOTES|CONFIRM_ALIGNMENT|SWITCH_DASHBOARD_TAB|SET_DAU|DOWNLOAD_REPO|SWITCH_TO_DEMO)"/);
    if (typeKeywordIdx !== -1) {
      const openIdx = cleanText.lastIndexOf('{', typeKeywordIdx);
      if (openIdx !== -1) {
        let depth = 0;
        let closeIdx = -1;
        for (let i = openIdx; i < cleanText.length; i++) {
          if (cleanText[i] === '{') depth++;
          else if (cleanText[i] === '}') {
            depth--;
            if (depth === 0) {
              closeIdx = i;
              break;
            }
          }
        }

        if (closeIdx !== -1) {
          const jsonStr = cleanText.slice(openIdx, closeIdx + 1);
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type) {
              action = parsed;
              cleanText = (cleanText.slice(0, openIdx) + cleanText.slice(closeIdx + 1)).trim();
            }
          } catch (e) {
            console.warn('Failed to parse balanced action JSON:', e);
          }
        }
      }
    }
  }

  // Clean any residual raw JSON blocks, code-fenced action JSON, or stray delimiter tags
  cleanText = cleanText
    .replace(/```(?:json)?\s*\{[\s\S]*?"type"[\s\S]*?\}\s*```/gi, '')
    .replace(/\{[\s\r\n]*"type"[\s\r\n]*:[\s\S]*?"params"[\s\S]*?\}(?:\s*\})/gi, '')
    .replace(/<{2,4}[\s\S]*?>{2,4}/g, '')
    .replace(/<{2,4}[A-Z0-9_\s]+/gi, '')
    .replace(/[A-Z0-9_\s]+>{2,4}/gi, '')
    .replace(/^\s*<<+.*$/gm, '')
    .replace(/^\s*>>+.*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  // Ensure default label if missing
  if (action && !action.label) {
    action.label = getDefaultActionLabel(action);
  }

  return {
    text: cleanText,
    action
  };
}

function getDefaultActionLabel(action) {
  switch (action.type) {
    case 'FILL_IDEA': return '✨ Fill Idea in Draft';
    case 'SWITCH_INPUT_TAB': return `🎙️ Switch to ${action.params?.tab || 'Tab'}`;
    case 'LOAD_SAMPLE': return '⚡ Load Sample Preset';
    case 'SUBMIT_IDEA': return '🚀 Continue to Alignment';
    case 'SELECT_ALIGNMENT_ANSWER': return `✓ Select ${action.params?.option || 'Option'}`;
    case 'SET_ALIGNMENT_NOTES': return '📝 Apply Constraints';
    case 'CONFIRM_ALIGNMENT': return '🚀 Generate Master Blueprint';
    case 'SWITCH_DASHBOARD_TAB': return `🌐 Open ${action.params?.tab || 'Tab'}`;
    case 'SET_DAU': return `💰 Scale to ${(action.params?.dau || 0).toLocaleString()} DAU`;
    case 'DOWNLOAD_REPO': return '📦 Download Starter Repo .zip';
    case 'SWITCH_TO_DEMO': return '⚡ Launch Instant Demo';
    default: return '⚡ Apply Page Action';
  }
}

/* ──────────────── HIGH-INTELLIGENCE CONTEXTUAL FALLBACK ──────────────── */
function generateOfflineCopilotResponse(query, appContext = {}) {
  const q = (query || '').toLowerCase();
  const stage = appContext.stage || 'input';

  // 1. STAGE: INPUT
  if (stage === 'input' || stage === 'setup') {
    if (q.includes('enhance') || q.includes('better') || q.includes('write') || q.includes('idea')) {
      const current = appContext.ideaText?.trim();
      const enhancedText = current
        ? `${current}\n\nKey Architecture Goals:\n- Real-time client-server communication with low latency\n- Decoupled API service architecture for horizontal scalability\n- Containerized deployment with Docker and automated CI/CD pipeline\n- Structured logging, health checks, and monitoring instrumentation`
        : 'Autonomous AI Technical Co-Founder that turns raw whiteboard napkin sketches and voice dictation into production-ready repositories, complete with Mermaid.js topology, cost analysis, and downloadable boilerplate code.';

      return {
        text: `I've refined your idea with production-grade architectural requirements, ensuring high scalability, modular decoupling, and clear deployment specifications. Would you like me to apply this directly to your idea draft?`,
        action: {
          type: 'FILL_IDEA',
          params: { text: enhancedText },
          label: '✨ Fill Enhanced Idea in Draft'
        }
      };
    }

    if (q.includes('voice') || q.includes('speak') || q.includes('dictat')) {
      const langCode = appContext.languageCode || 'en-US';
      const text = getLocalizedSnippet('voice_switch', langCode) || `You can explain your project out loud! I can switch the input tab to **Voice Dictation** right now so you can speak your idea directly into the microphone.`;
      return {
        text,
        action: {
          type: 'SWITCH_INPUT_TAB',
          params: { tab: 'voice' },
          label: '🎙️ Switch to Voice Dictation'
        }
      };
    }

    if (q.includes('draw') || q.includes('sketch') || q.includes('whiteboard') || q.includes('napkin')) {
      return {
        text: `Let's switch to the **Napkin Whiteboard Canvas**! You can draw boxes, draw arrows, and label components. Our multimodal vision models will parse your sketch directly into an architecture blueprint.`,
        action: {
          type: 'SWITCH_INPUT_TAB',
          params: { tab: 'sketch' },
          label: '🎨 Open Napkin Whiteboard Canvas'
        }
      };
    }

    if (q.includes('sample') || q.includes('preset') || q.includes('habit') || q.includes('template')) {
      return {
        text: `I recommend loading the **AI Habit Coach** preset — it showcases a full-stack multimodal architecture with PostgreSQL, Redis caching, and Docker Compose!`,
        action: {
          type: 'LOAD_SAMPLE',
          params: { sampleId: 'habit' },
          label: '⚡ Load AI Habit Coach Preset'
        }
      };
    }

    if (q.includes('submit') || q.includes('next') || q.includes('continue') || q.includes('align')) {
      return {
        text: `Your project concept is ready for Phase 1! Let's enter the **Technical Co-Founder Alignment Phase** to review detected components and answer key architecture questions.`,
        action: {
          type: 'SUBMIT_IDEA',
          params: {},
          label: '🚀 Continue to Co-Founder Alignment'
        }
      };
    }
  }

  // 2. STAGE: ALIGNMENT
  if (stage === 'alignment') {
    if (q.includes('database') || q.includes('db') || q.includes('postgres') || q.includes('mongo')) {
      const langCode = appContext.languageCode || 'en-US';
      const text = getLocalizedSnippet('database_rec', langCode) || `For a scalable MVP with structured relations and modern query requirements, **PostgreSQL** is the gold standard. It provides ACID transactions, robust indexing, and seamless JSON/vector support via pgvector for future AI search.`;
      return {
        text,
        action: {
          type: 'SELECT_ALIGNMENT_ANSWER',
          params: { questionIndex: 0, option: 'PostgreSQL' },
          label: '🗄️ Select PostgreSQL for Database'
        }
      };
    }

    if (q.includes('generate') || q.includes('blueprint') || q.includes('done') || q.includes('proceed')) {
      return {
        text: `Everything looks locked in! I will now synthesize your choices into the **Master Architecture Blueprint**, including interactive Mermaid diagrams, hosting costs, and your starter repository .zip.`,
        action: {
          type: 'CONFIRM_ALIGNMENT',
          params: {},
          label: '🚀 Generate Master Architecture Blueprint'
        }
      };
    }

    if (q.includes('notes') || q.includes('constraint') || q.includes('tailwind') || q.includes('docker')) {
      return {
        text: `Adding developer experience constraints: Vite + React frontend, Tailwind CSS styling, and Docker Compose local orchestration.`,
        action: {
          type: 'SET_ALIGNMENT_NOTES',
          params: { notes: 'Use Vite + React, Tailwind CSS design system, and Docker Compose for local orchestration.' },
          label: '📝 Apply Constraints to Alignment'
        }
      };
    }
  }

  // 3. STAGE: DASHBOARD
  if (stage === 'dashboard') {
    if (q.includes('download') || q.includes('zip') || q.includes('repo') || q.includes('code')) {
      const langCode = appContext.languageCode || 'en-US';
      const text = getLocalizedSnippet('download_repo', langCode) || `Ready to start coding? I can trigger the download of your complete project .zip right now, containing working boilerplate, README.md, LICENSE, and docker-compose.yml!`;
      return {
        text,
        action: {
          type: 'DOWNLOAD_REPO',
          params: {},
          label: '📦 Download Starter Repo .zip'
        }
      };
    }

    if (q.includes('cost') || q.includes('pricing') || q.includes('cloud') || q.includes('hosting')) {
      return {
        text: `Let's inspect the **Cost Calculator** tab! You can slide the user volume from 500 to 100k DAU to see estimated compute, database, and API token bills.`,
        action: {
          type: 'SWITCH_DASHBOARD_TAB',
          params: { tab: 'cost' },
          label: '💰 View Cloud Cost Calculator'
        }
      };
    }

    if (q.includes('stack') || q.includes('tech') || q.includes('frontend') || q.includes('backend')) {
      return {
        text: `Opening the **Tech Stack** tab. Here you can see every selected framework with specific technical justifications and alternative options considered.`,
        action: {
          type: 'SWITCH_DASHBOARD_TAB',
          params: { tab: 'stack' },
          label: '⚙️ Inspect Tech Stack & Trade-offs'
        }
      };
    }

    if (q.includes('scale') || q.includes('100k') || q.includes('users') || q.includes('dau')) {
      return {
        text: `Simulating high traffic scale! Let's adjust the DAU slider to **50,000 active users** to examine production cluster requirements.`,
        action: {
          type: 'SET_DAU',
          params: { dau: 50000 },
          label: '📈 Scale Cost Estimate to 50k DAU'
        }
      };
    }

    if (q.includes('market') || q.includes('github') || q.includes('similar')) {
      return {
        text: `Let's switch to the **Market & GitHub Intelligence** tab to review similar open-source projects, star ratings, and community implementations.`,
        action: {
          type: 'SWITCH_DASHBOARD_TAB',
          params: { tab: 'market' },
          label: '🔎 Open GitHub Market Intel'
        }
      };
    }
  }

  // Default general co-founder advice
  const langCode = appContext.languageCode || 'en-US';
  const defaultText = getLocalizedSnippet('welcome', langCode) || `As your AI Technical Co-Founder, I'm here to ensure your architecture is lean, scalable, and hackathon-winning. You can ask me to evaluate database choices, explain trade-offs, enhance your project prompts, switch tabs, or download your starter repo directly!`;

  return {
    text: defaultText,
    action: stage === 'input' ? {
      type: 'SWITCH_INPUT_TAB',
      params: { tab: 'voice' },
      label: '🎙️ Try Voice Dictation'
    } : stage === 'dashboard' ? {
      type: 'DOWNLOAD_REPO',
      params: {},
      label: '📦 Download Starter Repo'
    } : null
  };
}

/* ──────────────── MULTILINGUAL LOCALIZATION DICTIONARY ──────────────── */
const LOCALIZED_SNIPPETS = {
  welcome: {
    'es-ES': '👋 **¡Hola! Soy tu Co-Fundador Técnico de IA y Copiloto de Arquitectura.**\n\nPuedo responder preguntas, evaluar tecnologías y **realizar acciones reales en esta página**.',
    'hi-IN': '👋 **नमस्ते! मैं आपका AI टेक्निकल को-फाउंडर और आर्किटेक्चर को-पायलट हूँ।**\n\nमैं आपकी आर्किटेक्चर डिज़ाइन करने में मदद करूँगा और इस पेज पर सीधे एक्शन ले सकता हूँ।',
    'te-IN': '👋 **నమస్కారం! నేను మీ AI టెక్నికల్ కో-ఫౌండర్ మరియు ఆర్కిటెక్చర్ కో-పైలట్‌ను.**\n\nనేను మీ ప్రాజెక్ట్ ఆర్కిటెక్చర్ సహాయాన్ని అందిస్తాను మరియు ఈ పేజీలో నేరుగా మార్పులు చేయగలను.',
    'fr-FR': '👋 **Bonjour ! Je suis votre Co-Fondateur Technique IA et Copilote d\'Architecture.**\n\nJe peux vous guider, répondre à vos questions et exécuter des actions directement sur cette page.',
    'de-DE': '👋 **Hallo! Ich bin dein technischer KI-Mitgründer und Architektur-Copilot.**\n\nIch kann deine Fragen beantworten und direkte Aktionen auf dieser Seite ausführen.',
    'ja-JP': '👋 **こんにちは！私はあなたのAIテクニカル共同創業者兼アーキテクチャ・コパイロットです。**\n\n技術選定やアーキテクチャ設計をサポートし、このページ上で直接アクションを実行できます。',
    'zh-CN': '👋 **你好！我是你的AI技术联合创始人兼架构副驾驶。**\n\n我可以帮助你设计架构、权衡技术栈，并直接在此页面上执行操作。',
  },
  database_rec: {
    'es-ES': 'Para un MVP escalable con relaciones estructuradas, **PostgreSQL** es el estándar de oro. Proporciona transacciones ACID, indexación sólida y soporte para pgvector.',
    'hi-IN': 'स्केलेबल MVP के लिए, **PostgreSQL** सबसे बेहतरीन विकल्प है। यह मजबूत ACID ट्रांजैक्शन, विश्वसनीय इंडेक्सिंग और pgvector सपोर्ट प्रदान करता है।',
    'te-IN': 'స్కేలబుల్ MVP కోసం **PostgreSQL** అత్యుత్తమ ఎంపిక. ఇది ACID లావాదేవీలు, సురక్షితమైన ఇండెక్సింగ్ మరియు pgvector సపోర్ట్‌ను అందిస్తుంది.',
    'fr-FR': 'Pour un MVP évolutif avec des relations structurées, **PostgreSQL** est la référence. Il offre des transactions ACID et le support pgvector.',
    'de-DE': 'Für ein skalierbares MVP mit strukturierten Relationen ist **PostgreSQL** der Goldstandard mit ACID-Transaktionen und pgvector-Unterstützung.',
    'ja-JP': 'スケーラブルなMVPには**PostgreSQL**が最適です。強力なACIDトランザクションとpgvectorによるAIベクトル検索をサポートしています。',
    'zh-CN': '对于具有结构化关系的可扩展MVP，**PostgreSQL**是行业黄金标准。它提供强大的ACID事务和pgvector向量搜索支持。',
  },
  voice_switch: {
    'es-ES': '¡Puedes explicar tu proyecto en voz alta! Cambiaré a la pestaña de **Dictado por Voz** para que hables por el micrófono.',
    'hi-IN': 'आप अपने प्रोजेक्ट को बोलकर समझा सकते हैं! मैं अभी **Voice Dictation** टैब पर स्विच कर रहा हूँ ताकि आप सीधे माइक में बोल सकें।',
    'te-IN': 'మీరు మీ ప్రాజెక్ట్ ఆలోచనను మాట్లాడి వివరించవచ్చు! నేను ఇప్పుడు **Voice Dictation** ట్యాబ్‌కు మారుస్తున్నాను.',
    'fr-FR': 'Vous pouvez expliquer votre projet à voix haute ! Je bascule vers l\'onglet **Dictée Vocale** pour que vous puissiez parler dans le micro.',
    'de-DE': 'Du kannst dein Projekt laut erklären! Ich wechsle jetzt zum Reiter **Sprachdiktat**, damit du direkt ins Mikrofon sprechen kannst.',
    'ja-JP': '声を出してプロジェクトを説明できます！マイクに向かって話せるよう、**音声入力**タブに切り替えます。',
    'zh-CN': '你可以大声说出你的项目想法！我马上切换到**语音听写**标签，以便你直接对着麦克风说话。',
  },
  download_repo: {
    'es-ES': '¿Listo para programar? Puedo descargar el paquete `.zip` de tu proyecto con código funcional, README y docker-compose.',
    'hi-IN': 'कोडिंग शुरू करने के लिए तैयार हैं? मैं आपके प्रोजेक्ट की पूरी `.zip` फाइल डाउनलोड कर सकता हूँ जिसमें वर्किंग कोड और docker-compose शामिल है!',
    'te-IN': 'కోడింగ్ ప్రారంభించడానికి సిద్ధంగా ఉన్నారా? వర్కింగ్ కోడ్ మరియు docker-compose తో మీ ప్రాజెక్ట్ `.zip` ఫైల్‌ను డౌన్‌లోడ్ చేయగలను!',
    'fr-FR': 'Prêt à coder ? Je peux télécharger l\'archive `.zip` complète de votre projet avec le code fonctionnel et docker-compose !',
    'de-DE': 'Bereit zum Coden? Ich kann das vollständige `.zip`-Paket deines Projekts mit funktionierendem Boilerplate und docker-compose herunterladen!',
    'ja-JP': 'コーディングの準備はできましたか？実動ボイラープレートとdocker-composeを含むプロジェクトの`.zip`をダウンロードできます！',
    'zh-CN': '准备好开始编写代码了吗？我可以立即下载包含完整工作代码和docker-compose的项目`.zip`包！',
  }
};

function getLocalizedSnippet(key, langCode) {
  if (!langCode || langCode === 'en-US') return null;
  const dict = LOCALIZED_SNIPPETS[key];
  if (!dict) return null;
  return dict[langCode] || dict[langCode.split('-')[0]] || null;
}
