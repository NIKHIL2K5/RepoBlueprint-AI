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
Analyze the user's project idea (which may come as raw text, structured thoughts, or a hand-drawn napkin sketch/diagram).
Respond with ONLY a valid, parseable JSON object — absolutely NO markdown code fences, NO backticks, NO text before or after.

Required JSON schema:
{
  "projectTitle": "Concise catchy project title",
  "oneLiner": "One-sentence high-impact pitch",
  "corePurpose": "2-3 clear sentences explaining the real-world problem and technical solution",
  "keyActors": ["User Role 1", "External System 2", "Admin / Worker 3"],
  "coreWorkflow": "Step-by-step main flow: Input → Processing → Output / Feedback",
  "identifiedComponents": [
    { "name": "ComponentName", "role": "What it does specifically", "type": "frontend|backend|database|ai|cache|external-api|other" }
  ],
  "dataFlows": [
    { "from": "Component A", "to": "Component B", "description": "Protocol and data transferred" }
  ],
  "clarifyingQuestions": [
    { "question": "Question text", "why": "Why this architectural decision matters", "options": ["Option A", "Option B", "Option C"] }
  ],
  "innovationSuggestions": [
    { "title": "Feature Name", "description": "How it gives the project an unfair advantage", "complexity": "Low|Medium|High" }
  ],
  "assumptions": ["Assumption 1", "Assumption 2"]
}

Generate 3-4 smart clarifying questions and 3 innovative suggestions. Be technically precise and creative.`;

  if (config.provider === 'gemini') {
    return callGemini(config.geminiKey, config.geminiModel, systemPrompt, ideaText, imageBase64, mimeType);
  } else {
    return callOllama(config.ollamaUrl, config.ollamaModel, systemPrompt, ideaText);
  }
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
  "mermaidDiagram": "Valid Mermaid.js graph LR diagram code. Use proper Mermaid syntax with subgraphs and styling. Example: graph LR\\n  subgraph Client\\n    A[Web App]\\n  end\\n  subgraph Server\\n    B[API]\\n  end\\n  A --> B",
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
  "roadmap": {
    "phase1": { "title": "MVP — Core Loop (Hackathon Sprint)", "duration": "2-4 hours", "milestones": ["Milestone 1", "Milestone 2", "Milestone 3"] },
    "phase2": { "title": "Core Polish & Persistence", "duration": "1 week", "milestones": ["Milestone 1", "Milestone 2"] },
    "phase3": { "title": "Scale & Community Launch", "duration": "1 month", "milestones": ["Milestone 1", "Milestone 2"] }
  },
  "resources": [
    { "title": "Official Docs / Guide", "url": "https://...", "description": "Why this matters", "type": "docs|api|library|tutorial" }
  ],
  "readmeContent": "Production README.md markdown string"
}

For fileTree: Include README.md, LICENSE, .gitignore, package.json or requirements.txt, docker-compose.yml, and 4-6 real source code files with working boilerplate!`;

  if (config.provider === 'gemini') {
    return callGemini(config.geminiKey, config.geminiModel, prompt, null, null, null);
  } else {
    return callOllama(config.ollamaUrl, config.ollamaModel, prompt, null);
  }
}

/* ──────────────── DYNAMIC MODEL DISCOVERY ──────────────── */
async function discoverAvailableModels(apiKey) {
  const discovered = [];
  const endpoints = [
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        const models = (data.models || [])
          .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
          .map(m => m.name.replace(/^models\//, ''));
        discovered.push(...models);
      }
    } catch (e) {
      // ignore network errors in discovery
    }
  }

  // Deduplicate
  return Array.from(new Set(discovered));
}

/* ──────────────── DIRECT REST FALLBACK ──────────────── */
async function callGeminiDirectRest(apiKey, model, systemPrompt, ideaText, imageBase64, mimeType, apiVersion = 'v1beta') {
  const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`;

  const contents = [];
  const parts = [];

  if (imageBase64 && mimeType) {
    parts.push({
      inline_data: {
        mime_type: mimeType,
        data: imageBase64,
      }
    });
    parts.push({
      text: `${systemPrompt}\n\nAnalyze this whiteboard/napkin sketch and the following context:\n\n${ideaText || 'Analyze the drawn architecture diagram completely.'}`
    });
  } else {
    parts.push({
      text: `${systemPrompt}\n\nProject details to analyze:\n\n${ideaText || ''}`
    });
  }

  contents.push({ role: 'user', parts });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 8192,
      }
    })
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    const message = errorJson?.error?.message || `HTTP ${res.status}`;
    throw new Error(`Google API ${res.status}: ${message}`);
  }

  const data = await res.json();
  const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) throw new Error('Empty response content from Gemini REST API');
  return parseJSON(textOutput);
}

/* ──────────────── GEMINI API CALL WITH MULTI-LAYER FALLBACK ──────────────── */
async function callGemini(apiKey, preferredModel, systemPrompt, ideaText, imageBase64, mimeType) {
  if (!apiKey || apiKey.trim().length < 10) {
    throw new Error('Missing Gemini API Key. Please enter a valid API key.');
  }

  const cleanKey = apiKey.trim();

  // Step 1: Discover models authorized specifically on this API key
  const authorizedModels = await discoverAvailableModels(cleanKey);
  console.log('Discovered authorized models for API key:', authorizedModels);

  // Build the prioritized list of models to try
  const modelsToTry = [];
  if (preferredModel && !modelsToTry.includes(preferredModel)) {
    modelsToTry.push(preferredModel);
  }
  // Add models discovered from user's account
  for (const m of authorizedModels) {
    if (!modelsToTry.includes(m)) modelsToTry.push(m);
  }
  // Add default candidate models
  for (const m of DEFAULT_CANDIDATE_MODELS) {
    if (!modelsToTry.includes(m)) modelsToTry.push(m);
  }

  let lastError = null;

  // Try using the official @google/genai SDK first
  try {
    const ai = new GoogleGenAI({ apiKey: cleanKey });
    const parts = [];

    if (imageBase64 && mimeType) {
      parts.push({ inlineData: { data: imageBase64, mimeType } });
      parts.push({
        text: `${systemPrompt}\n\nAnalyze this whiteboard/napkin sketch and the following context:\n\n${ideaText || 'Analyze the drawn architecture diagram completely.'}`
      });
    } else {
      parts.push({ text: `${systemPrompt}\n\nProject details to analyze:\n\n${ideaText || ''}` });
    }

    for (const model of modelsToTry) {
      try {
        console.log(`Attempting generateContent with model: ${model} via SDK...`);
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts }],
          config: {
            temperature: 0.6,
            maxOutputTokens: 8192,
          }
        });

        if (response?.text) {
          return parseJSON(response.text);
        }
      } catch (err) {
        console.warn(`SDK model '${model}' failed:`, err?.message || err);
        lastError = err;
        // Don't retry if the key is explicitly invalid
        const msg = err?.message || '';
        if (msg.includes('API key not valid') || msg.includes('PERMISSION_DENIED') || msg.includes('API_KEY_INVALID')) {
          throw new Error('Invalid Gemini API Key. Please verify your key at aistudio.google.com/app/apikey');
        }
      }
    }
  } catch (sdkInitError) {
    console.warn('SDK attempt encountered error, trying direct REST fallback...', sdkInitError);
    lastError = sdkInitError;
  }

  // Step 3: If SDK failed, try direct REST calls to both v1 and v1beta
  for (const version of ['v1beta', 'v1']) {
    for (const model of modelsToTry) {
      try {
        console.log(`Attempting direct REST generateContent with model: ${model} on ${version}...`);
        return await callGeminiDirectRest(cleanKey, model, systemPrompt, ideaText, imageBase64, mimeType, version);
      } catch (restErr) {
        console.warn(`Direct REST model '${model}' on ${version} failed:`, restErr?.message || restErr);
        lastError = restErr;
      }
    }
  }

  // If all models return 404, format the error with clear explanation
  const errString = lastError?.message || '';
  if (errString.includes('404') || errString.includes('not found')) {
    throw new Error(
      'GOOGLE_404: Google returned 404 Not Found for this API key. This means the Generative Language API is not enabled on this Google Cloud project, or the key was created for a different service. Please create a fresh free key at https://aistudio.google.com/app/apikey, or click below to continue immediately in Instant Sandbox Demo mode!'
    );
  }

  throw lastError || new Error('Failed to generate response with Gemini API.');
}

/* ──────────────── OLLAMA API CALL (With Vite Proxy Fallback) ──────────────── */
async function callOllama(baseUrl, model, systemPrompt, userText) {
  const fullPrompt = userText
    ? `${systemPrompt}\n\nProject idea to analyze:\n\n${userText}`
    : systemPrompt;

  const cleanBase = (baseUrl || 'http://localhost:11434').replace(/\/$/, '');
  const isLocalhost = cleanBase.includes('localhost:11434') || cleanBase.includes('127.0.0.1:11434');
  const targetUrl = isLocalhost ? '/ollama/api/generate' : `${cleanBase}/api/generate`;
  const chosenModel = model || 'llama3.2:3b';

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: chosenModel,
        prompt: fullPrompt,
        format: 'json',
        stream: false,
        options: { temperature: 0.6, num_predict: 8192 }
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ollama error ${response.status}: ${text.slice(0, 200)}`);
    }

    const data = await response.json();
    return parseJSON(data.response);
  } catch (err) {
    console.error('Ollama request failed:', err);
    throw new Error(`Cannot connect to Ollama (${err.message || ''}). Make sure Ollama is running and model '${chosenModel}' is downloaded, or click Instant Demo mode.`);
  }
}

/* ──────────────── DEMO MODE HANDLERS ──────────────── */
async function handleDemoUnderstand(ideaText = '') {
  await new Promise(r => setTimeout(r, 600));
  const matched = SAMPLE_IDEAS.find(s => s.text.toLowerCase().includes(ideaText.slice(0, 30).toLowerCase()));
  if (matched?.sampleUnderstanding) {
    return matched.sampleUnderstanding;
  }
  return SAMPLE_IDEAS[0].sampleUnderstanding;
}

async function handleDemoBlueprint(understanding) {
  await new Promise(r => setTimeout(r, 800));
  return SAMPLE_IDEAS[0].sampleBlueprint;
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

  // Attempt direct parse
  try {
    return JSON.parse(cleaned);
  } catch (e1) {
    // Attempt cleaning trailing commas and unescaped newlines inside strings
    try {
      const relaxed = cleaned
        .replace(/,\s*([\]}])/g, '$1')
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' '); // remove raw control characters
      return JSON.parse(relaxed);
    } catch (e2) {
      // Last-ditch repair: try closing dangling JSON braces
      try {
        let repaired = cleaned.replace(/,\s*([\]}])/g, '$1');
        const openBraces = (repaired.match(/\{/g) || []).length;
        const closeBraces = (repaired.match(/\}/g) || []).length;
        if (openBraces > closeBraces) {
          repaired += '}'.repeat(openBraces - closeBraces);
          return JSON.parse(repaired);
        }
      } catch (e3) {
        // pass through to error below
      }
      console.error('JSON parse error, raw response snippet:', raw.slice(0, 500));
      throw new Error('AI response contained invalid JSON structure. Please retry or switch to Instant Demo mode.');
    }
  }
}
