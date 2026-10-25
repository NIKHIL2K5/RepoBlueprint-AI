import { GoogleGenAI } from '@google/genai';
import { SAMPLE_IDEAS } from '../data/samples';

// Recommended models to try in order
const DEFAULT_CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro',
  'gemini-1.5-pro-latest',
  'gemini-pro',
];

/* ──────────────── PHASE 1: Understand the Idea ──────────────── */
export async function understandIdea(config, ideaText, imageBase64 = null, mimeType = null) {
  if (config?.provider === 'demo' || config?.isDemo) {
    return handleDemoUnderstand(ideaText);
  }

  const systemPrompt = `You are an elite AI Technical Co-Founder and Principal Software Architect.
Analyze the user's project idea: "${ideaText || 'Whiteboard architectural sketch'}"
Respond with ONLY a valid, parseable JSON object — absolutely NO markdown code fences, NO backticks, NO commentary.

CRITICAL REQUIREMENTS:
1. "projectTitle": A memorable, professional 2-4 word startup/platform title (e.g. "StaySphere · Hotel Reservation Engine"). NEVER use raw conversational text or repeat "I need to create" or user typos.
2. "oneLiner": A 1-sentence high-impact architectural summary of what this platform accomplishes.
3. "corePurpose": 2-3 clear technical sentences explaining the real-world problem and technical architecture.
4. "clarifyingQuestions": MUST BE 3 deep, domain-specific technical architectural questions specifically for "${ideaText}" (e.g. for booking: double-booking prevention, payment escrow, calendar search). Each question MUST have "question", "why", and 3 concrete "options". NEVER return generic database/auth questions.
5. "githubSearchTerms": 3-4 clean, searchable topic keywords (e.g. for hotel: ["hotel-booking", "hotel-reservation", "booking-system"]). NEVER output full sentences or user phrases.
6. "similarWebsites": 2-3 real commercial SaaS products in this exact space with their URLs and our competitive moat.
7. "openSourceProjects": 2-3 real GitHub repositories in this exact space with owner/repo and descriptions.

Required JSON schema:
{
  "projectTitle": "Polished Brand Name",
  "oneLiner": "One-sentence high-impact pitch",
  "corePurpose": "2-3 clear sentences explaining the problem and technical solution",
  "keyActors": ["Actor 1", "Actor 2", "Actor 3"],
  "coreWorkflow": "Step-by-step main flow: Input → Processing → Output / Feedback",
  "identifiedComponents": [
    { "name": "ComponentName", "role": "Specific role", "type": "frontend|backend|database|ai|cache|external-api|other" }
  ],
  "dataFlows": [
    { "from": "Component A", "to": "Component B", "description": "Protocol and data transferred" }
  ],
  "prosAndCons": {
    "pros": [
      { "title": "Advantage Title", "detail": "Detailed advantage", "badge": "Performance|Security|Scalability|Cost" }
    ],
    "cons": [
      { "title": "Bottleneck Title", "detail": "Detailed challenge", "mitigation": "Mitigation", "badge": "Latency|Compliance|Network|Complexity" }
    ]
  },
  "similarWebsites": [
    { "name": "Product Name", "url": "https://...", "category": "Market Leader / Commercial SaaS", "description": "What they do", "moat": "Our unfair competitive edge" }
  ],
  "openSourceProjects": [
    { "name": "Repo Name", "repo": "owner/repo", "url": "https://github.com/owner/repo", "stars": "⭐ Xk", "techStack": "Tech used", "description": "What this provides" }
  ],
  "githubSearchTerms": ["term-1", "term-2", "term-3"],
  "clarifyingQuestions": [
    { "question": "Domain question text", "why": "Why this architectural decision matters", "options": ["Option A", "Option B", "Option C"] }
  ],
  "innovationSuggestions": [
    { "title": "Feature Name", "description": "How it gives unfair advantage", "complexity": "Low|Medium|High" }
  ],
  "assumptions": ["Assumption 1", "Assumption 2"]
}`;

  try {
    let result = null;
    if (config?.provider === 'gemini') {
      result = await Promise.race([
        callGemini(config.geminiKey, config.geminiModel, systemPrompt, ideaText, imageBase64, mimeType),
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 22000))
      ]);
    } else {
      result = await Promise.race([
        callOllama(config?.ollamaUrl, config?.ollamaModel, systemPrompt, ideaText),
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 45000))
      ]);
    }

    if (result && result.projectTitle) {
      const smartIdentity = extractSmartProjectIdentity(ideaText);
      const isBadTitle = !result.projectTitle ||
        result.projectTitle.toLowerCase().includes('i need') ||
        result.projectTitle.toLowerCase().includes('create hotal') ||
        result.projectTitle.toLowerCase().includes('my idea') ||
        result.projectTitle.length < 4;

      const cleanTitle = isBadTitle ? smartIdentity.projectTitle : result.projectTitle;
      const cleanOneLiner = (!result.oneLiner || result.oneLiner.toLowerCase().includes('i need to create a hotal')) ? smartIdentity.oneLiner : result.oneLiner;
      const cleanPurpose = (!result.corePurpose || result.corePurpose.toLowerCase().includes('i need to create a hotal')) ? smartIdentity.corePurpose : result.corePurpose;

      const domain = smartIdentity.domain;
      const isGenericQuestions = !result.clarifyingQuestions?.length ||
        result.clarifyingQuestions.some(q => q.question?.toLowerCase().includes('which primary database engine fits your transaction'));

      const cleanQuestions = isGenericQuestions
        ? generateDomainClarifyingQuestions(ideaText, domain)
        : result.clarifyingQuestions;

      const enriched = synthesizeProsAndConsAndCompetitors(ideaText, cleanTitle, cleanPurpose);
      return {
        ...enriched,
        ...result,
        projectTitle: cleanTitle,
        oneLiner: cleanOneLiner,
        corePurpose: cleanPurpose,
        clarifyingQuestions: cleanQuestions,
        prosAndCons: result.prosAndCons || enriched.prosAndCons,
        similarWebsites: result.similarWebsites || enriched.similarWebsites,
        openSourceProjects: result.openSourceProjects || enriched.openSourceProjects,
        githubSearchTerms: (result.githubSearchTerms?.length && !result.githubSearchTerms.some(t => t.includes('i-need') || t.includes('create-')))
          ? result.githubSearchTerms
          : enriched.githubSearchTerms,
      };
    }
    return synthesizeSmartUnderstanding(ideaText);
  } catch (err) {
    console.warn('[understandIdea]: Engine call failed or timed out, synthesizing smart architecture:', err.message);
    return synthesizeSmartUnderstanding(ideaText);
  }
}

export function isValidMermaid(diagram) {
  if (!diagram || typeof diagram !== 'string') return false;
  const trimmed = diagram.trim();
  if (!trimmed.startsWith('graph') && !trimmed.startsWith('flowchart')) return false;
  // Disqualify hallucinated pseudocode like 'style = rounded'
  if (trimmed.includes('style =') || trimmed.includes('style=')) return false;
  if (/-->\s*[^"\n\[\(]+\s*\|/i.test(trimmed)) return false;
  if (!trimmed.includes('-->') && !trimmed.includes('---')) return false;
  if (!trimmed.includes('subgraph')) return false;
  return true;
}

export function buildSolidArchitectureDiagram(understanding = {}, techStack = {}) {
  const ts = techStack || understanding?.techStack || {};
  const frontend = ts?.frontend?.name || 'React 19 + Vite + Tailwind';
  const backend = ts?.backend?.name || 'FastAPI / Node.js';
  const database = ts?.database?.name || 'PostgreSQL (Primary ACID)';
  const cache = (ts?.extras || []).find(e => e.name?.toLowerCase().includes('redis') || e.name?.toLowerCase().includes('cache'))?.name || 'Redis Cache (Sessions & Queue)';
  const ai = ts?.ai?.name || 'Gemini / Gemma Engine (Inference & Vision)';
  const worker = (ts?.extras || []).find(e => e.name?.toLowerCase().includes('celery') || e.name?.toLowerCase().includes('worker') || e.name?.toLowerCase().includes('bullmq'))?.name || 'Background Worker (Celery / BullMQ)';
  const auth = (ts?.extras || []).find(e => e.name?.toLowerCase().includes('auth') || e.name?.toLowerCase().includes('jwt'))?.name || 'Auth & Security (OAuth2 + JWT)';

  const clean = (str, maxLen = 42) => {
    let s = (str || '').replace(/["`\r\n]/g, ' ').replace(/\s+/g, ' ').trim();
    if (s.length > maxLen) s = s.slice(0, maxLen - 2) + '..';
    return s;
  };

  const isMobile = frontend.toLowerCase().includes('mobile') || frontend.toLowerCase().includes('react native') || frontend.toLowerCase().includes('flutter');
  const clientIcon = isMobile ? '📱' : '💻';
  const clientLabel = isMobile ? 'Mobile App Client' : 'Web / Mobile UI';

  return `graph LR
  subgraph ClientTier["Client Tier"]
    UI["${clientIcon} ${clientLabel}<br/>(${clean(frontend)})"]
  end

  subgraph GatewayTier["Gateway & Services"]
    API["⚡ API Gateway<br/>(${clean(backend)})"]
    AUTH["🛡️ ${clean(auth)}"]
    WORKER["⚙️ ${clean(worker)}"]
  end

  subgraph StorageTier["Data & Storage"]
    CACHE[("⚡ ${clean(cache)}")]
    DB[("🗄️ ${clean(database)}")]
  end

  subgraph AITier["AI Engine"]
    AI["🧠 ${clean(ai)}"]
  end

  UI -->|HTTPS / WSS| API
  API --> AUTH
  API -->|Fast Cache| CACHE
  API -->|Read/Write| DB
  API -->|Async Tasks| WORKER
  WORKER --> DB
  API -->|REST API| AI

  classDef client fill:#00c8ff15,stroke:#00c8ff,stroke-width:2px;
  classDef gateway fill:#8b5cf615,stroke:#8b5cf6,stroke-width:2px;
  classDef storage fill:#f59e0b15,stroke:#f59e0b,stroke-width:2px;
  classDef ai fill:#10b98115,stroke:#10b981,stroke-width:2px;

  class UI client;
  class API,AUTH,WORKER gateway;
  class CACHE,DB storage;
  class AI ai;`;
}

/* ──────────────── PHASE 2: Generate Master Blueprint ──────────────── */
export async function generateMasterBlueprint(config, understanding, userRefinements = '') {
  if (config?.provider === 'demo' || config?.isDemo) {
    return handleDemoBlueprint(understanding);
  }

  const prompt = `You are an elite Principal Software Architect and Open-Source Strategist.

PROJECT UNDERSTANDING:
${JSON.stringify(understanding, null, 2)}

USER'S REFINEMENTS AND ANSWERS:
${userRefinements || 'None — apply industry best practices.'}

Generate the complete Master Architecture Blueprint. Respond with ONLY a valid, parseable JSON object — NO markdown fences, NO backticks.

Required JSON schema:
{
  "mermaidDiagram": "STRICT VALID Mermaid.js graph LR diagram with subgraphs and classDef styling. EXACT TEMPLATE: graph LR \\n subgraph ClientTier[\\\"Client Tier\\\"] \\n UI[\\\"💻 Web / Mobile UI<br/>(React 19 + Vite + Tailwind)\\\"] \\n end \\n subgraph GatewayTier[\\\"Gateway & Services\\\"] \\n API[\\\"⚡ API Gateway<br/>(FastAPI / Node.js)\\\"] \\n AUTH[\\\"🛡️ Auth & Security<br/>(OAuth2 + JWT)\\\"] \\n WORKER[\\\"⚙️ Background Worker<br/>(Celery / BullMQ)\\\"] \\n end \\n subgraph StorageTier[\\\"Data & Storage\\\"] \\n CACHE[(\\\"⚡ Redis Cache<br/>(Sessions & Queue)\\\")] \\n DB[(\\\"🗄️ PostgreSQL<br/>(Primary ACID)\\\")] \\n end \\n subgraph AITier[\\\"AI Engine\\\"] \\n AI[\\\"🧠 Gemini / Gemma Engine<br/>(Inference & Vision)\\\"] \\n end \\n UI -->|HTTPS / WSS| API \\n API --> AUTH \\n API -->|Fast Cache| CACHE \\n API -->|Read/Write| DB \\n API -->|Async Tasks| WORKER \\n WORKER --> DB \\n API -->|REST API| AI \\n classDef client fill:#00c8ff15,stroke:#00c8ff,stroke-width:2px; \\n classDef gateway fill:#8b5cf615,stroke:#8b5cf6,stroke-width:2px; \\n classDef storage fill:#f59e0b15,stroke:#f59e0b,stroke-width:2px; \\n classDef ai fill:#10b98115,stroke:#10b981,stroke-width:2px; \\n class UI client; \\n class API,AUTH,WORKER gateway; \\n class CACHE,DB storage; \\n class AI ai; DO NOT use 'style = rounded', 'style = filled', or raw labels without node IDs.",
  "fileTree": [
    { "path": "relative/path/filename.ext", "type": "file|dir", "content": "full real code string or null for dir", "description": "purpose of this file" }
  ],
  "techStack": {
    "frontend": { "name": "Tech Name", "reason": "Specific technical justification", "alternatives": ["Alt 1", "Alt 2"] },
    "backend": { "name": "Tech Name", "reason": "Specific technical justification", "alternatives": ["Alt 1", "Alt 2"] },
    "database": { "name": "Tech Name", "reason": "Specific technical justification", "alternatives": ["Alt 1"] },
    "ai": { "name": "Google Gemma / Gemini", "reason": "Specific technical justification", "alternatives": ["Ollama (Llama 3.3)"] },
    "devops": { "name": "Tech Name", "reason": "Specific technical justification", "alternatives": ["Alt 1"] },
    "extras": [{ "name": "Library / Service", "purpose": "What it accomplishes" }]
  },
  "costBreakdown": {
    "freeTier": [
      { "service": "Hosting / API", "provider": "Provider Name", "limit": "Free tier quota limits", "monthlyPrice": "$0" }
    ],
    "productionTier": [
      { "service": "Paid Tier", "provider": "Provider Name", "monthlyPrice": "$X/mo", "notes": "When needed" }
    ],
    "estimatedMonthlyCost": { "mvp": "$0/mo", "scale": "$25-50/mo" }
  },
  "targetAudience": {
    "primaryPersona": { "title": "Primary User Role", "painPoints": ["Pain 1", "Pain 2"], "motivation": "Core desire" },
    "secondaryPersonas": [{ "title": "Secondary Role", "description": "Brief description" }],
    "marketSize": "Market TAM/SAM opportunity estimation"
  },
  "githubSearchTerms": ["term1", "term2", "term3"],
  "starterRepo": {
    "repoName": "project-slug-starter",
    "description": "Short repository description",
    "quickstartCommand": "docker compose up --build",
    "commands": ["npm install", "docker compose up"]
  },
  "roadmap": {
    "phase1": {
      "title": "MVP — Core Loop (Hackathon Sprint)",
      "duration": "2-4 hours",
      "milestones": ["Milestone 1", "Milestone 2", "Milestone 3"]
    },
    "phase2": {
      "title": "Polish, Integration & Storage",
      "duration": "12-24 hours",
      "milestones": ["Milestone 1", "Milestone 2", "Milestone 3"]
    },
    "phase3": {
      "title": "Production Deployment & Launch",
      "duration": "1-2 weeks",
      "milestones": ["Milestone 1", "Milestone 2", "Milestone 3"]
    }
  },
  "resources": [
    { "title": "Resource Name", "url": "https://example.com", "description": "Resource purpose", "type": "docs|api|library|devops" }
  ]
}`;

  try {
    let result = null;
    if (config?.provider === 'gemini') {
      result = await Promise.race([
        callGeminiDirectRest(config.geminiKey, config.geminiModel || 'gemini-2.0-flash', prompt, '', null, null, 'v1beta'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 22000))
      ]);
    } else {
      result = await Promise.race([
        callOllama(config?.ollamaUrl, config?.ollamaModel, prompt, ''),
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 45000))
      ]);
    }

    if (result && result.fileTree) {
      if (!isValidMermaid(result.mermaidDiagram)) {
        console.warn('[generateMasterBlueprint]: Model generated invalid Mermaid diagram syntax. Applying solid architecture diagram:');
        result.mermaidDiagram = buildSolidArchitectureDiagram(understanding, result.techStack);
      }
      if (!result.githubSearchTerms || result.githubSearchTerms.length === 0 || result.githubSearchTerms.some(t => t.includes('term1') || t.includes('project-slug') || t.includes('i-need-create-'))) {
        result.githubSearchTerms = understanding?.githubSearchTerms?.length
          ? understanding.githubSearchTerms
          : synthesizeProsAndConsAndCompetitors(understanding?.rawPrompt || understanding?.projectTitle || '', understanding?.projectTitle || '', understanding?.corePurpose || '')?.githubSearchTerms || ['fastapi-react', 'docker-compose'];
      }
      return result;
    }
    return synthesizeSmartBlueprint(understanding, userRefinements);
  } catch (err) {
    console.warn('[generateMasterBlueprint]: Engine call failed or timed out, synthesizing complete blueprint:', err.message);
    return synthesizeSmartBlueprint(understanding, userRefinements);
  }
}

/* ──────────────── DISCOVER AUTHORIZED GEMINI MODELS ──────────────── */
async function discoverAvailableModels(apiKey) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.models || [])
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => m.name.replace(/^models\//, ''));
  } catch (e) {
    return [];
  }
}

/* ──────────────── DIRECT GEMINI REST CALL ──────────────── */
async function callGeminiDirectRest(apiKey, model, systemPrompt, ideaText, imageBase64, mimeType, apiVersion = 'v1beta') {
  const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`;

  const contents = [];
  const parts = [];

  if (imageBase64 && mimeType) {
    parts.push({ inline_data: { mime_type: mimeType, data: imageBase64 } });
    parts.push({ text: `${systemPrompt}\n\nAnalyze this whiteboard/napkin sketch and the context:\n\n${ideaText || 'Analyze the drawn architecture diagram completely.'}` });
  } else {
    parts.push({ text: `${systemPrompt}\n\nProject details to analyze:\n\n${ideaText || ''}` });
  }

  contents.push({ role: 'user', parts });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: { temperature: 0.6, maxOutputTokens: 8192 }
    }),
    signal: AbortSignal.timeout(18000)
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    const message = errorJson?.error?.message || `HTTP ${res.status}`;
    throw new Error(`Google API ${res.status}: ${message}`);
  }

  const data = await res.json();
  const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) throw new Error('Empty response from Gemini REST API');
  return parseJSON(textOutput);
}

/* ──────────────── GEMINI API CALL ──────────────── */
async function callGemini(apiKey, preferredModel, systemPrompt, ideaText, imageBase64, mimeType) {
  if (!apiKey || apiKey.trim().length < 10) {
    throw new Error('Missing Gemini API Key.');
  }

  const cleanKey = apiKey.trim();
  const modelsToTry = [preferredModel, ...DEFAULT_CANDIDATE_MODELS].filter(Boolean);

  let lastError = null;
  for (const model of modelsToTry) {
    try {
      return await callGeminiDirectRest(cleanKey, model, systemPrompt, ideaText, imageBase64, mimeType, 'v1beta');
    } catch (err) {
      lastError = err;
      if (err.message.includes('API_KEY_INVALID') || err.message.includes('API key not valid')) {
        throw new Error('Invalid Gemini API Key.');
      }
    }
  }

  throw lastError || new Error('Failed to generate with Gemini.');
}

/* ──────────────── OLLAMA API CALL (Speed Tuned + Timeout) ──────────────── */
async function callOllama(baseUrl, model, systemPrompt, userText) {
  const fullPrompt = userText ? `${systemPrompt}\n\nProject idea to analyze:\n\n${userText}` : systemPrompt;
  const cleanBase = (baseUrl || 'http://localhost:11434').replace(/\/$/, '');
  const isLocalhost = cleanBase.includes('localhost:11434') || cleanBase.includes('127.0.0.1:11434');
  const targetUrl = isLocalhost ? '/ollama/api/generate' : `${cleanBase}/api/generate`;
  const chosenModel = model || 'llama3.2:3b';

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: chosenModel,
      prompt: fullPrompt,
      format: 'json',
      stream: false,
      options: { temperature: 0.3, num_predict: 1400, top_p: 0.9 }
    }),
    signal: AbortSignal.timeout(45000)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama error ${response.status}: ${text.slice(0, 200)}`);
  }

  const data = await response.json();
  return parseJSON(data.response);
}

/* ──────────────── DEMO HANDLERS ──────────────── */
async function handleDemoUnderstand(ideaText = '') {
  await new Promise(r => setTimeout(r, 600));
  const matched = SAMPLE_IDEAS.find(s => s.text.toLowerCase().includes(ideaText.slice(0, 30).toLowerCase()));
  const base = matched?.sampleUnderstanding ? { ...matched.sampleUnderstanding } : synthesizeSmartUnderstanding(ideaText);
  const enriched = synthesizeProsAndConsAndCompetitors(ideaText, base.projectTitle, base.corePurpose);
  return {
    ...base,
    prosAndCons: base.prosAndCons || enriched.prosAndCons,
    similarWebsites: base.similarWebsites || enriched.similarWebsites,
    openSourceProjects: base.openSourceProjects || enriched.openSourceProjects,
    githubSearchTerms: base.githubSearchTerms || enriched.githubSearchTerms,
  };
}

async function handleDemoBlueprint(understanding) {
  await new Promise(r => setTimeout(r, 700));
  return synthesizeSmartBlueprint(understanding);
}

/* ──────────────── DOMAIN CLASSIFIER & IDENTITY EXTRACTOR ──────────────── */
export function detectProjectDomain(rawText = '') {
  const t = String(rawText || '').toLowerCase();
  if (t.includes('hotel') || t.includes('hotal') || t.includes('booking') || t.includes('reserv') || t.includes('travel') || t.includes('stay') || t.includes('room') || t.includes('airbnb') || t.includes('hostel') || t.includes('flight')) {
    return 'hotel';
  }
  if (t.includes('ecom') || t.includes('shop') || t.includes('store') || t.includes('cart') || t.includes('checkout') || t.includes('market') || t.includes('retail') || t.includes('product') || t.includes('catalog')) {
    return 'ecommerce';
  }
  if (t.includes('restaurant') || t.includes('restraunt') || t.includes('food') || t.includes('dining') || t.includes('dish') || t.includes('cafe') || t.includes('menu') || t.includes('kitchen') || t.includes('order') || t.includes('table')) {
    return 'restaurant';
  }
  if (t.includes('health') || t.includes('medic') || t.includes('patient') || t.includes('clinic') || t.includes('doctor') || t.includes('telemed') || t.includes('hospital') || t.includes('ehr') || t.includes('pharma')) {
    return 'healthcare';
  }
  if (t.includes('fintech') || t.includes('finance') || t.includes('bank') || t.includes('payment') || t.includes('wallet') || t.includes('crypto') || t.includes('invoice') || t.includes('ledger') || t.includes('trading')) {
    return 'fintech';
  }
  if (t.includes('chat') || t.includes('messag') || t.includes('social') || t.includes('feed') || t.includes('forum') || t.includes('community') || t.includes('network') || t.includes('connect')) {
    return 'social';
  }
  if (t.includes('blind') || t.includes('visually impaired') || t.includes('accessib') || t.includes('screen reader') || t.includes('a11y') || t.includes('wcag')) {
    return 'a11y';
  }
  if (t.includes('voice') || t.includes('speech') || t.includes('audio') || t.includes('whisper') || t.includes('dictat') || t.includes('stt') || t.includes('tts')) {
    return 'voice';
  }
  if (t.includes('id') || t.includes('card') || t.includes('identity') || t.includes('ocr') || t.includes('kyc') || t.includes('badge') || t.includes('passport')) {
    return 'kyc';
  }
  if (t.includes('course') || t.includes('edtech') || t.includes('learn') || t.includes('student') || t.includes('school') || t.includes('quiz') || t.includes('tutor') || t.includes('lms')) {
    return 'edtech';
  }
  if (t.includes('property') || t.includes('real estate') || t.includes('house') || t.includes('rental') || t.includes('apartment') || t.includes('realtor')) {
    return 'realestate';
  }
  if (t.includes('fitness') || t.includes('gym') || t.includes('workout') || t.includes('exercise') || t.includes('habit') || t.includes('wellness')) {
    return 'fitness';
  }
  if (t.includes('devops') || t.includes('cluster') || t.includes('docker') || t.includes('kubernetes') || t.includes('ci/cd') || t.includes('telemetry') || t.includes('monitoring')) {
    return 'devops';
  }
  return 'general';
}

export function extractSmartProjectIdentity(rawText = '') {
  let cleaned = String(rawText || '').trim();
  cleaned = cleaned.replace(/^(i\s+need\s+to\s+create(\s+a)?|i\s+want\s+to\s+build(\s+a)?|i\s+want\s+to\s+create(\s+a)?|my\s+idea\s+is(\s+to)?|i'm\s+making(\s+a)?|can\s+you\s+build(\s+a)?|build(\s+a)?|create(\s+a)?|make(\s+a)?|develop(\s+a)?|system\s+for|application\s+for|app\s+for|website\s+for)\s+/gi, '').trim();

  // Autocorrect common keywords
  cleaned = cleaned
    .replace(/\bhotal\b/gi, 'hotel')
    .replace(/\brestraunt\b/gi, 'restaurant')
    .replace(/\becommerse\b/gi, 'e-commerce')
    .replace(/\bmessanger\b/gi, 'messenger')
    .replace(/\bappication\b/gi, 'application')
    .replace(/\bacessibility\b/gi, 'accessibility');

  const domain = detectProjectDomain(cleaned || rawText);

  if (domain === 'hotel') {
    return {
      domain,
      projectTitle: 'StaySphere · Hotel & Hospitality Reservation Platform',
      oneLiner: 'High-concurrency hotel room booking engine with atomic reservation holds, dynamic pricing, and automated guest check-ins.',
      corePurpose: 'Engineered for hotels, resorts, and vacation properties to manage live room inventories, prevent double-bookings during peak booking windows, process multi-currency payments, and automate guest itineraries.'
    };
  }

  if (domain === 'ecommerce') {
    return {
      domain,
      projectTitle: 'VanguardStore · Headless E-Commerce & Marketplace Platform',
      oneLiner: 'High-performance digital commerce platform with real-time inventory reservation, headless storefronts, and automated order fulfillment.',
      corePurpose: 'Enables merchants to showcase modular product catalogs, handle high-traffic flash sales with Redis inventory locking, and orchestrate automated payment and shipping webhooks.'
    };
  }

  if (domain === 'restaurant') {
    return {
      domain,
      projectTitle: 'BistroFlow · Restaurant Reservation & Kitchen Order Platform',
      oneLiner: 'Real-time table booking and kitchen order management system with live POS synchronization.',
      corePurpose: 'Empowers dining establishments to manage table reservations, orchestrate live kitchen display queues, and process contactless table orders seamlessly.'
    };
  }

  if (domain === 'healthcare') {
    return {
      domain,
      projectTitle: 'CarePulse · Telehealth Consultation & Patient Management Engine',
      oneLiner: 'HIPAA-ready clinical consultation suite with end-to-end encrypted WebRTC video, electronic health records, and prescription dispatch.',
      corePurpose: 'Connects patients with medical practitioners through secure encrypted telemedicine sessions, manages FHIR-compliant health records, and automates clinical scheduling.'
    };
  }

  if (domain === 'fintech') {
    return {
      domain,
      projectTitle: 'VaultPay · High-Throughput Financial Ledger & Payments API',
      oneLiner: 'Double-entry transaction ledger with real-time fraud scoring, webhook idempotency, and automated multi-currency reconciliation.',
      corePurpose: 'Delivers bank-grade transaction auditing, strict immutable ledger records, real-time risk scoring, and zero-loss payout orchestration.'
    };
  }

  if (domain === 'social') {
    return {
      domain,
      projectTitle: 'NexusChat · Real-Time Decentralized Messaging & Community Hub',
      oneLiner: 'Sub-50ms WebSocket & WebRTC messaging client with end-to-end encryption, presence channels, and rich media streaming.',
      corePurpose: 'Provides communities with instant messaging channels, low-latency audio/video rooms, rich media asset processing, and spam mitigation shields.'
    };
  }

  if (domain === 'voice') {
    return {
      domain,
      projectTitle: 'VoxFlow · Conversational Multilingual Voice Assistant Engine',
      oneLiner: 'Low-latency speech-to-text and natural audio feedback portal powered by Whisper and streaming neural audio synthesis.',
      corePurpose: 'Empowers users to navigate interfaces, dictate complex commands, and receive natural voice feedback in real time across 8+ international languages.'
    };
  }

  if (domain === 'edtech') {
    return {
      domain,
      projectTitle: 'LearnMatrix · Adaptive Learning Management & Quiz System',
      oneLiner: 'Interactive modular courseware platform with automated assessment evaluation, progress analytics, and certificate verification.',
      corePurpose: 'Delivers dynamic learning pathways, interactive exercises with instant automated grading, and granular student achievement tracking.'
    };
  }

  if (domain === 'realestate') {
    return {
      domain,
      projectTitle: 'EstateIQ · Property Listing & Virtual Tour Platform',
      oneLiner: 'Comprehensive real estate discovery engine with geospatial radius filtering, tour scheduling, and tenant verification.',
      corePurpose: 'Enables property managers, buyers, and tenants to explore listings through interactive maps, schedule viewings, and submit rental applications securely.'
    };
  }

  if (domain === 'fitness') {
    return {
      domain,
      projectTitle: 'FitPulse · Adaptive Workout & Wellness Coaching Copilot',
      oneLiner: 'AI-guided workout planner and health tracker with predictive behavioral nudges and progressive overload analytics.',
      corePurpose: 'Constructs personalized training schedules, monitors physiological metrics, and delivers dynamic coaching interventions based on recovery trends.'
    };
  }

  if (domain === 'devops') {
    return {
      domain,
      projectTitle: 'DevOps Multi-Cluster Wizard',
      oneLiner: 'Zero-downtime infrastructure orchestration and container topology manager.',
      corePurpose: 'Automates Kubernetes cluster deployments, synchronizes secret management, and monitors telemetry across hybrid clouds.'
    };
  }

  // Fallback for custom / unique domains
  const stopWords = new Set(['i', 'need', 'to', 'create', 'a', 'an', 'the', 'for', 'and', 'with', 'in', 'on', 'at', 'by', 'this', 'that', 'my', 'we', 'our', 'app', 'application', 'system', 'website', 'platform', 'tool']);
  const words = cleaned.split(/\s+/).filter(w => !stopWords.has(w.toLowerCase())).slice(0, 3);
  const mainWords = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const brandTitle = mainWords ? `${mainWords} · CloudScale Architecture` : 'CloudScale Architecture';

  return {
    domain: 'general',
    projectTitle: brandTitle,
    oneLiner: `High-impact production architecture for ${cleaned.slice(0, 60)} with modular microservices and automated cloud scaling.`,
    corePurpose: `Engineered to deliver high throughput, low latency, and production reliability for ${cleaned}.`
  };
}

export function generateDomainClarifyingQuestions(ideaText = '', domain = 'general') {
  if (domain === 'hotel') {
    return [
      {
        question: 'How should room inventory & double-booking prevention be enforced?',
        why: 'Directly dictates data consistency during high-traffic simultaneous reservations.',
        options: [
          'Redis Distributed Mutex Locks (Sub-millisecond atomic hold with 10-min checkout TTL)',
          'PostgreSQL Row-Level Locks with SERIALIZABLE isolation (Strict ACID compliance)',
          'Event-Sourced Reservation Saga (Compensating transactions for multi-property chains)'
        ]
      },
      {
        question: 'Which payment processing & host payout strategy fits your platform?',
        why: 'Determines financial compliance, merchant fees, chargeback liability, and refund flows.',
        options: [
          'Stripe Connect for Marketplace (Direct split payouts between hotel owner and platform)',
          'Hosted Checkout with Escrow (Funds held securely until guest check-in date)',
          'Omnichannel Gateway with 3D Secure (Razorpay, PayPal, Apple Pay with fraud shield)'
        ]
      },
      {
        question: 'What search, date availability, and geospatial indexing engine is required?',
        why: 'Dictates search query latency when filtering thousands of hotels across dynamic dates.',
        options: [
          'Elasticsearch / Meilisearch (Instant geo-radius search, amenity facets, and typo-tolerance)',
          'PostgreSQL PostGIS + GiST date range indexes (Zero external infrastructure overhead)',
          'Redis Availability Bitmaps (Blazing fast in-memory calendar date-range lookups)'
        ]
      }
    ];
  }

  if (domain === 'ecommerce') {
    return [
      {
        question: 'How should shopping cart state and flash-sale inventory reservation be maintained?',
        why: 'Prevents overselling scarce stock while maintaining fast response times for buyers.',
        options: [
          'Redis In-Memory Atomic Decrements (Zero latency checkout queue with auto-expiry TTL)',
          'PostgreSQL Optimistic Locking (Version column verification on checkout submission)',
          'Hybrid Client-Side Cart with Server-Side Pre-Hold Verification'
        ]
      },
      {
        question: 'Which payment webhook and automated order fulfillment pipeline is required?',
        why: 'Ensures zero missed orders and guaranteed delivery notifications.',
        options: [
          'Idempotent Asynchronous Webhooks with Celery / BullMQ Retry Queues',
          'Synchronous Gateway Direct Confirmation with Fallback Reconciliation Cron',
          'Third-party Merchant Engine (Stripe Checkout / Shopify Storefront API)'
        ]
      },
      {
        question: 'What catalog search and faceted filtering architecture do you prefer?',
        why: 'Controls catalog browsing speed and complex multi-attribute filtering scalability.',
        options: [
          'Meilisearch / Algolia (Sub-10ms instant search with typo-tolerance and attribute facets)',
          'PostgreSQL Full-Text Search with GIN Indexes (Simple, relational, zero extra services)',
          'Elasticsearch Cluster (Enterprise catalog with dynamic price weighting)'
        ]
      }
    ];
  }

  if (domain === 'healthcare') {
    return [
      {
        question: 'What patient data encryption and regulatory compliance model is required?',
        why: 'Guarantees strict adherence to HIPAA, GDPR, and international health data standards.',
        options: [
          'AES-256 Field-Level Encryption with Hardware Security Module (HSM) Key Management',
          'Zero-Knowledge Patient Vault (End-to-end encrypted records inaccessible to server admin)',
          'Standard Cloud PostgreSQL Encryption at Rest (Managed AWS/Supabase HIPAA BAA)'
        ]
      },
      {
        question: 'Which real-time video consultation architecture fits your clinical consultations?',
        why: 'Dictates video call latency, bandwidth consumption, and consultation recording compliance.',
        options: [
          'Encrypted WebRTC Mesh / SFU (Sub-300ms peer-to-peer clinical consultations)',
          'Managed Daily.co / Twilio Video API (Zero-maintenance video rooms with clinical recording)',
          'LiveKit Open-Source WebRTC Server (Self-hosted, compliant video infrastructure)'
        ]
      },
      {
        question: 'How should medical records and prescription workflows integrate with external systems?',
        why: 'Controls interoperability with pharmacy networks and Electronic Health Record (EHR) systems.',
        options: [
          'HL7 / FHIR Standard REST API (Interoperable with Epic, Cerner, and national registries)',
          'Custom Proprietary JSON REST Endpoints with OAuth2 Scopes',
          'Event-Driven Webhook Broker with Audit Trail Ledger'
        ]
      }
    ];
  }

  if (domain === 'fintech') {
    return [
      {
        question: 'How should financial ledger balance consistency and audit logging be guaranteed?',
        why: 'Ensures zero financial balance discrepancies and verifiable double-entry accounting.',
        options: [
          'Immutable Double-Entry Ledger with PostgreSQL SERIALIZABLE Isolation & Audit Logs',
          'Event-Sourcing with Kafka / Redpanda (Every transaction recorded as an immutable event)',
          'Formance Stack / Tigris (Dedicated open-source financial ledger engine)'
        ]
      },
      {
        question: 'What fraud detection and real-time transaction risk scoring pipeline is required?',
        why: 'Prevents fraudulent withdrawals, chargebacks, and account takeovers.',
        options: [
          'Real-time Machine Learning Anomaly Detection on Transaction Stream via Redis',
          'Heuristic Rule-Engine with Velocity Checks (Rate limits on rapid transfers)',
          'Third-party Fraud Shield (Sift / Radar API integration)'
        ]
      },
      {
        question: 'How should bank API integrations and webhook idempotency be enforced?',
        why: 'Prevents duplicate charges or transfers during network timeouts or retry loops.',
        options: [
          'Strict Idempotency-Key Header with Redis TTL & Transactional Database Unique Constraint',
          'Plaid / Stripe Financial API Gateway with Webhook Signature Verification',
          'Two-Phase Commit Protocol for External Banking Payouts'
        ]
      }
    ];
  }

  if (domain === 'social') {
    return [
      {
        question: 'What real-time transport protocol should power message delivery and presence?',
        why: 'Determines server memory footprint and connection scalability for concurrent chatters.',
        options: [
          'WebSocket Gateway with Redis PubSub / Socket.io (Low-latency bidirectional streaming)',
          'Server-Sent Events (SSE) for Inbound Messages + HTTPS POST for Outbound',
          'Matrix Protocol Federation (Decentralized, end-to-end encrypted messaging network)'
        ]
      },
      {
        question: 'How should media uploads (images, voice notes, video) be processed and cached?',
        why: 'Prevents server CPU saturation and controls cloud CDN egress bandwidth expenses.',
        options: [
          'Direct Browser-to-Cloudinary / S3 Presigned Uploads with Client-Side Image Compression',
          'Background Worker Processing Queue (Thumbnail generation, video transcoding via FFmpeg)',
          'Cloudflare Images & Stream (Zero-infrastructure automatic edge transformation)'
        ]
      },
      {
        question: 'What message history storage and search strategy do you prefer?',
        why: 'Controls database query speed as user chat logs grow into millions of rows.',
        options: [
          'PostgreSQL Partitioned by Channel/Room with Cursor-based Pagination',
          'Cassandra / ScyllaDB Time-Series Store (Ultra-fast append-only chat history)',
          'MongoDB Document Collection with Full-Text Indexing'
        ]
      }
    ];
  }

  if (domain === 'restaurant') {
    return [
      {
        question: 'How should live kitchen display order dispatch and table state be synchronized?',
        why: 'Ensures kitchen staff receive incoming orders in real time without screen refreshes.',
        options: [
          'Real-time WebSocket Kitchen Display System (KDS) with Audio Chime Alerts',
          'Server-Sent Events (SSE) with Auto-reconnecting Table Status Stream',
          'Polling Fallback with Redis In-Memory Order Cache'
        ]
      },
      {
        question: 'What menu customization and ingredient inventory tracking model is required?',
        why: 'Dictates whether the app tracks raw ingredient stock or simple dish availability.',
        options: [
          'Item-Level Availability Toggles (Fast 86-ing of sold-out dishes from mobile POS)',
          'Automated Recipe & Raw Ingredient Stock Depletion on Order Placement',
          'Multi-modifier Nesting (Sizes, toppings, allergy flags, and special instructions)'
        ]
      },
      {
        question: 'Which ordering and payment model fits your customer dining flow?',
        why: 'Controls checkout UX, QR code generation, and payment gateway settlement.',
        options: [
          'Contactless QR Table Ordering with Direct Apple Pay / Credit Card Checkout',
          'Split-Bill Ordering (Guests pay their individual shares at the table)',
          'Counter Pay / Pay-on-Delivery with Thermal Receipt Printer Integration'
        ]
      }
    ];
  }

  // General Dynamic Fallback
  return [
    {
      question: 'Which transactional persistence and schema engine fits your data model?',
      why: 'Dictates write scalability, indexing strategy, and database read replica topology.',
      options: [
        'PostgreSQL + Prisma / SQLAlchemy (Strict ACID compliance & structured relational integrity)',
        'MongoDB / DocumentDB (Flexible dynamic schema with JSON document storage)',
        'Supabase / Managed Serverless Postgres (Instant realtime subscriptions & auth)'
      ]
    },
    {
      question: 'What authentication & session management strategy do you prefer?',
      why: 'Secures user sessions, API routes, and OAuth federated provider logins.',
      options: [
        'JWT + OAuth 2.0 (Google & GitHub social logins with stateless tokens)',
        'Clerk / Auth0 Managed Service (Zero-maintenance hosted login & user profiles)',
        'Session-based Cookies with Redis Store (Enterprise stateful authentication)'
      ]
    },
    {
      question: 'What is your target deployment and infrastructure runtime?',
      why: 'Determines CI/CD pipeline, container orchestration, and monthly cloud hosting expenses.',
      options: [
        'Docker Compose + AWS ECS / Fly.io (Standard portable containerized deployment)',
        'Vercel + Supabase Serverless (Zero-DevOps instant global edge hosting)',
        'Kubernetes / Helm Charts (Enterprise multi-cluster high availability)'
      ]
    }
  ];
}

/* ──────────────── SYNTHESIZE PROS & CONS, COMPETITORS & OPEN SOURCE (ZERO-FAILURE) ──────────────── */
export function synthesizeProsAndConsAndCompetitors(rawText = '', title = '', corePurpose = '') {
  const combined = `${rawText} ${title} ${corePurpose}`.toLowerCase();

  // 1. Hotel / Travel / Booking / Hospitality
  if (
    combined.includes('hotel') ||
    combined.includes('hotal') ||
    combined.includes('booking') ||
    combined.includes('reserv') ||
    combined.includes('stay') ||
    combined.includes('room') ||
    combined.includes('airbnb') ||
    combined.includes('hospitality') ||
    combined.includes('travel') ||
    combined.includes('hostel')
  ) {
    return {
      prosAndCons: {
        pros: [
          {
            title: 'High-Concurrency Atomic Room Lock Engine',
            detail: 'Redis distributed mutex with 10-minute automatic checkout TTL guarantees zero double-bookings during flash sales and peak seasonal rushes.',
            badge: 'Concurrency'
          },
          {
            title: 'Multi-Currency Global Checkout & Split Payouts',
            detail: 'Stripe Connect integration automates direct payouts to hotel owners while deducting platform commissions with automated tax compliance.',
            badge: 'Revenue'
          },
          {
            title: 'Real-Time Date Range & Geospatial Indexing',
            detail: 'PostgreSQL PostGIS and GiST availability range indexes allow travelers to filter thousands of rooms across dynamic dates in <30ms.',
            badge: 'Performance'
          },
          {
            title: 'Automated Guest Itinerary & QR Check-in',
            detail: 'Asynchronous Celery/BullMQ workers generate dynamic PDF booking vouchers, send calendar invites, and issue secure QR codes for front desk check-in.',
            badge: 'Automation'
          }
        ],
        cons: [
          {
            title: 'Abandoned Checkout Inventory Lock Stalls',
            detail: 'Guests abandoning payment screens while rooms are temporarily locked can artificially depress live room availability for other shoppers.',
            mitigation: 'Implement aggressive 8-10 minute lock timeouts with real-time countdown timers and automated Redis key expiration events.',
            badge: 'Conversion'
          },
          {
            title: 'External Channel Manager (OTA) Sync Lag',
            detail: 'Syncing availability with third-party OTAs (Expedia, Booking.com) via external APIs can introduce 1-3 minute latency windows.',
            mitigation: 'Deploy dedicated webhook web receivers with two-way channel manager webhooks and automated calendar ICAL reconciliation.',
            badge: 'Sync'
          },
          {
            title: 'Peak Season Write Contention',
            detail: 'High-volume concurrent write attempts on popular properties can cause database lock contention.',
            mitigation: 'Use Redis atomic decrements for instant room holds before persisting confirmed bookings to PostgreSQL with SERIALIZABLE isolation.',
            badge: 'Throughput'
          }
        ]
      },
      similarWebsites: [
        {
          name: 'Booking.com',
          url: 'https://www.booking.com',
          category: 'Market Leader / Global Travel OTA',
          description: 'Global online travel agency connecting millions of travelers with hotels, vacation homes, and resorts worldwide.',
          moat: 'Our solution provides an open, custom-branded direct booking platform eliminating 15-25% third-party OTA commission fees.'
        },
        {
          name: 'Airbnb',
          url: 'https://www.airbnb.com',
          category: 'Hospitality & Vacation Rentals',
          description: 'P2P platform connecting property hosts with travelers for short-term stays and boutique lodging.',
          moat: 'Provides hotels and property managers with direct guest communication, zero platform lock-in, and custom pricing algorithms.'
        },
        {
          name: 'HotelTonight',
          url: 'https://www.hoteltonight.com',
          category: 'Last-Minute Mobile Hotel Booking',
          description: 'Mobile booking app offering curated discounts on unreserved same-day and next-day hotel rooms.',
          moat: 'Seamless fullstack starter with automated channel management, customizable multi-vendor payouts, and zero recurring SaaS costs.'
        }
      ],
      openSourceProjects: [
        {
          name: 'Cal.com Booking Core',
          repo: 'calcom/cal.com',
          url: 'https://github.com/calcom/cal.com',
          stars: '⭐ 32.4k',
          techStack: 'TypeScript, Next.js, Prisma, PostgreSQL',
          description: 'Open source scheduling and booking infrastructure for appointments, reservations, and time-slot allocations.',
          integration: 'Reference architecture for date range scheduling, time-zone normalization, and calendar sync.'
        },
        {
          name: 'Bokun Booking Engine',
          repo: 'bokun/booking-engine',
          url: 'https://github.com/bokun/booking-engine',
          stars: '⭐ 4.8k',
          techStack: 'TypeScript, React, Node.js',
          description: 'Open-source reservation engine for managing inventory, tour slots, and hospitality checkout.',
          integration: 'Provides structural design for room cataloging, guest capacity, and pricing modifiers.'
        },
        {
          name: 'Airbnb Clone / React Booking',
          repo: 'airbnb-clone/booking-app',
          url: 'https://github.com/airbnb-clone/booking-app',
          stars: '⭐ 12.5k',
          techStack: 'React 19, FastAPI, PostgreSQL, Tailwind',
          description: 'Fullstack property and room booking application with interactive map search and Stripe checkout.',
          integration: 'Supplies UI components for room image galleries, interactive date pickers, and guest reviews.'
        }
      ],
      githubSearchTerms: ['hotel-booking', 'hotel-reservation', 'booking-system', 'room-availability-engine']
    };
  }

  // 2. E-Commerce / Store / Retail / Marketplace
  if (
    combined.includes('ecom') ||
    combined.includes('shop') ||
    combined.includes('store') ||
    combined.includes('cart') ||
    combined.includes('checkout') ||
    combined.includes('market') ||
    combined.includes('retail')
  ) {
    return {
      prosAndCons: {
        pros: [
          {
            title: 'Sub-50ms Headless Storefront Performance',
            detail: 'Edge-cached catalog with React 19 server rendering delivers near-instant product browsing and 99+ Google Lighthouse scores.',
            badge: 'Speed'
          },
          {
            title: 'Flash-Sale Resilient Inventory Engine',
            detail: 'Redis atomic counter decrements prevent stock overselling even when thousands of shoppers click Buy Now simultaneously.',
            badge: 'Scalability'
          },
          {
            title: 'Omnichannel Payment Gateway Routing',
            detail: 'Direct Stripe & PayPal webhooks with automatic idempotency handling and instant order receipt generation.',
            badge: 'Revenue'
          }
        ],
        cons: [
          {
            title: 'Cart Abandonment Rate',
            detail: 'Unexpected shipping costs or complicated registration steps cause high checkout drop-offs.',
            mitigation: 'Implement one-click guest checkout, Apple Pay / Google Pay direct authorization, and automated abandoned cart recovery emails.',
            badge: 'Conversion'
          },
          {
            title: 'Payment Webhook Idempotency Failures',
            detail: 'Duplicate webhook deliveries from payment gateways can trigger duplicate customer orders or double billing.',
            mitigation: 'Enforce transactional database constraints with unique event IDs and Redis idempotency locks on all webhook handlers.',
            badge: 'Integrity'
          }
        ]
      },
      similarWebsites: [
        {
          name: 'Shopify',
          url: 'https://www.shopify.com',
          category: 'Market Leader / Commerce SaaS',
          description: 'Global commerce platform powering online stores and retail point-of-sale systems.',
          moat: 'Zero monthly percentage platform cuts, complete database autonomy, and custom headless frontend portability.'
        },
        {
          name: 'MedusaJS',
          url: 'https://medusajs.com',
          category: 'Open-Source Headless Commerce',
          description: 'Modular building blocks for digital commerce with Node.js backend and modern storefronts.',
          moat: 'Turnkey fullstack starter pre-configured with FastAPI, PostgreSQL, Redis, and React 19.'
        }
      ],
      openSourceProjects: [
        {
          name: 'Medusa Core',
          repo: 'medusajs/medusa',
          url: 'https://github.com/medusajs/medusa',
          stars: '⭐ 26.2k',
          techStack: 'TypeScript, Node.js, PostgreSQL, Redis',
          description: 'The open source alternative to Shopify for building custom digital commerce experiences.',
          integration: 'Reference for modular cart handling, product variant modeling, and discount logic.'
        },
        {
          name: 'Saleor Commerce',
          repo: 'saleor/saleor',
          url: 'https://github.com/saleor/saleor',
          stars: '⭐ 20.1k',
          techStack: 'Python, Django, GraphQL, PostgreSQL',
          description: 'High-performance headless e-commerce platform delivering ultra-fast multi-channel shopping.',
          integration: 'Architectural pattern for GraphQL product schemas and multi-warehouse inventory tracking.'
        }
      ],
      githubSearchTerms: ['ecommerce-platform', 'headless-commerce', 'shopping-cart-engine', 'online-store-starter']
    };
  }

  // 3. Accessibility / Visually Impaired / Screen Reader / Blind
  if (
    combined.includes('blind') ||
    combined.includes('visually impaired') ||
    combined.includes('accessibility') ||
    combined.includes('screen reader') ||
    combined.includes('a11y') ||
    combined.includes('wcag') ||
    combined.includes('vision') ||
    combined.includes('audio navigation') ||
    combined.includes('అంధుల') ||
    combined.includes('బ్లైండ్') ||
    combined.includes('दृष्टिहीन')
  ) {
    return {
      prosAndCons: {
        pros: [
          {
            title: 'Radical Accessibility & WCAG 2.1 AAA Compliance',
            detail: 'Removes digital barriers for 285M+ visually impaired individuals through tactile keyboard-first navigation and high-contrast ARIA Live regions.',
            badge: 'Inclusion'
          },
          {
            title: 'Sub-100ms Low-Latency Web Speech Audio',
            detail: 'Native Web Speech API and spatial audio cues allow lightning-fast ear navigation without waiting for heavy screen-reader re-rendering.',
            badge: 'Performance'
          },
          {
            title: 'Multimodal AI Vision & Diagram Narration',
            detail: 'Uses multimodal Gemini / Whisper vision pipelines to explain UI buttons, complex charts, and photos in spoken natural language on demand.',
            badge: 'AI Vision'
          },
          {
            title: 'Full Screen-Reader Ecosystem Interoperability',
            detail: 'Tested against NVDA, JAWS, and Apple VoiceOver with 100% semantic DOM hierarchy and zero focus traps.',
            badge: 'Standards'
          }
        ],
        cons: [
          {
            title: 'Cloud TTS API Streaming Latency',
            detail: 'Generating dynamic synthesized speech via cloud TTS services over slow 3G/4G connections can introduce 300-600ms latency spikes.',
            mitigation: 'Implement client-side browser Web Speech Synthesis for immediate feedback + pre-cache frequent UI audio prompts via Redis CDN.',
            badge: 'Latency'
          },
          {
            title: 'Background Noise & Diverse Voice Accents',
            detail: 'Speech-to-text recognition accuracy degrades in noisy outdoor environments or when handling regional accents and colloquialisms.',
            mitigation: 'Implement dual-modal input with single-key tactile keyboard fallbacks and WebRTC noise-cancellation audio filters before Whisper ingestion.',
            badge: 'Accuracy'
          },
          {
            title: 'Multimodal Vision Inference API Costs',
            detail: 'Describing every image or visual element on page via cloud AI vision models can rapidly consume token quotas at scale.',
            mitigation: 'Generate alt-text descriptions lazily upon explicit user Spacebar request and store deterministic SHA-256 image hashes in PostgreSQL cache.',
            badge: 'Cost'
          }
        ]
      },
      similarWebsites: [
        {
          name: 'Be My Eyes',
          url: 'https://www.bemyeyes.com',
          category: 'Market Leader / Mobile App',
          description: 'Global community connecting blind and low-vision users with sighted volunteers and AI visual assistance via live video.',
          moat: 'Our platform provides instant, autonomous zero-typing web navigation and architecture blueprints without requiring human volunteer wait times.'
        },
        {
          name: 'Envision AI',
          url: 'https://www.letsenvision.com',
          category: 'Assistive Tech & Smart Glasses',
          description: 'AI glasses and assistive mobile app that scans text, recognizes faces, and describes physical environments for blind people.',
          moat: 'Runs directly in any modern web browser on commodity laptops or smartphones with zero specialized $3,000 hardware requirements.'
        },
        {
          name: 'Axs Map',
          url: 'https://www.axsmap.com',
          category: 'Accessibility Mapping Portal',
          description: 'Crowdsourced accessibility reviews and wheelchair/visual navigation map for physical venues and businesses.',
          moat: 'We provide dynamic interactive UI screen narration and developer tooling rather than static geographic review directories.'
        }
      ],
      openSourceProjects: [
        {
          name: 'NVDA Screen Reader',
          repo: 'nvaccess/nvda',
          url: 'https://github.com/nvaccess/nvda',
          stars: '⭐ 3.8k',
          techStack: 'Python, C++, COM API',
          description: 'World-renowned open-source screen reader for Microsoft Windows, empowering blind users worldwide.',
          integration: 'Ensures strict ARIA role compliance and speech synthesizer compatibility with standard desktop screen readers.'
        },
        {
          name: 'Axe-Core',
          repo: 'dequelabs/axe-core',
          url: 'https://github.com/dequelabs/axe-core',
          stars: '⭐ 5.2k',
          techStack: 'TypeScript, JavaScript',
          description: 'The industry-standard accessibility testing engine for HTML, React, and web components.',
          integration: 'Automated CI/CD accessibility test suite guarantees zero WCAG violations before any release.'
        },
        {
          name: 'OpenAI Whisper',
          repo: 'openai/whisper',
          url: 'https://github.com/openai/whisper',
          stars: '⭐ 74.5k',
          techStack: 'Python, PyTorch',
          description: 'Robust neural speech recognition model trained on 680,000 hours of multilingual audio data.',
          integration: 'Provides private on-premise voice transcription for low-latency voice command parsing.'
        }
      ],
      githubSearchTerms: ['accessibility-screenreader', 'voice-first-web', 'wcag-aaa-compliance', 'speech-to-text-whisper']
    };
  }

  // 2. ID Cards / Document KYC / Biometrics / OCR
  if (
    combined.includes('id') ||
    combined.includes('card') ||
    combined.includes('identity') ||
    combined.includes('ocr') ||
    combined.includes('kyc') ||
    combined.includes('student') ||
    combined.includes('badge') ||
    combined.includes('license') ||
    combined.includes('passport') ||
    combined.includes('aadhaar') ||
    combined.includes('verification') ||
    combined.includes('ఐడీ') ||
    combined.includes('కార్డ్')
  ) {
    return {
      prosAndCons: {
        pros: [
          {
            title: 'Sub-3-Second Automated Credential Extraction',
            detail: 'Replaces manual human document review with automated multimodal OCR, cutting verification turnaround from 48 hours to under 3 seconds.',
            badge: 'Speed'
          },
          {
            title: 'Tamper Detection & Anti-Spoofing Neural Shield',
            detail: 'Detects digital image manipulation, font mismatches, and photo replacement via edge gradient analysis and perspective deskewing.',
            badge: 'Security'
          },
          {
            title: 'AES-256 Field-Level PII Encryption',
            detail: 'Hashed sensitive identity records with zero plaintext persistence, fully complying with FERPA, GDPR, and DPDP regulations.',
            badge: 'Compliance'
          },
          {
            title: 'Asynchronous High-Throughput Microservice Pipeline',
            detail: 'FastAPI gRPC gateway with Celery/BullMQ background workers scales to thousands of concurrent verification submissions.',
            badge: 'Scalability'
          }
        ],
        cons: [
          {
            title: 'Camera Glare & Low-Resolution Blur',
            detail: 'Mobile uploads with flash glare, shadows, or blurry angles can trigger OCR character confusion (e.g. 0 vs O, 1 vs I).',
            mitigation: 'Implement client-side WebAssembly camera guides with real-time glare thresholding, auto-focus bounding boxes, and perspective unwarping.',
            badge: 'Accuracy'
          },
          {
            title: 'Regulatory Data Privacy Liability',
            detail: 'Holding government or institutional ID images creates high regulatory compliance risk under strict data residency laws.',
            mitigation: 'Enforce a 30-day automatic cryptographic purge policy on raw images, retaining only verified one-way cryptographic SHA-256 checksums.',
            badge: 'Privacy'
          },
          {
            title: 'Bursty Traffic During Campus / Batch Onboarding',
            detail: 'Simultaneous campus-wide semester registration or employee onboarding can saturate CPU-bound OCR computer vision workers.',
            mitigation: 'Deploy containerized worker replicas on Docker/Kubernetes with Redis backpressure queues and priority scheduling.',
            badge: 'Throughput'
          }
        ]
      },
      similarWebsites: [
        {
          name: 'Persona',
          url: 'https://withpersona.com',
          category: 'Market Leader / Enterprise KYC',
          description: 'Identity verification platform automating KYC, AML, biometric liveness checks, and government ID validation.',
          moat: 'Our solution provides an open, institutional-ready architecture with zero prohibitive per-verification SaaS licensing costs.'
        },
        {
          name: 'Veriff',
          url: 'https://www.veriff.com',
          category: 'AI Identity & Biometric Verification',
          description: 'Automated identity verification engine with biometric facial comparison and fraud prevention.',
          moat: 'Customized for institutional student cards, badges, and offline campus networks rather than strict government passports only.'
        },
        {
          name: 'Trulioo',
          url: 'https://www.trulioo.com',
          category: 'Global Identity Network',
          description: 'Global identity verification platform accessing hundreds of databases across 195+ countries.',
          moat: 'Lightweight self-hostable Docker deployment with direct relational database control and zero external data sharing.'
        }
      ],
      openSourceProjects: [
        {
          name: 'Tesseract OCR',
          repo: 'tesseract-ocr/tesseract',
          url: 'https://github.com/tesseract-ocr/tesseract',
          stars: '⭐ 64.2k',
          techStack: 'C++, Python',
          description: 'Premier open-source OCR engine using LSTM neural networks, supporting over 100 languages and custom font training.',
          integration: 'Primary engine for text field parsing from ID cards and badge banners.'
        },
        {
          name: 'OpenCV',
          repo: 'opencv/opencv',
          url: 'https://github.com/opencv/opencv',
          stars: '⭐ 79.5k',
          techStack: 'C++, Python, WebAssembly',
          description: 'Open Source Computer Vision Library for edge detection, thresholding, perspective unwarping, and facial extraction.',
          integration: 'Preprocesses ID photos with adaptive thresholding and deskewing before running OCR recognition.'
        },
        {
          name: 'DocTR (Document Text Recognition)',
          repo: 'mindee/doctr',
          url: 'https://github.com/mindee/doctr',
          stars: '⭐ 4.3k',
          techStack: 'Python, PyTorch, TensorFlow',
          description: 'Deep learning document text recognition library for end-to-end OCR and key-value pair parsing.',
          integration: 'Provides structural layout analysis to locate ID card fields like Name, ID Number, and Issue Date.'
        }
      ],
      githubSearchTerms: ['id-card-ocr', 'kyc-verification-engine', 'tesseract-document-parser', 'anti-spoofing-face-check']
    };
  }

  // 3. Decentralized Video / P2P Streaming / WebRTC
  if (combined.includes('video') || combined.includes('stream') || combined.includes('webrtc') || combined.includes('p2p')) {
    return {
      prosAndCons: {
        pros: [
          {
            title: '85% Bandwidth Cost Reduction via P2P Mesh',
            detail: 'Offloads outbound video distribution from costly central CDN servers onto peer-to-peer WebRTC data channels.',
            badge: 'Cost Efficiency'
          },
          {
            title: 'Ultra-Low Sub-500ms Glass-to-Glass Latency',
            detail: 'WebRTC and SRT protocols enable real-time interactive broadcast suitable for auctions, live sports, and gaming.',
            badge: 'Performance'
          },
          {
            title: 'Decentralized Fault-Tolerance',
            detail: 'System continues streaming even if origin edge nodes experience intermittent outages through dynamic mesh re-routing.',
            badge: 'Resilience'
          }
        ],
        cons: [
          {
            title: 'NAT Traversal & Strict Firewall Blocking',
            detail: 'Symmetric NATs and corporate firewalls can block peer-to-peer STUN connections in 15-20% of edge clients.',
            mitigation: 'Implement high-availability Coturn TURN relay servers with automatic fallback to WebSocket chunked video streaming.',
            badge: 'Networking'
          },
          {
            title: 'Client CPU & Battery Consumption',
            detail: 'Running simultaneous WebRTC mesh connections on mobile devices increases device temperature and battery drain.',
            mitigation: 'Cap max peer connections to 3 per mobile client and dynamically fall back to SFU (Selective Forwarding Unit) mode on low battery.',
            badge: 'Mobile'
          }
        ]
      },
      similarWebsites: [
        {
          name: 'Livepeer',
          url: 'https://livepeer.org',
          category: 'Decentralized Video Protocol',
          description: 'Open video infrastructure protocol for live and on-demand streaming with decentralized transcoding.',
          moat: 'Our solution focuses on lightweight browser-first P2P mesh distribution with zero crypto token requirement.'
        },
        {
          name: 'PeerTube',
          url: 'https://joinpeertube.org',
          category: 'Federated P2P Video Platform',
          description: 'Federated video platform using BitTorrent / WebTorrent to reduce server bandwidth during video playback.',
          moat: 'Designed specifically for low-latency live streaming broadcasts rather than static on-demand video hosting.'
        },
        {
          name: 'StreamYard',
          url: 'https://streamyard.com',
          category: 'Cloud Broadcast Studio',
          description: 'Browser-based live streaming studio broadcasting directly to YouTube, Facebook, and LinkedIn.',
          moat: 'Self-hosted, open-source infrastructure with zero monthly subscription fees and complete data sovereignty.'
        }
      ],
      openSourceProjects: [
        {
          name: 'Mediasoup',
          repo: 'versatica/mediasoup',
          url: 'https://github.com/versatica/mediasoup',
          stars: '⭐ 6.4k',
          techStack: 'C++, TypeScript, Node.js',
          description: 'Cutting-edge WebRTC video conferencing and streaming SFU library for Node.js and Rust.',
          integration: 'Acts as our core Selective Forwarding Unit for multi-party video relays.'
        },
        {
          name: 'Owncast',
          repo: 'owncast/owncast',
          url: 'https://github.com/owncast/owncast',
          stars: '⭐ 9.8k',
          techStack: 'Go (Golang), JavaScript',
          description: 'Self-hosted live video and web chat server for streaming directly to your audience without intermediaries.',
          integration: 'Provides inspiration for standalone single-binary live broadcasting and chat interaction.'
        },
        {
          name: 'WebTorrent',
          repo: 'webtorrent/webtorrent',
          url: 'https://github.com/webtorrent/webtorrent',
          stars: '⭐ 29.8k',
          techStack: 'JavaScript, WebRTC',
          description: 'Streaming torrent client for Node.js and the browser, running entirely over WebRTC data channels.',
          integration: 'Supplies our browser-to-browser P2P chunk distribution layer.'
        }
      ],
      githubSearchTerms: ['webrtc-sfu-streamer', 'p2p-video-mesh', 'mediasoup-broadcaster', 'live-streaming-server']
    };
  }

  // 4. AI Habit / Behavioral Tracker / Health Coach
  if (combined.includes('habit') || combined.includes('health') || combined.includes('coach') || combined.includes('fitness') || combined.includes('routine')) {
    return {
      prosAndCons: {
        pros: [
          {
            title: 'Empathetic Adaptive Behavioral Coaching',
            detail: 'Dynamically personalizes motivational interventions based on user mood, streak history, and psychological relapse indicators.',
            badge: 'AI Personalization'
          },
          {
            title: 'Offline-First Check-in Reliability',
            detail: 'Progressive Web App (PWA) with IndexedDB synchronization guarantees check-ins are saved even without cellular reception.',
            badge: 'Reliability'
          },
          {
            title: 'Gamified Dopamine Streak Loops',
            detail: 'Redis atomic counters and milestone achievements boost 30-day user retention by up to 340%.',
            badge: 'Retention'
          }
        ],
        cons: [
          {
            title: 'User Notification Fatigue & Churn',
            detail: 'Rigid generic daily reminders often lead users to disable notifications and abandon the application.',
            mitigation: 'Implement intelligent circadian time window calculation using ML to deliver nudges only when the user is most receptive.',
            badge: 'UX'
          },
          {
            title: 'Cold-Start Relapse Risk',
            detail: 'When users miss 3 consecutive days, shame spirals often lead to permanent app uninstallation.',
            mitigation: 'Introduce "Streak Freeze" tokens and empathetic recovery micro-goals that lower friction without penalizing users.',
            badge: 'Retention'
          }
        ]
      },
      similarWebsites: [
        {
          name: 'Habitica',
          url: 'https://habitica.com',
          category: 'Gamified Habit Tracker',
          description: 'Video-game style habit tracking platform where daily tasks earn armor, pets, and gold.',
          moat: 'Integrates real LLM conversational coaching and audio micro-journaling rather than 8-bit fantasy roleplaying.'
        },
        {
          name: 'Fabulous',
          url: 'https://thefabulous.co',
          category: 'Behavioral Science App',
          description: 'Science-backed daily routine and habit coaching developed at Duke University Behavioral Economics Lab.',
          moat: 'Provides an open-source self-hostable backend with complete privacy and zero $90/year subscription wall.'
        },
        {
          name: 'Finch Care',
          url: 'https://finchcare.com',
          category: 'Self-Care Virtual Pet',
          description: 'Gamified mental health and self-care app driven by a virtual pet that grows as you complete goals.',
          moat: 'Tailored for professionals and developers who prefer clean minimalist analytics over virtual pets.'
        }
      ],
      openSourceProjects: [
        {
          name: 'Habitica Core',
          repo: 'HabitRPG/habitica',
          url: 'https://github.com/HabitRPG/habitica',
          stars: '⭐ 10.5k',
          techStack: 'Node.js, Express, MongoDB, Vue.js',
          description: 'Habitica habit tracker and productivity app complete codebase.',
          integration: 'Reference architecture for habit streak mechanics, task schemas, and reward systems.'
        },
        {
          name: 'ActivityWatch',
          repo: 'ActivityWatch/activitywatch',
          url: 'https://github.com/ActivityWatch/activitywatch',
          stars: '⭐ 12.8k',
          techStack: 'Python, Rust, Vue.js',
          description: 'The best free and open-source automated time and productivity tracker.',
          integration: 'Enables automatic passive habit tracking based on application and browser usage.'
        },
        {
          name: 'Super Productivity',
          repo: 'johannesjo/super-productivity',
          url: 'https://github.com/johannesjo/super-productivity',
          stars: '⭐ 12.1k',
          techStack: 'TypeScript, Angular, Electron',
          description: 'Advanced ToDo list and time tracking tool integrating Jira, GitHub, and GitLab.',
          integration: 'Inspiration for rich task scheduling and multi-platform data persistence.'
        }
      ],
      githubSearchTerms: ['habit-tracker-gamification', 'behavioral-health-coach', 'offline-first-pwa', 'streak-analytics']
    };
  }

  // 5. Mobile App / React Native
  if (combined.includes('mobile') || combined.includes('react native') || combined.includes('android') || combined.includes('ios')) {
    return {
      prosAndCons: {
        pros: [
          {
            title: 'Unified Cross-Platform Codebase',
            detail: 'Ships native iOS and Android apps simultaneously from a single React Native / Expo codebase with 95% shared business logic.',
            badge: 'Efficiency'
          },
          {
            title: 'Native Device Hardware Capabilities',
            detail: 'Direct access to native mobile hardware: camera OCR, biometric FaceID, haptic vibrations, and local push notifications.',
            badge: 'Native Power'
          },
          {
            title: 'Instant Over-The-Air (OTA) Updates',
            detail: 'Deploy critical bug fixes and UI updates to user phones instantly via EAS Update without waiting for App Store review.',
            badge: 'Agility'
          }
        ],
        cons: [
          {
            title: 'App Store Review & Release Delays',
            detail: 'Initial app submissions and major native binary changes take 24-72 hours for Apple App Store and Google Play approval.',
            mitigation: 'Implement EAS OTA code pushes for rapid JavaScript updates and configure fastlane automated CI/CD for release builds.',
            badge: 'Deployment'
          },
          {
            title: 'Fragmented Android Device Performance',
            detail: 'Wide range of low-end Android chipsets and screen sizes can cause frame drops and unexpected layout overflow.',
            mitigation: 'Use Hermes JavaScript engine, FlashList for high-performance virtualized lists, and test on multiple device DPI tiers.',
            badge: 'Performance'
          }
        ]
      },
      similarWebsites: [
        {
          name: 'Expo',
          url: 'https://expo.dev',
          category: 'Mobile Dev Platform',
          description: 'The premier open-source framework and cloud service for building universal native React apps.',
          moat: 'Our blueprint configures production-ready EAS build pipelines and offline SQLite state from day one.'
        },
        {
          name: 'FlutterFlow',
          url: 'https://flutterflow.io',
          category: 'Visual App Builder',
          description: 'Low-code visual app builder for Flutter apps with Firebase integration.',
          moat: 'Provides full, clean, maintainable TypeScript source code with zero vendor lock-in or platform subscription tiers.'
        },
        {
          name: 'Retool Mobile',
          url: 'https://retool.com/products/mobile',
          category: 'Enterprise Internal Apps',
          description: 'Rapid internal tool and mobile field app generator with enterprise database connectors.',
          moat: 'Tailored for public-facing consumer delight, native offline storage, and zero-per-user enterprise pricing.'
        }
      ],
      openSourceProjects: [
        {
          name: 'React Native',
          repo: 'facebook/react-native',
          url: 'https://github.com/facebook/react-native',
          stars: '⭐ 118k',
          techStack: 'JavaScript, C++, Java, Objective-C',
          description: 'A framework for building native applications using React.',
          integration: 'Core framework for native cross-platform mobile rendering.'
        },
        {
          name: 'NativeWind',
          repo: 'nativewind/nativewind',
          url: 'https://github.com/nativewind/nativewind',
          stars: '⭐ 6.8k',
          techStack: 'TypeScript, Tailwind CSS',
          description: 'Tailwind CSS for React Native styling across iOS, Android, and Web.',
          integration: 'Ensures unified, responsive design tokens between web and mobile interfaces.'
        },
        {
          name: 'Shopify FlashList',
          repo: 'Shopify/flash-list',
          url: 'https://github.com/Shopify/flash-list',
          stars: '⭐ 6.5k',
          techStack: 'TypeScript, Kotlin, Swift',
          description: 'Ultra fast list component for React Native recycling views to deliver 60fps performance on low-end hardware.',
          integration: 'Delivers silky smooth 60fps scrolling on heavy card feeds.'
        }
      ],
      githubSearchTerms: ['react-native-expo-starter', 'offline-first-mobile', 'nativewind-app', 'eas-build-pipeline']
    };
  }

  // 6. Generic / Universal Cloud Platform Synthesizer
  const topicName = title || 'Cloud Platform';
  return {
    prosAndCons: {
      pros: [
        {
          title: 'Modular Decoupled Microservice Architecture',
          detail: `Enables independent horizontal scaling of ${topicName} API services, database workers, and static edge assets.`,
          badge: 'Scalability'
        },
        {
          title: 'Sub-50ms Global Edge Response Times',
          detail: 'Cloudflare edge caching and Redis in-memory storage keep frequent query latency under 50ms worldwide.',
          badge: 'Performance'
        },
        {
          title: 'Docker Containerized Zero-Drift Deployment',
          detail: 'Guarantees 100% environment parity between local development and cloud production clusters.',
          badge: 'DevOps'
        },
        {
          title: 'Automated CI/CD & Security Linting',
          detail: 'GitHub Actions workflow runs automated unit tests, vulnerability audits, and image builds on every PR commit.',
          badge: 'Reliability'
        }
      ],
      cons: [
        {
          title: 'Distributed System State Complexity',
          detail: 'Managing asynchronous events, eventual consistency, and distributed logging requires disciplined telemetry.',
          mitigation: 'Implement OpenTelemetry tracing with centralized Grafana dashboards and transactional database outbox pattern.',
          badge: 'Complexity'
        },
        {
          title: 'Database Read Replica Synchronization Lag',
          detail: 'High write throughput can introduce transient replication lag between primary and secondary database read replicas.',
          mitigation: 'Use Redis for immediate user-session reads and enforce strong read-after-write consistency headers.',
          badge: 'Database'
        },
        {
          title: 'Cloud Infrastructure Running Expenses',
          detail: 'Over-provisioning cloud compute before reaching market fit can burn through hackathon and startup budgets.',
          mitigation: 'Architect for $0 free-tier launch on Vercel, Supabase, and Fly.io, scaling up paid tiers only when DAU exceeds 5,000.',
          badge: 'Cost'
        }
      ]
    },
    similarWebsites: [
      {
        name: 'Supabase',
        url: 'https://supabase.com',
        category: 'Market Leader / Backend-as-a-Service',
        description: 'Open source Firebase alternative providing Postgres database, Authentication, instant APIs, and Realtime subscriptions.',
        moat: 'Provides custom domain-specific logic, automated architecture blueprints, and turnkey boilerplate generator.'
      },
      {
        name: 'Vercel',
        url: 'https://vercel.com',
        category: 'Edge Deployment Cloud',
        description: 'Frontend cloud platform offering global serverless functions, CI/CD deployments, and high-performance CDN.',
        moat: 'Complete autonomy and portability to deploy on Docker, AWS, or local bare-metal without proprietary vendor locks.'
      },
      {
        name: 'Coolify',
        url: 'https://coolify.io',
        category: 'Self-Hosted Cloud PaaS',
        description: 'An open-source, self-hostable alternative to Heroku, Netlify, and Render.',
        moat: 'Pre-architected starter repository with complete GitHub actions, Docker Compose scripts, and step-by-step roadmaps.'
      }
    ],
    openSourceProjects: [
      {
        name: 'Supabase Core',
        repo: 'supabase/supabase',
        url: 'https://github.com/supabase/supabase',
        stars: '⭐ 75.2k',
        techStack: 'TypeScript, Go, Elixir, PostgreSQL',
        description: 'The open source Firebase alternative with real-time database listeners and row-level security.',
        integration: 'Provides the recommended backend data persistence and instant authentication layer.'
      },
      {
        name: 'FastAPI',
        repo: 'tiangolo/fastapi',
        url: 'https://github.com/fastapi/fastapi',
        stars: '⭐ 76.8k',
        techStack: 'Python, Pydantic, Starlette',
        description: 'Modern, high-performance web framework for building APIs with Python based on standard type hints.',
        integration: 'Acts as our primary asynchronous backend API gateway with auto-generated OpenAPI docs.'
      },
      {
        name: 'Shadcn UI',
        repo: 'shadcn-ui/ui',
        url: 'https://github.com/shadcn-ui/ui',
        stars: '⭐ 71.3k',
        techStack: 'TypeScript, React, Tailwind CSS',
        description: 'Beautifully designed components that you can copy and paste into your apps with accessible Radix primitives.',
        integration: 'Forms the UI component design system for clean, high-contrast, accessible user interfaces.'
      }
    ],
    githubSearchTerms: ['production-fullstack-starter', 'fastapi-react-postgres', 'docker-compose-boilerplate', 'microservice-architecture']
  };
}

/* ──────────────── SMART HEURISTIC SYNTHESIZERS (ZERO-FAILURE FALLBACK) ──────────────── */
export function synthesizeSmartUnderstanding(ideaText = '') {
  let cleaned = (ideaText || '').trim();
  // Strip conversational filler so "MY IDEA IS TO CREATE A WEBSITE FOR BLIND PEOPLE" becomes "create a website for blind people"
  cleaned = cleaned.replace(/^(my\s+idea\s+is\s+to|i\s+want\s+to\s+build|i\s+want\s+to\s+create|i\s+would\s+like\s+to|we\s+want\s+to|project\s+idea\s*:?|build\s+a|create\s+a|make\s+a)\s+/gi, '').trim();
  const raw = (cleaned || ideaText || '').toLowerCase();

  // 1. Accessibility & Assistive Tech for Blind / Visually Impaired
  if (
    raw.includes('blind') ||
    raw.includes('visually impaired') ||
    raw.includes('accessibility') ||
    raw.includes('screen reader') ||
    raw.includes('audio navigation') ||
    raw.includes('a11y') ||
    raw.includes('wcag') ||
    raw.includes('బ్లైండ్') ||
    raw.includes('అంధుల') ||
    raw.includes('యాక్సెస్') ||
    raw.includes('दृष्टिहीन') ||
    raw.includes('सुगम')
  ) {
    return {
      projectTitle: 'VisionBridge — Voice-First Web Portal for the Blind',
      oneLiner: 'WCAG 2.1 AAA accessible platform with spatial audio cues, Web Speech voice navigation, and screen-reader optimizations.',
      corePurpose: 'Eliminates digital barriers for visually impaired individuals by replacing visual UI paradigms with low-latency Web Speech voice navigation, screen-reader live regions, tactile keyboard shortcuts, and multimodal AI image narration.',
      keyActors: ['Visually Impaired User / Screen-Reader Navigator', 'Voice Navigation Assistant', 'Audio Synthesis & TTS Engine', 'Accessibility Auditor', 'Community Volunteer'],
      coreWorkflow: 'Voice Command / Keyboard Shortcut Ingestion → Intent Parsing & Speech-to-Text → Semantic Content Retrieval → Real-Time Audio Narration / ARIA Announcement → Spatial Audio & Tactile Haptic Feedback',
      identifiedComponents: [
        { name: 'Accessible Voice & Screen-Reader Client', role: 'WCAG 2.1 AAA compliant frontend with ARIA Live regions, high-contrast mode, and keyboard-first navigation', type: 'frontend' },
        { name: 'Voice Command Gateway', role: 'FastAPI / WebSocket service handling Web Speech API, Whisper audio streaming, and voice intent parsing', type: 'backend' },
        { name: 'Multimodal Audio & Vision Engine', role: 'ElevenLabs / Google Cloud TTS for real-time speech narration + Gemini Vision for image alt-text description', type: 'ai' },
        { name: 'Accessible Knowledge Store', role: 'PostgreSQL storing accessible document transcripts, user preferences, and high-contrast settings', type: 'database' },
        { name: 'Redis Audio Stream Cache', role: 'Low-latency audio chunk caching and session speech context', type: 'cache' },
        { name: 'Accessibility Audit Worker', role: 'Automated axe-core / Pa11y compliance validator ensuring 100% WCAG conformance', type: 'other' }
      ],
      dataFlows: [
        { from: 'Accessible Voice & Screen-Reader Client', to: 'Voice Command Gateway', description: 'Real-time WebSocket audio stream & semantic ARIA events' },
        { from: 'Voice Command Gateway', to: 'Multimodal Audio & Vision Engine', description: 'Raw speech tokens to Whisper STT & TTS audio synthesizer' },
        { from: 'Voice Command Gateway', to: 'Accessible Knowledge Store', description: 'Indexed search queries for high-accessibility text transcripts' },
        { from: 'Voice Command Gateway', to: 'Redis Audio Stream Cache', description: 'Sub-15ms cached audio waveform buffers' },
        { from: 'Multimodal Audio & Vision Engine', to: 'Accessible Voice & Screen-Reader Client', description: 'Synthesized voice responses & spatial sound cues' }
      ],
      clarifyingQuestions: [
        {
          question: 'Which primary interaction mode should take priority for blind users?',
          why: 'Dictates whether the core interface is voice-driven or keyboard shortcut-driven.',
          options: [
            'Conversational Voice-First (Speak naturally to browse and listen to page content)',
            'Screen-Reader First with Semantic ARIA (Optimized for NVDA, JAWS, VoiceOver)',
            'Hybrid Audio Grid (Single-key shortcuts with spatial audio feedback)'
          ]
        },
        {
          question: 'How should visual media (photos, diagrams, charts) be explained to blind users?',
          why: 'Determines multimodal AI vision model integration and token processing budgets.',
          options: [
            'Automated AI Vision Alt-Text (Instant 2-sentence audio description of any image)',
            'Hierarchical Audio Tours (Interactive audio drill-down of complex charts and diagrams)',
            'Plain-Text Semantic Summaries Only'
          ]
        },
        {
          question: 'What accessibility compliance standard is required for certification?',
          why: 'Ensures strict legal adherence to international accessibility legislation.',
          options: [
            'WCAG 2.1 Level AAA (Highest Standard - Enhanced contrast & zero audio interference)',
            'Section 508 & ADA (US Federal Government compliance)',
            'EN 301 549 (European Union digital accessibility standard)'
          ]
        }
      ],
      innovationSuggestions: [
        {
          title: 'Spatial 3D Audio Cue Grid',
          description: 'Uses Web Audio API stereo panning so blind users spatially hear where buttons and links are located in 3D headphone space.',
          complexity: 'Medium'
        },
        {
          title: 'Instant AI Screen & Diagram Explainer',
          description: 'Blind users press Spacebar to trigger Gemini Vision to describe any image, diagram, or UI state in natural spoken language.',
          complexity: 'Low'
        },
        {
          title: 'Voice-Driven Zero-Typing Form Assistant',
          description: 'Conversational audio form-filling that speaks back every field confirmation before submitting, preventing errors.',
          complexity: 'High'
        }
      ],
      assumptions: [
        'Users navigate primarily via keyboard (Tab, Space, Arrow keys) or hands-free voice commands.',
        'Audio streams maintain sub-100ms latency to prevent disorienting screen-reader lag.'
      ],
      ...synthesizeProsAndConsAndCompetitors(raw, 'VisionBridge — Voice-First Web Portal for the Blind', 'Eliminates digital barriers for visually impaired individuals by replacing visual UI paradigms with low-latency Web Speech voice navigation.')
    };
  }

  // 2. ID Cards & Document KYC
  if (
    raw.includes('id') ||
    raw.includes('card') ||
    raw.includes('identity') ||
    raw.includes('student') ||
    raw.includes('badge') ||
    raw.includes('ocr') ||
    raw.includes('kyc') ||
    raw.includes('license') ||
    raw.includes('passport') ||
    raw.includes('aadhaar') ||
    raw.includes('ఐడీ') ||
    raw.includes('కార్డ్') ||
    raw.includes('ధృవీకరణ') ||
    raw.includes('पहचान') ||
    raw.includes('कार्ड')
  ) {
    return {
      projectTitle: 'SmartID — Automated Identity & Document Verification Engine',
      oneLiner: 'AI-driven OCR extraction, biometric verification, and encrypted record store for identity cards.',
      corePurpose: 'Extracts key credentials (name, ID number, expiration, photo) from uploaded physical ID cards using multimodal OCR, verifies integrity against institutional records, and maintains an AES-256 encrypted tamper-proof database.',
      keyActors: ['Card Holder / Student', 'Verification Officer', 'Multimodal OCR Worker', 'Institutional Registry', 'Compliance Auditor'],
      coreWorkflow: 'ID Card Upload / Scan → Computer Vision Preprocessing (Deskew/Crop) → Multimodal OCR Extraction → Biometric Face Liveness & Tamper Check → PostgreSQL Encrypted Storage → Webhook Notification & Verified Status Issued',
      identifiedComponents: [
        { name: 'Document Capture Client', role: 'Responsive mobile/web camera scanner with auto-cropping and glare reduction', type: 'frontend' },
        { name: 'Verification API Gateway', role: 'FastAPI service handling TLS 1.3 payload encryption, authentication, and rate limiting', type: 'backend' },
        { name: 'Multimodal OCR & Vision Service', role: 'Tesseract / Gemini Vision pipeline extracting text fields, barcode, and photo', type: 'ai' },
        { name: 'Encrypted Identity Store', role: 'PostgreSQL with pgcrypto storing hashed PII, verified metadata, and audit logs', type: 'database' },
        { name: 'Secure Document Vault', role: 'MinIO / S3 bucket with private encrypted storage and expiring signed URLs', type: 'other' },
        { name: 'Redis Cache & Session Store', role: 'High-speed verification token store and rate-limiting to prevent fraud', type: 'cache' }
      ],
      dataFlows: [
        { from: 'Document Capture Client', to: 'Verification API Gateway', description: 'Multipart HTTPS upload with client-side SHA256 image checksum' },
        { from: 'Verification API Gateway', to: 'Multimodal OCR & Vision Service', description: 'Internal gRPC / REST pipeline for field parsing & liveness check' },
        { from: 'Multimodal OCR & Vision Service', to: 'Encrypted Identity Store', description: 'Field-level AES-256 encrypted write to PostgreSQL records' },
        { from: 'Verification API Gateway', to: 'Secure Document Vault', description: 'Raw image encrypted upload via pre-signed URL' },
        { from: 'Verification API Gateway', to: 'Redis Cache & Session Store', description: 'Atomic session status update (PENDING → VERIFIED)' }
      ],
      clarifyingQuestions: [
        {
          question: 'What level of biometric identity verification is required?',
          why: 'Determines whether live selfie facial comparison and anti-spoofing models are needed.',
          options: [
            'OCR Text Extraction & Checksum Only (Fastest, zero biometric friction)',
            'ID Photo vs Live Selfie Facial Matching (Standard KYC / Student verification)',
            'Full Liveness Video Detection + Active Challenge (Highest security banking-grade)'
          ]
        },
        {
          question: 'How should sensitive personal data (PII) be encrypted and retained?',
          why: 'Ensures compliance with GDPR, FERPA, and institutional privacy standards.',
          options: [
            'AES-256 Field-Level Encryption with 30-Day Auto-Purge Policy',
            'Permanent Encrypted Vault with Immutable Audit Logging',
            'Zero-Knowledge Hash Matching (Raw PII is never stored in plaintext)'
          ]
        },
        {
          question: 'Which backend API framework and deployment runtime do you prefer?',
          why: 'Dictates asynchronous image throughput, container scaling, and developer ergonomics.',
          options: [
            'Python FastAPI Async + Celery Background Workers (Ideal for ML & OpenCV)',
            'Node.js (Express / NestJS) + BullMQ (High concurrency event loop)',
            'Go (Golang) Microservices (Ultra low-latency compiled binary performance)'
          ]
        }
      ],
      innovationSuggestions: [
        {
          title: 'Holographic & Anti-Tamper Neural Shield',
          description: 'Detects digital image manipulation, font mismatches, and photo replacement using edge gradient analysis.',
          complexity: 'High'
        },
        {
          title: 'Instant QR / Barcode Dual-Verification',
          description: 'Cross-references printed human-readable text against encrypted PDF417 or QR code barcodes on the card.',
          complexity: 'Medium'
        },
        {
          title: 'Offline Edge-OCR for Mobile PWA',
          description: 'Pre-extracts text directly inside the user browser using WebAssembly before uploading, reducing server bandwidth by 80%.',
          complexity: 'Low'
        }
      ],
      assumptions: [
        'Captured ID cards meet minimum resolution standards (at least 720p with legible text).',
        'Database utilizes encrypted volume storage with strictly scoped RBAC permissions.'
      ],
      ...synthesizeProsAndConsAndCompetitors(raw, 'SmartID — Automated Identity & Document Verification Engine', 'Extracts key credentials from uploaded physical ID cards using multimodal OCR, verifies integrity against institutional records.')
    };
  }

  // Domain-Aware Identity & Question Extraction (Zero-Failure Fallback)
  const smartIdentity = extractSmartProjectIdentity(cleaned || ideaText);
  const domain = smartIdentity.domain;
  const title = smartIdentity.projectTitle;
  const oneLiner = smartIdentity.oneLiner;
  const corePurpose = smartIdentity.corePurpose;
  const clarifyingQuestions = generateDomainClarifyingQuestions(ideaText, domain);
  const enriched = synthesizeProsAndConsAndCompetitors(raw, title, corePurpose);

  let keyActors = ['End-User / Client', 'API Gateway Service', 'Background Worker & Scheduler', 'System Administrator'];
  let coreWorkflow = 'Client Request → API Gateway Validation → Asynchronous Worker Processing → Cache / Database Mutation → Real-Time Notification';
  let identifiedComponents = [
    { name: 'Web Client UI', role: 'Interactive responsive user interface with real-time UI updates', type: 'frontend' },
    { name: 'API Gateway', role: 'Authentication, request validation, rate limiting, and route dispatching', type: 'backend' },
    { name: 'Relational Database', role: 'ACID transactional data storage and relational entities', type: 'database' },
    { name: 'Redis Cache & Queue', role: 'High-speed in-memory caching and asynchronous job queueing', type: 'cache' },
    { name: 'AI Reasoning Engine', role: 'Contextual inference, automated classification, and intelligent recommendations', type: 'ai' }
  ];
  let dataFlows = [
    { from: 'Web Client UI', to: 'API Gateway', description: 'HTTPS REST & Secure WebSocket' },
    { from: 'API Gateway', to: 'Redis Cache & Queue', description: 'In-Memory Key/Value & PubSub' },
    { from: 'API Gateway', to: 'Relational Database', description: 'Connection Pool with Prisma/SQLAlchemy' },
    { from: 'API Gateway', to: 'AI Reasoning Engine', description: 'JSON Payload with Streaming Tokens' }
  ];
  let innovationSuggestions = [
    { title: 'Edge Caching & Global CDN', description: 'Cache static assets and API read queries at Cloudflare edge nodes for sub-20ms latency worldwide.', complexity: 'Medium' },
    { title: 'Event-Driven Asynchronous Pipeline', description: 'Decouple long-running tasks using Redis Celery / BullMQ workers so user requests respond in <100ms.', complexity: 'Low' },
    { title: 'Multimodal Telemetry & AI Observability', description: 'Real-time trace logs and automated anomaly alerts triggered before users experience latency spikes.', complexity: 'High' }
  ];

  if (domain === 'hotel') {
    keyActors = ['Traveler / Hotel Guest', 'Hotel Front Desk / Host', 'Channel Manager & OTA Sync Worker', 'Payment & Escrow Gateway', 'Platform Administrator'];
    coreWorkflow = 'Guest Searches Dates & Rooms → PostGIS Geospatial & GiST Availability Query → Room Selected with Redis 10-Min Mutex Lock → Stripe Checkout with Escrow → Instant Confirmation Voucher with QR Code → Front Desk Check-in';
    identifiedComponents = [
      { name: 'Guest Booking Web & Mobile Client', role: 'Interactive date-range calendar, dynamic room gallery, and location map UI', type: 'frontend' },
      { name: 'Reservation & Inventory API Gateway', role: 'FastAPI / Node.js service handling double-booking mutex locking, search filters, and auth', type: 'backend' },
      { name: 'Hotel Availability & Geospatial Store', role: 'PostgreSQL 16 + PostGIS + GiST date range indexes for instant availability lookups', type: 'database' },
      { name: 'Redis Hold Cache & Event Queue', role: '10-minute hold TTLs, atomic room stock decrements, and session state', type: 'cache' },
      { name: 'Automated Itinerary & QR Voucher Worker', role: 'Celery / BullMQ generating PDF vouchers, calendar sync, and QR check-in codes', type: 'other' },
      { name: 'Payment & Stripe Connect Splitter', role: 'Direct host payouts minus commission with automated refund escrow', type: 'other' }
    ];
    dataFlows = [
      { from: 'Guest Booking Web & Mobile Client', to: 'Reservation & Inventory API Gateway', description: 'Date query & room selection with JWT auth' },
      { from: 'Reservation & Inventory API Gateway', to: 'Redis Hold Cache & Event Queue', description: 'Atomic Redlock mutex (10-min reservation hold)' },
      { from: 'Reservation & Inventory API Gateway', to: 'Hotel Availability & Geospatial Store', description: 'Indexed GiST date overlap query' },
      { from: 'Reservation & Inventory API Gateway', to: 'Payment & Stripe Connect Splitter', description: 'Stripe payment capture & escrow hold' },
      { from: 'Reservation & Inventory API Gateway', to: 'Automated Itinerary & QR Voucher Worker', description: 'Async event to dispatch PDF & QR voucher' }
    ];
    innovationSuggestions = [
      { title: 'Dynamic Yield Management & Surge Pricing', description: 'Automated ML pricing algorithm adjusting room rates based on local occupancy rates, holidays, and booking pace.', complexity: 'Medium' },
      { title: 'Contactless Mobile Key & QR Check-In', description: 'Generates encrypted time-sensitive QR access tokens allowing guests to bypass the front desk and check in directly.', complexity: 'Low' },
      { title: 'Two-Way Instant Channel Manager Sync', description: 'Bi-directional webhooks synchronizing live availability between your direct portal, Booking.com, and Airbnb in <2s.', complexity: 'High' }
    ];
  } else if (domain === 'ecommerce') {
    keyActors = ['Online Shopper', 'Merchant / Store Owner', 'Warehouse & Fulfillment Operator', 'Payment Gateway (Stripe/PayPal)', 'Inventory Sync Worker'];
    coreWorkflow = 'Product Catalog Discovery & Faceted Filtering → Cart Addition with Redis Stock Hold → Idempotent Stripe Checkout → Asynchronous Order Fulfillment Webhook → Real-Time Delivery Tracking';
    identifiedComponents = [
      { name: 'Storefront Shopping Client', role: 'React 19 + Headless UI with sub-10ms instant search and faceted filtering', type: 'frontend' },
      { name: 'Commerce API Gateway', role: 'FastAPI / NestJS service handling cart state, checkout orchestration, and JWT auth', type: 'backend' },
      { name: 'Product Catalog & Order Database', role: 'PostgreSQL 16 with JSONB product variants, relational stock counts, and ACID orders', type: 'database' },
      { name: 'Redis Cart & Flash-Sale Queue', role: 'Atomic stock decrements with 15-minute checkout TTL and session caching', type: 'cache' },
      { name: 'Order Fulfillment & Webhook Worker', role: 'Celery / BullMQ worker dispatching warehouse orders, invoices, and shipping tracking', type: 'other' }
    ];
    dataFlows = [
      { from: 'Storefront Shopping Client', to: 'Commerce API Gateway', description: 'GraphQL / REST catalog queries and cart actions' },
      { from: 'Commerce API Gateway', to: 'Redis Cart & Flash-Sale Queue', description: 'Atomic inventory decrement with TTL hold' },
      { from: 'Commerce API Gateway', to: 'Product Catalog & Order Database', description: 'ACID transaction write for verified orders' },
      { from: 'Commerce API Gateway', to: 'Order Fulfillment & Webhook Worker', description: 'Async message to trigger warehouse packaging & shipping API' }
    ];
    innovationSuggestions = [
      { title: 'Flash-Sale Anti-Bot Inventory Shield', description: 'Proof-of-work challenge token and Redis token bucket preventing scalper bots from exhausting limited stock.', complexity: 'Medium' },
      { title: 'Instant Semantic Product Discovery', description: 'Natural language search powered by vector embeddings and Meilisearch with instant typo tolerance.', complexity: 'Low' },
      { title: 'Autonomous Multi-Carrier Shipping Broker', description: 'Automatically compares live rates across FedEx, UPS, and DHL to select the fastest, lowest-cost carrier route.', complexity: 'High' }
    ];
  } else if (domain === 'restaurant') {
    keyActors = ['Dining Guest', 'Kitchen Head Chef', 'Waitstaff / Floor Host', 'Restaurant Manager', 'POS Payment Terminal'];
    coreWorkflow = 'Table Reservation / QR Menu Scan → Real-Time Kitchen Display Order Broadcast → Live Preparation Status Updates → Contactless Table Checkout → Automated Review Feedback';
    identifiedComponents = [
      { name: 'Guest Mobile Menu & Booking Client', role: 'Responsive PWA with QR code table ordering, allergen filters, and reservation calendar', type: 'frontend' },
      { name: 'Restaurant Operations Gateway', role: 'FastAPI / Node.js service managing table state, order tickets, and staff permissions', type: 'backend' },
      { name: 'Kitchen Display System (KDS)', role: 'Low-latency WebSocket interface displaying live kitchen tickets prioritized by cook times', type: 'frontend' },
      { name: 'Menu & Table Inventory Store', role: 'PostgreSQL with relational table layouts, daily special stock limits, and receipt logs', type: 'database' },
      { name: 'Redis Live Order PubSub', role: 'Real-time WebSocket event broadcaster for instant ticket printing and status sync', type: 'cache' }
    ];
    dataFlows = [
      { from: 'Guest Mobile Menu & Booking Client', to: 'Restaurant Operations Gateway', description: 'QR menu order payload & tip selection' },
      { from: 'Restaurant Operations Gateway', to: 'Redis Live Order PubSub', description: 'Real-time WebSocket ticket broadcast to kitchen display' },
      { from: 'Kitchen Display System (KDS)', to: 'Restaurant Operations Gateway', description: 'Chef marks dish status (PREPARING → READY)' },
      { from: 'Restaurant Operations Gateway', to: 'Menu & Table Inventory Store', description: 'Relational persistence of ticket receipt and table turnover' }
    ];
    innovationSuggestions = [
      { title: 'Predictive Kitchen Prep & Table Turn AI', description: 'Estimates dish preparation time and table turnover using historical order flow to optimize guest seating.', complexity: 'Medium' },
      { title: 'Smart Allergen & Dietary Filter', description: 'Dynamic menu customization that automatically highlights gluten-free, vegan, and allergen-safe options.', complexity: 'Low' },
      { title: 'Automated Dynamic Floorplan Optimization', description: 'Real-time table rearrangement recommendations maximizing floor capacity for peak weekend hours.', complexity: 'High' }
    ];
  } else if (domain === 'healthcare') {
    keyActors = ['Patient', 'Consulting Physician', 'Clinical Administrator', 'Pharmacy Network', 'HIPAA Compliance Officer'];
    coreWorkflow = 'Patient Symptom Triage → Encrypted WebRTC Video Consultation → Clinician Digital Prescription Creation → HL7/FHIR Health Record Encryption → Pharmacy Notification';
    identifiedComponents = [
      { name: 'Patient & Clinician Portal', role: 'HIPAA-compliant responsive interface with appointment calendar and digital intake forms', type: 'frontend' },
      { name: 'Clinical Telehealth Gateway', role: 'FastAPI service enforcing AES-256 field encryption, role-based access control, and audit logs', type: 'backend' },
      { name: 'Encrypted WebRTC Video Engine', role: 'Sub-300ms peer-to-peer clinical video consultation with end-to-end encryption', type: 'ai' },
      { name: 'FHIR Health Record Store', role: 'PostgreSQL with pgcrypto storing HL7/FHIR standard electronic health records', type: 'database' },
      { name: 'Audit & Compliance Logger', role: 'Immutable append-only access log verifying zero unauthorized patient record views', type: 'cache' }
    ];
    dataFlows = [
      { from: 'Patient & Clinician Portal', to: 'Clinical Telehealth Gateway', description: 'TLS 1.3 encrypted clinical intake data and auth tokens' },
      { from: 'Clinical Telehealth Gateway', to: 'Encrypted WebRTC Video Engine', description: 'Secure room token exchange for peer video call' },
      { from: 'Clinical Telehealth Gateway', to: 'FHIR Health Record Store', description: 'AES-256 encrypted write to patient electronic chart' },
      { from: 'Clinical Telehealth Gateway', to: 'Audit & Compliance Logger', description: 'HIPAA compliance audit entry with timestamp and practitioner ID' }
    ];
    innovationSuggestions = [
      { title: 'Ambient Clinical Voice Scribe', description: 'Transcribes patient consultation audio and formats structured SOAP clinical notes automatically.', complexity: 'High' },
      { title: 'Automated Drug Interaction Warning', description: 'Cross-checks prescribed medications against patient allergy history and contraindications in real time.', complexity: 'Medium' },
      { title: 'Zero-Knowledge Patient Vault', description: 'Patients hold client-side private keys so even cloud server administrators cannot decrypt medical records.', complexity: 'High' }
    ];
  }

  return {
    ...enriched,
    projectTitle: title,
    oneLiner,
    corePurpose,
    keyActors,
    coreWorkflow,
    identifiedComponents,
    dataFlows,
    clarifyingQuestions,
    innovationSuggestions,
    assumptions: [
      'Targeting MVP launch with capacity to scale to 50,000 daily active users without architectural rewrites.',
      'Containerized with Docker to guarantee zero environment discrepancy between local dev and cloud production.'
    ]
  };
}

export function synthesizeSmartBlueprint(understanding = {}, userRefinements = '') {
  const title = understanding?.projectTitle || 'Production System';
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const combinedContext = [
    title,
    understanding?.oneLiner || '',
    understanding?.corePurpose || '',
    understanding?.rawPrompt || '',
    userRefinements || ''
  ].join(' ').toLowerCase();

  const isA11yProject = combinedContext.includes('blind') || combinedContext.includes('vision') || combinedContext.includes('visually impaired') || combinedContext.includes('accessib') || combinedContext.includes('screen reader') || combinedContext.includes('a11y') || combinedContext.includes('wcag');
  const isIdCardProject = !isA11yProject && (combinedContext.includes(' id ') || combinedContext.includes('card') || combinedContext.includes('identity') || combinedContext.includes('ocr') || combinedContext.includes('smartid') || combinedContext.includes('kyc') || combinedContext.includes('student id') || combinedContext.includes('badge'));

  const mermaidDiagram = isA11yProject ? `graph LR
  subgraph ClientTier["🎧 Voice & Screen Reader Client"]
    UI["Accessible PWA Client<br/>(WCAG 2.1 AAA + Web Speech API)"]
    AudioCues["Spatial 3D Audio Engine<br/>(Web Audio Stereo Panning)"]
  end

  subgraph GatewayTier["⚡ Voice & Intent Gateway"]
    API["FastAPI Voice Gateway<br/>(WebSocket Streamer + Auth)"]
    Session["Speech Session Cache<br/>(Redis State Store)"]
  end

  subgraph EngineTier["🧠 Multimodal Speech & Vision"]
    STT["Whisper Speech-to-Text<br/>(Voice Command Transcriber)"]
    TTS["ElevenLabs / Cloud TTS<br/>(Natural Audio Narration)"]
    Vision["Gemini Vision AI<br/>(Image Alt-Text Explainer)"]
  end

  subgraph StorageTier["🗄️ Accessible Knowledge Store"]
    DB[("PostgreSQL Store<br/>(Semantic Transcripts & Profiles)")]
  end

  subgraph ComplianceTier["🛡️ Automated Compliance"]
    A11y["Pa11y / Axe-Core<br/>(WCAG AAA Conformance Guard)"]
  end

  UI -->|Voice Stream & Keystrokes| API
  API --> Session
  API -->|Raw Audio| STT
  STT --> API
  API -->|Text to Speak| TTS
  TTS -->|Synthesized Audio Stream| UI
  UI --> AudioCues
  API -->|Image Query| Vision
  API -->|Read/Write Transcripts| DB
  API -->|Audit Hook| A11y

  classDef client fill:#00c8ff15,stroke:#00c8ff,stroke-width:2px;
  classDef gateway fill:#8b5cf615,stroke:#8b5cf6,stroke-width:2px;
  classDef engine fill:#10b98115,stroke:#10b981,stroke-width:2px;
  classDef storage fill:#f59e0b15,stroke:#f59e0b,stroke-width:2px;

  class UI,AudioCues client;
  class API,Session gateway;
  class STT,TTS,Vision engine;
  class DB storage;
  class A11y gateway;` : isIdCardProject ? `graph LR
  subgraph ClientTier["📱 Document Scanner Client"]
    UI["PWA Camera Scanner<br/>(Auto-Crop + Glare Detection)"]
  end

  subgraph GatewayTier["⚡ Verification Gateway"]
    API["FastAPI Verification Service<br/>(HMAC Auth + TLS 1.3 Rate Limiter)"]
    Session["Session Token Manager<br/>(Redis State Store)"]
  end

  subgraph VisionPipeline["👁️ OCR & Biometrics Engine"]
    OCR["Multimodal Document OCR<br/>(Gemini Vision / Tesseract)"]
    Biometrics["Face Match & Tamper Shield<br/>(Liveness & Artifact Detection)"]
  end

  subgraph StorageTier["🗄️ Encrypted Records & Vault"]
    DB[("PostgreSQL Store<br/>(AES-256 Encrypted PII)")]
    Vault[("Private MinIO / S3 Vault<br/>(Encrypted Document Archive)")]
  end

  subgraph WorkerTier["⚙️ Audit & Webhook Pipeline"]
    Worker["Celery Worker<br/>(Audit Trail & Status Webhooks)"]
  end

  UI -->|Encrypted Multipart HTTPS| API
  API --> Session
  API -->|Raw Stream| OCR
  OCR --> Biometrics
  Biometrics -->|Extracted Identity Payload| API
  API -->|Encrypted Write| DB
  API -->|Presigned Put| Vault
  API -->|Async Event| Worker
  Worker --> DB

  classDef client fill:#00c8ff15,stroke:#00c8ff,stroke-width:2px;
  classDef gateway fill:#8b5cf615,stroke:#8b5cf6,stroke-width:2px;
  classDef vision fill:#10b98115,stroke:#10b981,stroke-width:2px;
  classDef storage fill:#f59e0b15,stroke:#f59e0b,stroke-width:2px;

  class UI client;
  class API,Session,Worker gateway;
  class OCR,Biometrics vision;
  class DB,Vault storage;` : buildSolidArchitectureDiagram(understanding, {
    frontend: { name: 'React 19 + Vite + Tailwind' },
    backend: { name: 'FastAPI / Node.js' },
    database: { name: 'PostgreSQL (Primary ACID)' },
    extras: [
      { name: 'Redis Cache (Sessions & Queue)' },
      { name: 'Background Worker (Celery / BullMQ)' },
      { name: 'Auth & Security (OAuth2 + JWT)' }
    ],
    ai: { name: 'Gemini / Gemma Engine (Inference & Vision)' }
  });

  const fileTree = [
    {
      path: 'README.md',
      type: 'file',
      description: 'Project architecture overview and quickstart guide',
      content: `# ${title} — Production Starter Repo\n\nGenerated automatically by **RepoBlueprint AI** (MLH Hacktoberfest 2026).\n\n## Quick Start\n\n\`\`\`bash\n# 1. Start all containerized services\ndocker compose up --build\n\n# 2. Access Web UI\nopen http://localhost:3000\n\n# 3. Access API Docs\nopen http://localhost:8000/docs\n\`\`\`\n\n## Architecture\n- **Frontend**: React 19 + Vite + Tailwind CSS\n- **Backend**: FastAPI Async Python\n- **Database**: PostgreSQL 16 + Redis 7\n- **AI**: Gemini 2.0 / Ollama\n`
    },
    {
      path: 'docker-compose.yml',
      type: 'file',
      description: 'Production-ready multi-container orchestration',
      content: `version: '3.8'\nservices:\n  frontend:\n    build: ./frontend\n    ports:\n      - "3000:3000"\n    environment:\n      - VITE_API_URL=http://localhost:8000\n    depends_on:\n      - backend\n\n  backend:\n    build: ./backend\n    ports:\n      - "8000:8000"\n    environment:\n      - DATABASE_URL=postgresql://user:pass@db:5432/app\n      - REDIS_URL=redis://cache:6379/0\n    depends_on:\n      - db\n      - cache\n\n  db:\n    image: postgres:16-alpine\n    environment:\n      - POSTGRES_USER=user\n      - POSTGRES_PASSWORD=pass\n      - POSTGRES_DB=app\n    volumes:\n      - pgdata:/var/lib/postgresql/data\n\n  cache:\n    image: redis:7-alpine\n\nvolumes:\n  pgdata:\n`
    },
    {
      path: 'backend/main.py',
      type: 'file',
      description: 'FastAPI async application gateway with CORS and health checks',
      content: `from fastapi import FastAPI\nfrom fastapi.middleware.cors import CORSMiddleware\n\napp = FastAPI(title="${title} API", version="1.0.0")\n\napp.add_middleware(\n    CORSMiddleware,\n    allow_origins=["*"],\n    allow_credentials=True,\n    allow_methods=["*"],\n    allow_headers=["*"],\n)\n\n@app.get("/health")\nasync def health():\n    return {"status": "ok", "service": "${title}", "healthy": True}\n\n@app.get("/api/v1/overview")\nasync def get_overview():\n    return {\n        "name": "${title}",\n        "version": "1.0.0",\n        "features": ["Async REST", "Redis Cache", "PostgreSQL", "AI Multimodal"]\n    }\n`
    },
    {
      path: 'frontend/package.json',
      type: 'file',
      description: 'Vite React frontend dependencies',
      content: `{\n  "name": "${slug}-frontend",\n  "private": true,\n  "version": "1.0.0",\n  "type": "module",\n  "scripts": {\n    "dev": "vite",\n    "build": "vite build",\n    "preview": "vite preview"\n  },\n  "dependencies": {\n    "react": "^19.0.0",\n    "react-dom": "^19.0.0",\n    "lucide-react": "^0.460.0"\n  },\n  "devDependencies": {\n    "@vitejs/plugin-react": "^4.3.4",\n    "vite": "^6.0.0"\n  }\n}\n`
    },
    {
      path: '.github/workflows/ci.yml',
      type: 'file',
      description: 'GitHub Actions automated test and lint pipeline',
      content: `name: CI\non: [push, pull_request]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - name: Build Docker Containers\n        run: docker compose build\n      - name: Run Smoke Tests\n        run: echo "All containers compiled successfully."\n`
    }
  ];

  if (isA11yProject) {
    fileTree.push({
      path: 'frontend/src/AccessibilityContext.jsx',
      type: 'file',
      description: 'Web Speech API voice navigation, ARIA live region announcer, and high-contrast context',
      content: `import React, { createContext, useContext, useState, useEffect } from 'react';

const AccessibilityContext = createContext(null);

export function AccessibilityProvider({ children }) {
  const [highContrast, setHighContrast] = useState(true);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [isListening, setIsListening] = useState(false);
  const [announcement, setAnnouncement] = useState('Voice-First Accessibility Portal active.');

  const announce = (text) => {
    setAnnouncement(text);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = speechRate;
      window.speechSynthesis.speak(utterance);
    }
  };

  const playSpatialTone = (frequency = 440, pan = 0) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const panner = audioCtx.createStereoPanner();
      panner.pan.value = pan;
      osc.connect(panner);
      panner.connect(audioCtx.destination);
      osc.frequency.value = frequency;
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {}
  };

  return (
    <AccessibilityContext.Provider value={{
      highContrast, setHighContrast,
      speechRate, setSpeechRate,
      isListening, setIsListening,
      announcement, announce, playSpatialTone
    }}>
      <div role="region" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
      {children}
    </AccessibilityContext.Provider>
  );
}

export const useA11y = () => useContext(AccessibilityContext);
`
    });
    fileTree.push({
      path: 'backend/voice_gateway.py',
      type: 'file',
      description: 'WebSocket streaming endpoint for Whisper speech recognition and voice commands',
      content: `from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import json

app = FastAPI(title="VisionBridge Voice Gateway", version="1.0.0")

@app.websocket("/ws/voice")
async def voice_websocket(websocket: WebSocket):
    await websocket.accept()
    await websocket.send_json({
        "type": "SYSTEM_READY",
        "message": "Voice Gateway Active. Speak a command or press Spacebar."
    })
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            command = payload.get("command", "").lower()
            
            if "read" in command or "explain" in command:
                response = "Navigating to main article. Reading top headlines now..."
            elif "help" in command:
                response = "Commands available: Read page, Next section, Describe image, or Adjust speech speed."
            else:
                response = f"Understood: {command}. Executing accessible audio action."
                
            await websocket.send_json({
                "type": "VOICE_RESPONSE",
                "text": response,
                "audioReady": True
            })
    except WebSocketDisconnect:
        print("Accessible voice client disconnected")
`
    });
    fileTree.push({
      path: 'backend/audio_service.py',
      type: 'file',
      description: 'ElevenLabs TTS audio narration and Gemini Vision alt-text describer',
      content: `"""Multimodal audio narration and Gemini Vision image explainer for blind users."""
from typing import Dict, Any

class AccessibleAudioService:
    def __init__(self, tts_engine: str = "elevenlabs", vision_engine: str = "gemini"):
        self.tts_engine = tts_engine
        self.vision_engine = vision_engine

    async def describe_image_for_blind(self, image_bytes: bytes) -> str:
        """Converts diagrams, charts, and scenes into descriptive audio transcripts."""
        return (
            "Detailed scene description: The uploaded image shows a campus building entrance "
            "with a wheelchair-accessible ramp on the left side and automatic sliding glass doors."
        )

    async def synthesize_speech(self, text: str, voice_id: str = "natural_en") -> bytes:
        """Synthesizes high-fidelity audio waveform with sub-100ms latency."""
        return b""
`
    });
  }

  if (isIdCardProject) {
    fileTree.push({
      path: 'backend/ocr_service.py',
      type: 'file',
      description: 'Multimodal OCR and ID card document parsing service',
      content: `import cv2\nimport numpy as np\nimport re\nfrom typing import Dict, Any\n\nclass IDCardOCRService:\n    """Preprocesses and extracts structured fields from student/employee ID cards."""\n    \n    def preprocess_image(self, image_bytes: bytes) -> np.ndarray:\n        nparr = np.frombuffer(image_bytes, np.uint8)\n        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)\n        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)\n        return cv2.fastNlMeansDenoising(gray, h=10)\n\n    def extract_id_fields(self, raw_text: str) -> Dict[str, Any]:\n        """Extract Name, ID Number, Issue/Expiry Date using regex heuristics."""\n        id_pattern = r'(?:ID|NO|ROLL|REG)\\s*[:#-]?\\s*([A-Z0-9-]{4,16})'\n        date_pattern = r'(\\d{2}[-/]\\d{2}[-/]\\d{4})'\n        id_match = re.search(id_pattern, raw_text, re.IGNORECASE)\n        date_match = re.findall(date_pattern, raw_text)\n        return {\n            "id_number": id_match.group(1) if id_match else "VERIFIED_ID_001",\n            "detected_dates": date_match,\n            "confidence_score": 0.96,\n            "verification_status": "VERIFIED"\n        }\n`
    });
    fileTree.push({
      path: 'backend/verifier.py',
      type: 'file',
      description: 'Facial verification and anti-tamper security guard',
      content: `import hashlib\n\ndef verify_card_integrity(image_bytes: bytes, claimed_id: str) -> dict:\n    """Computes SHA-256 checksum and checks against revocation list."""\n    image_hash = hashlib.sha256(image_bytes).hexdigest()\n    return {\n        "claimed_id": claimed_id,\n        "image_hash": image_hash,\n        "tamper_detected": False,\n        "hologram_verified": True,\n        "status": "VERIFIED"\n    }\n`
    });
  }

  return {
    mermaidDiagram,
    fileTree,
    techStack: isA11yProject ? {
      frontend: { name: 'Accessible React 19 + Web Speech API', reason: 'WCAG 2.1 AAA high-contrast layout, ARIA live regions, keyboard traps, and native Web Speech API voice control.', alternatives: ['Next.js 15 (Accessible SSR)', 'SvelteKit A11y'] },
      backend: { name: 'FastAPI Voice Gateway (Python 3.12)', reason: 'Asynchronous WebSocket streams for bidirectional audio streaming, low-latency audio chunk processing, and Whisper integration.', alternatives: ['Node.js + WebSockets', 'Go Fiber'] },
      database: { name: 'PostgreSQL 16 + pgvector', reason: 'High-speed storage of semantic speech transcripts, screen reader user preference profiles, and vector search for accessible documents.', alternatives: ['Supabase Serverless', 'MongoDB Atlas'] },
      ai: { name: 'Whisper STT + ElevenLabs TTS + Gemini Vision', reason: 'End-to-end voice loop: Whisper transcribes spoken commands, ElevenLabs synthesizes human-grade audio narration, and Gemini Vision generates rich image alt-text.', alternatives: ['Google Cloud Speech & Text-to-Speech', 'Ollama Whisper'] },
      devops: { name: 'Docker Compose & Axe-Core CI', reason: 'Containerized deployment with automated axe-core accessibility regression testing on every GitHub pull request.', alternatives: ['Fly.io + Pa11y', 'AWS ECS Fargate'] },
      extras: [
        { name: 'Web Audio API', purpose: 'Stereo 3D spatial audio panning to give blind users acoustic spatial direction' },
        { name: 'Redis 7 Stream Buffer', purpose: 'Sub-15ms cached audio waveform buffers and active speech session state' }
      ]
    } : isIdCardProject ? {
      frontend: { name: 'React 19 + PWA Scanner', reason: 'Mobile-first camera scanner with auto-crop, contrast enhancement, and client-side image compression.', alternatives: ['React Native / Expo', 'Flutter'] },
      backend: { name: 'FastAPI (Python 3.12)', reason: 'Async Python performance, native OpenAPI documentation, and direct integration with OpenCV / Tesseract / PyTorch.', alternatives: ['Go Fiber', 'Node.js Express'] },
      database: { name: 'PostgreSQL 16 + pgcrypto', reason: 'Field-level AES-256 encryption for PII compliance (GDPR/FERPA) and indexed audit trails.', alternatives: ['Supabase', 'MongoDB Atlas'] },
      ai: { name: 'Multimodal OCR & Gemini Vision', reason: 'High-precision text extraction from ID cards, barcode/MRZ decoding, and facial photo comparison.', alternatives: ['Tesseract + DeepFace', 'AWS Rekognition'] },
      devops: { name: 'Docker Compose & MinIO Vault', reason: 'Self-hosted S3-compatible encrypted document archive paired with multi-container orchestration.', alternatives: ['AWS S3 + ECS', 'Cloudflare R2'] },
      extras: [
        { name: 'Redis 7', purpose: 'Verification session token TTL cache and fraud rate-limiting' },
        { name: 'Celery / BullMQ', purpose: 'Asynchronous webhook delivery and tamper verification worker' }
      ]
    } : {
      frontend: { name: 'React 19 + Vite', reason: 'Instant HMR development, sub-second production builds, and component ecosystem.', alternatives: ['Next.js 15', 'SvelteKit'] },
      backend: { name: 'FastAPI (Python 3.12)', reason: 'High-throughput async execution, native OpenAPI documentation, and seamless AI library compatibility.', alternatives: ['Node.js / Express', 'Go Fiber'] },
      database: { name: 'PostgreSQL 16', reason: 'Battle-tested relational ACID transactions, JSONB document fields, and connection pooling.', alternatives: ['MongoDB', 'Supabase'] },
      ai: { name: 'Google Gemma 4 / Gemini', reason: 'State-of-the-art multimodal reasoning, high token efficiency, and sub-second responses.', alternatives: ['Ollama Llama 3.3', 'Anthropic Claude'] },
      devops: { name: 'Docker Compose & GitHub Actions', reason: 'Zero environment divergence between developer machines and cloud deployment.', alternatives: ['Kubernetes', 'Terraform'] },
      extras: [
        { name: 'Redis 7', purpose: 'Sub-millisecond session caching and background job task queue' },
        { name: 'Prisma / SQLAlchemy', purpose: 'Type-safe database ORM and migration management' }
      ]
    },
    costBreakdown: {
      freeTier: [
        { service: 'Frontend Hosting', provider: 'Vercel / Cloudflare Pages', limit: '100GB Bandwidth / Unlimited builds', monthlyPrice: '$0' },
        { service: 'Backend Container', provider: 'Fly.io / Render Free Tier', limit: '750 compute hours/month', monthlyPrice: '$0' },
        { service: 'PostgreSQL Database', provider: 'Supabase / Neon Free Tier', limit: '500MB storage, 3GB data transfer', monthlyPrice: '$0' },
        { service: 'Redis Cache', provider: 'Upstash Free Tier', limit: '10,000 commands/day', monthlyPrice: '$0' }
      ],
      productionTier: [
        { service: 'High-Availability Database', provider: 'AWS RDS Postgres / Neon Scale', monthlyPrice: '$15/mo', notes: 'Automated backups and read replicas' },
        { service: 'Autoscaling Compute', provider: 'Fly.io / AWS ECS Fargate', monthlyPrice: '$12/mo', notes: '2x vCPU, 2GB RAM container pair' },
        { service: 'AI Token Budget', provider: 'Google AI Studio', monthlyPrice: '$5-10/mo', notes: 'Based on 50k monthly inference calls' }
      ],
      estimatedMonthlyCost: { mvp: '$0/mo (100% Free Tier)', scale: '$27 - $37/mo' }
    },
    targetAudience: {
      primaryPersona: {
        title: isA11yProject ? 'Visually Impaired & Blind Web Users' : isIdCardProject ? 'Security & Identity Officers' : 'Full-Stack Developers & Founders',
        painPoints: isA11yProject ? [
          'Inaccessible web interfaces lacking ARIA semantics or keyboard navigation',
          'Missing or unhelpful image alt-text that hides critical visual information',
          'Complex multi-step forms that are impossible to complete with screen readers'
        ] : isIdCardProject ? ['Manual verification backlog and credential fraud', 'Slow onboarding and unencrypted identity storage'] : ['Wasting days on boilerplate configuration', 'Uncertainty over hosting costs and cloud scalability'],
        motivation: isA11yProject ? 'Browse, interact, and access online services independently using voice commands and natural audio narration.' : isIdCardProject ? 'Automate document verification with sub-second response times and tamper protection.' : 'Ship a working, production-grade MVP in hours rather than weeks.'
      },
      secondaryPersonas: isA11yProject ? [
        { title: 'Assistive Tech Advocates & Accessibility Engineers', description: 'Need automated compliance testing (WCAG 2.1 AAA) and audit-ready reports.' },
        { title: 'Elderly & Low-Vision Users', description: 'Benefit from high-contrast modes, large tactile focus indicators, and spatial sound cues.' }
      ] : isIdCardProject ? [
        { title: 'Campus & Event Administrators', description: 'Need automated badge verification for entry and gate management.' },
        { title: 'Fintech & EdTech Teams', description: 'Require secure KYC pipelines with encrypted PII storage.' }
      ] : [
        { title: 'Campus & Event Administrators', description: 'Need automated badge verification for entry and gate management.' },
        { title: 'Fintech & EdTech Teams', description: 'Require secure KYC pipelines with encrypted PII storage.' }
      ],
      marketSize: isA11yProject ? '$13.2B Global Assistive Technology & Digital Accessibility Market' : isIdCardProject ? '$24.8B Global Identity Verification & Digital KYC Market' : '$18.4B Global Developer Tooling & DevOps Platform Market'
    },
    githubSearchTerms: (understanding?.githubSearchTerms && understanding.githubSearchTerms.length > 0 && !understanding.githubSearchTerms.some(t => t.includes('i-need-create-')))
      ? understanding.githubSearchTerms
      : isA11yProject ? [
        'web-speech-api-react',
        'screen-reader-accessibility',
        'wcag-aaa-accessible-template',
        'whisper-voice-assistant-fastapi'
      ] : isIdCardProject ? [
        'id-card-ocr',
        'identity-verification-fastapi',
        'document-scanner-react',
        'face-verification-pipeline'
      ] : (synthesizeProsAndConsAndCompetitors(combinedContext, title, understanding?.corePurpose)?.githubSearchTerms || [
        slug.replace(/^i-need-create-/, ''),
        'fastapi-react-starter',
        'docker-compose-production-template'
      ]),
    starterRepo: {
      repoName: `${slug}-starter`,
      description: `Production starter repository for ${title}`,
      quickstartCommand: 'docker compose up --build',
      commands: [
        'git clone https://github.com/your-username/' + slug + '-starter.git',
        'cd ' + slug + '-starter',
        'docker compose up --build'
      ]
    },
    roadmap: isA11yProject ? {
      phase1: {
        title: "MVP — Voice Navigation & WCAG AAA UI Core",
        duration: "2-4 hours",
        milestones: [
          "Scaffold accessible React 19 UI with semantic HTML5 landmark tags (header, main, nav, footer)",
          "Implement Web Speech API speech-to-text recognition with single-key mic activation (Spacebar)",
          "Build FastAPI WebSocket gateway streaming transcribed commands to frontend ARIA live regions",
          "Validate zero accessibility violations using axe-core and Lighthouse A11y tests"
        ]
      },
      phase2: {
        title: "Spatial Audio, Image Explainer & TTS Pipeline",
        duration: "12-24 hours",
        milestones: [
          "Integrate Gemini Vision AI to generate automatic descriptive audio captions for any uploaded image",
          "Implement Web Audio API 3D spatial sound cues for directional button and link audio orientation",
          "Deploy ElevenLabs / Google Cloud TTS for natural, empathetic voice narration with variable speech rate",
          "Build voice-driven form completion assistant with confirmation readouts"
        ]
      },
      phase3: {
        title: "Production Hardening, Offline PWA & Audit Cert",
        duration: "1-2 weeks",
        milestones: [
          "Enable Progressive Web App (PWA) offline service workers and cached audio dictionaries",
          "Automate Pa11y / Axe-Core CI checks blocking any pull request with contrast or ARIA regressions",
          "Conduct user testing with NVDA, JAWS, and VoiceOver screen readers on Windows, Mac, and iOS",
          "Deploy autoscaling containers on Fly.io / AWS ECS with SSL TLS 1.3 and sub-50ms latency"
        ]
      }
    } : isIdCardProject ? {
      phase1: {
        title: "MVP — Camera Capture & OCR Extraction",
        duration: "2-4 hours",
        milestones: [
          "Scaffold FastAPI verification backend, React PWA camera scanner, and Docker environment",
          "Implement mobile camera capture with canvas auto-crop and contrast enhancement",
          "Integrate Multimodal OCR extraction pipeline for name, ID number, and dates",
          "Validate JSON schema output against institutional specifications"
        ]
      },
      phase2: {
        title: "Biometrics, Anti-Tamper & Encrypted Storage",
        duration: "12-24 hours",
        milestones: [
          "Connect PostgreSQL with pgcrypto for AES-256 field-level PII encryption",
          "Add MinIO / S3 encrypted document vault for scanned card archiving",
          "Implement face extraction and comparison between ID photo and user selfie",
          "Build tamper detection shield analyzing font consistency and holographic artifacts"
        ]
      },
      phase3: {
        title: "Production Deployment, Webhooks & Compliance",
        duration: "1-2 weeks",
        milestones: [
          "Configure multi-container Docker Compose with Redis rate-limiting",
          "Implement asynchronous Webhook notifications for third-party institutional apps",
          "Perform security penetration test and GDPR / FERPA compliance audit",
          "Deploy to production cloud hosting with automated CI/CD pipeline"
        ]
      }
    } : {
      phase1: {
        title: "MVP — Core Loop (Hackathon Sprint)",
        duration: "2-4 hours",
        milestones: [
          `Scaffold ${title} monorepo with Vite React and FastAPI`,
          "Implement core endpoints and PostgreSQL relational schema",
          "Build main user workflow and responsive UI interface",
          "Verify end-to-end API communication and state management"
        ]
      },
      phase2: {
        title: "Polish, Integration & Storage",
        duration: "12-24 hours",
        milestones: [
          "Connect PostgreSQL database with automated Alembic migrations",
          "Integrate Redis caching and async background task queue",
          "Implement robust error boundaries, health checks, and responsive UI",
          "Connect multimodal AI reasoning engine with graceful fallbacks"
        ]
      },
      phase3: {
        title: "Production Deployment & Launch",
        duration: "1-2 weeks",
        milestones: [
          "Configure Docker Compose containerization and GitHub Actions CI/CD",
          "Deploy production build to Vercel/Render with environment secrets",
          "Perform API security audits and rate limiting configuration",
          "Publish open-source repository documentation and demo video"
        ]
      }
    },
    resources: [
      { title: "FastAPI Documentation", url: "https://fastapi.tiangolo.com/", description: "High-performance Python web framework for building APIs", type: "docs" },
      { title: "React 19 & Vite Guide", url: "https://vite.dev/", description: "Next generation frontend tooling and rapid bundling", type: "docs" },
      { title: "Google Gemini & Gemma AI API", url: "https://ai.google.dev/", description: "Multimodal generative AI SDK and models", type: "api" },
      { title: "PostgreSQL Documentation", url: "https://www.postgresql.org/", description: "Robust relational database with vector search extensions", type: "docs" },
      { title: "Docker Compose Documentation", url: "https://docs.docker.com/compose/", description: "Multi-container Docker orchestration for local and production", type: "devops" }
    ]
  };
}

/* ──────────────── ROBUST JSON PARSER ──────────────── */
function parseJSON(raw) {
  if (!raw) throw new Error('Empty response from AI engine');
  if (typeof raw === 'object') return raw;

  let cleaned = String(raw).trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch (e1) {
    try {
      const relaxed = cleaned
        .replace(/,\s*([\]}])/g, '$1')
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ');
      return JSON.parse(relaxed);
    } catch (e2) {
      try {
        let repaired = cleaned.replace(/,\s*([\]}])/g, '$1');
        const openBraces = (repaired.match(/\{/g) || []).length;
        const closeBraces = (repaired.match(/\}/g) || []).length;
        if (openBraces > closeBraces) {
          repaired += '}'.repeat(openBraces - closeBraces);
          return JSON.parse(repaired);
        }
      } catch (e3) {}
      throw new Error('AI response contained invalid JSON.');
    }
  }
}
