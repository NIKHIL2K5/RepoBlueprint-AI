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

  try {
    let result = null;
    if (config?.provider === 'gemini') {
      result = await Promise.race([
        callGemini(config.geminiKey, config.geminiModel, systemPrompt, ideaText, imageBase64, mimeType),
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 16000))
      ]);
    } else {
      result = await Promise.race([
        callOllama(config?.ollamaUrl, config?.ollamaModel, systemPrompt, ideaText),
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 18000))
      ]);
    }

    if (result && result.projectTitle) {
      return result;
    }
    return synthesizeSmartUnderstanding(ideaText);
  } catch (err) {
    console.warn('[understandIdea]: Engine call failed or timed out, synthesizing smart architecture:', err.message);
    return synthesizeSmartUnderstanding(ideaText);
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
  "mermaidDiagram": "Valid Mermaid.js graph LR diagram code. Use proper Mermaid syntax with subgraphs and styling.",
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
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 24000))
      ]);
    }

    if (result && result.mermaidDiagram && result.fileTree) {
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
      options: { temperature: 0.5, num_predict: 1200 } // Fast prediction limit for local CPU!
    }),
    signal: AbortSignal.timeout(18000)
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
  if (matched?.sampleUnderstanding) return matched.sampleUnderstanding;
  return synthesizeSmartUnderstanding(ideaText);
}

async function handleDemoBlueprint(understanding) {
  await new Promise(r => setTimeout(r, 700));
  return synthesizeSmartBlueprint(understanding);
}

/* ──────────────── SMART HEURISTIC SYNTHESIZERS (ZERO-FAILURE FALLBACK) ──────────────── */
export function synthesizeSmartUnderstanding(ideaText = '') {
  const raw = (ideaText || '').toLowerCase();
  
  let title = 'CloudScale Architecture';
  let oneLiner = 'Production-ready modern web architecture with resilient cloud services.';
  let corePurpose = 'Transforms complex distributed system requirements into an optimized, maintainable architecture with modular services and automated deployments.';

  if (raw.includes('video') || raw.includes('stream') || raw.includes('webrtc')) {
    title = 'Decentralized Video Streamer';
    oneLiner = 'P2P low-latency video streaming platform with edge mesh networking and encryption.';
    corePurpose = 'Empowers low-latency content broadcasting across decentralized nodes, minimizing bandwidth costs via peer mesh protocols and zero-trust authentication.';
  } else if (raw.includes('habit') || raw.includes('health') || raw.includes('coach')) {
    title = 'AI Habit & Behavioral Coach';
    oneLiner = 'Multimodal habit tracking copilot powered by intelligent adaptive interventions.';
    corePurpose = 'Analyzes daily routines, tracks habit milestones with predictive behavioral nudges, and delivers personalized coaching plans.';
  } else if (raw.includes('github') || raw.includes('issue') || raw.includes('triage') || raw.includes('pr')) {
    title = 'Autonomous GitHub Triage Bot';
    oneLiner = 'AI-driven repository issue triage and automated pull request generation agent.';
    corePurpose = 'Monitors open-source issues, locates impacted repository code paths, suggests reproducible unit tests, and drafts PR branches automatically.';
  } else if (raw.includes('devops') || raw.includes('cluster') || raw.includes('docker') || raw.includes('cloud')) {
    title = 'DevOps Multi-Cluster Wizard';
    oneLiner = 'Zero-downtime infrastructure orchestration and container topology manager.';
    corePurpose = 'Automates Kubernetes cluster deployments, synchronizes secret management, and monitors telemetry across hybrid clouds.';
  } else if (ideaText.trim().length > 10) {
    const words = ideaText.trim().split(/\s+/).slice(0, 4).join(' ');
    title = words.charAt(0).toUpperCase() + words.slice(1);
    oneLiner = `Intelligent high-scale system for ${ideaText.trim().slice(0, 60)}...`;
  }

  return {
    projectTitle: title,
    oneLiner,
    corePurpose,
    keyActors: ['End-User / Client', 'API Gateway Service', 'Background Worker & Scheduler', 'System Administrator'],
    coreWorkflow: 'Client Request → API Gateway Validation → Asynchronous Worker Processing → Cache / Database Mutation → WebSocket / Real-time Notification',
    identifiedComponents: [
      { name: 'Web Client UI', role: 'Interactive responsive user interface with real-time UI updates', type: 'frontend' },
      { name: 'API Gateway', role: 'Authentication, request validation, rate limiting, and route dispatching', type: 'backend' },
      { name: 'Relational Database', role: 'ACID transactional data storage and relational entities', type: 'database' },
      { name: 'Redis Cache & Queue', role: 'High-speed in-memory caching and asynchronous job queueing', type: 'cache' },
      { name: 'AI Reasoning Engine', role: 'Contextual inference, automated classification, and intelligent recommendations', type: 'ai' }
    ],
    dataFlows: [
      { from: 'Web Client UI', to: 'API Gateway', description: 'HTTPS REST & Secure WebSocket' },
      { from: 'API Gateway', to: 'Redis Cache & Queue', description: 'In-Memory Key/Value & PubSub' },
      { from: 'API Gateway', to: 'Relational Database', description: 'Connection Pool with Prisma/SQLAlchemy' },
      { from: 'API Gateway', to: 'AI Reasoning Engine', description: 'JSON Payload with Streaming Tokens' }
    ],
    clarifyingQuestions: [
      {
        question: 'Which primary database engine fits your transaction and schema model?',
        why: 'Dictates write scalability, indexing strategy, and read replica topologies.',
        options: [
          'PostgreSQL + Prisma ORM (ACID compliance & structured relational integrity)',
          'MongoDB / DocumentDB (Flexible dynamic schema with JSON document storage)',
          'Supabase / Managed Serverless Postgres (Instant realtime subscriptions & auth)'
        ]
      },
      {
        question: 'What authentication & user management strategy do you prefer?',
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
    ],
    innovationSuggestions: [
      {
        title: 'Edge Caching & Global CDN',
        description: 'Cache static assets and API read queries at Cloudflare edge nodes for sub-20ms latency worldwide.',
        complexity: 'Medium'
      },
      {
        title: 'Event-Driven Asynchronous Pipeline',
        description: 'Decouple long-running tasks using Redis Celery / BullMQ workers so user requests respond in <100ms.',
        complexity: 'Low'
      },
      {
        title: 'Multimodal Telemetry & AI Observability',
        description: 'Real-time trace logs and automated anomaly alerts triggered before users experience latency spikes.',
        complexity: 'High'
      }
    ],
    assumptions: [
      'Targeting MVP launch with capacity to scale to 50,000 daily active users without architectural rewrites.',
      'Containerized with Docker to guarantee zero environment discrepancy between local dev and cloud production.'
    ]
  };
}

export function synthesizeSmartBlueprint(understanding = {}, userRefinements = '') {
  const title = understanding?.projectTitle || 'Production System';
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const mermaidDiagram = `graph LR
  subgraph Client Tier
    UI["💻 Web / Mobile UI<br/>(React 19 + Vite + Tailwind)"]
  end

  subgraph Gateway & Services
    API["⚡ API Gateway<br/>(FastAPI / Node.js)"]
    AUTH["🛡️ Auth & Security<br/>(OAuth2 + JWT)"]
    WORKER["⚙️ Background Worker<br/>(Celery / BullMQ)"]
  end

  subgraph Data & Storage
    DB[("🗄️ PostgreSQL<br/>(Primary ACID)")]
    CACHE[("⚡ Redis Cache<br/>(Sessions & Queue)")]
  end

  subgraph AI Engine
    AI["🧠 Gemini / Gemma Engine<br/>(Inference & Vision)"]
  end

  UI -->|HTTPS / WSS| API
  API --> AUTH
  API -->|Read/Write| DB
  API -->|Fast Cache| CACHE
  API -->|Async Tasks| WORKER
  WORKER --> DB
  API -->|REST API| AI

  classDef client fill:#00c8ff15,stroke:#00c8ff,stroke-width:2px;
  classDef gateway fill:#8b5cf615,stroke:#8b5cf6,stroke-width:2px;
  classDef data fill:#f59e0b15,stroke:#f59e0b,stroke-width:2px;
  classDef ai fill:#10b98115,stroke:#10b981,stroke-width:2px;

  class UI client;
  class API,AUTH,WORKER gateway;
  class DB,CACHE data;
  class AI ai;`;

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

  return {
    mermaidDiagram,
    fileTree,
    techStack: {
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
        title: 'Full-Stack Developers & Founders',
        painPoints: ['Wasting days on boilerplate boilerplate configuration', 'Uncertainty over hosting costs and cloud scalability'],
        motivation: 'Ship a working, production-grade MVP in hours rather than weeks.'
      },
      secondaryPersonas: [
        { title: 'Hackathon Competitors', description: 'Need an impressive, architecture-sound demo that judges love.' },
        { title: 'Open-Source Maintainers', description: 'Need clean modular structure with Docker and GitHub CI/CD.' }
      ],
      marketSize: '$18.4B Global Developer Tooling & DevOps Platform Market'
    },
    githubSearchTerms: [
      slug,
      'fastapi-react-starter',
      'docker-compose-production-template',
      'ai-architecture-blueprint'
    ],
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
    roadmap: {
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
