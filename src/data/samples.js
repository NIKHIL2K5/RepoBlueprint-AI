/**
 * Pre-seeded sample blueprints and ideas for instant interactive demo
 * and lightning-fast hackathon presentations.
 */
export const SAMPLE_IDEAS = [
  {
    id: 'ai-habit',
    label: 'AI Habit Coach',
    emoji: '🧠',
    description: 'Smart habit tracking with multimodal AI coaching',
    text: `Project: AI-Powered Habit Tracker with Smart Coaching

Core Idea:
A mobile-first web app that helps users build and maintain habits using AI-driven personalization.

User Flow:
- User logs into the dashboard
- Creates habits (workout, reading, meditation, etc.)
- Logs daily completions with optional mood/note
- AI analyzes patterns weekly and gives personalized coaching messages
- Streak system with gamification badges
- AI chatbot to discuss struggles and get motivation

Components I need:
- React frontend with beautiful habit cards
- FastAPI backend
- PostgreSQL database for user data and habit history
- Google Gemma / Gemini AI for coaching message generation
- Redis for caching and streak calculations
- Notification system (push/email)

Target: Busy professionals aged 25-35 who want to improve their daily routines`,
    sampleUnderstanding: {
      projectTitle: "HabitForge AI — Intelligent Habit Coach",
      oneLiner: "Personalized behavioral coaching and streak gamification powered by multimodal AI.",
      corePurpose: "Helps busy individuals break through habit plateaus by combining micro-journaling, algorithmic streak retention, and empathetic AI coaching insights.",
      keyActors: ["Daily Habit Tracker", "Personal Growth Seeker", "Accountability Coach (AI)", "System Scheduler"],
      coreWorkflow: "User checks in daily with mood/notes → System calculates streaks & detects drift → Gemma AI generates actionable coaching advice → Real-time push notification delivered.",
      identifiedComponents: [
        { name: "Web / Mobile Client", role: "PWA with offline check-ins and haptic feedback", type: "frontend" },
        { name: "FastAPI Core Engine", role: "Handles business logic, auth, and analytics", type: "backend" },
        { name: "PostgreSQL Store", role: "Stores user profiles, habits, and check-in logs", type: "database" },
        { name: "Gemma 3 / Gemini Inference", role: "Generates weekly psychological summaries and proactive tips", type: "ai" },
        { name: "Redis In-Memory Cache", role: "Real-time streak calculation and rate limiting", type: "cache" },
        { name: "Cron Worker", role: "Triggers daily reminder alerts and streak freeze audits", type: "other" }
      ],
      dataFlows: [
        { from: "PWA Client", to: "FastAPI Backend", description: "JSON check-in payload with timestamp and optional mood note via HTTPS" },
        { from: "FastAPI Backend", to: "Redis", description: "Atomic INCR on user streak counter and leaderboard index" },
        { from: "FastAPI Backend", to: "PostgreSQL", description: "Persists historical log and sentiment metrics" },
        { from: "Cron Worker", to: "Gemma AI", description: "Batches weekly activity trends to synthesize customized motivation" },
        { from: "FastAPI Backend", to: "Web Push API", description: "Sends tailored notifications at user's optimal wake window" }
      ],
      clarifyingQuestions: [
        {
          question: "Should habit check-ins support voice notes or photo verification?",
          why: "Determines whether audio transcription and image multimodal vision models are required.",
          options: ["Text & Emoji Check-in Only", "Photo Proof + AI Vision Verification", "Voice Note Journaling with Whisper"]
        },
        {
          question: "How should accountability and social mechanics work?",
          why: "Dictates whether WebSocket channels and real-time multiplayer feeds are necessary.",
          options: ["Solo Private Tracking Only", "1-on-1 Friend Accountability Buddy", "Public Squad Leaderboards"]
        },
        {
          question: "What monetization model is envisioned for launch?",
          why: "Affects Stripe checkout integration and token quota tiering.",
          options: ["100% Free Open-Source Community", "Freemium with Pro AI Coaching Tier", "One-Time Lifetime Supporter Pass"]
        }
      ],
      innovationSuggestions: [
        { title: "Slump Predictor AI", description: "Analyzes early drop-off signals (delayed check-ins, shorter notes) and intervenes before streaks break.", complexity: "Medium" },
        { title: "Smart Habit Stacking", description: "Automatically suggests anchoring new habits onto existing high-consistency routines.", complexity: "Low" },
        { title: "Voice Debrief Agent", description: "30-second conversational end-of-day audio check-in with your AI coach.", complexity: "High" }
      ],
      assumptions: [
        "Users primarily check in from mobile browsers or desktop once per day.",
        "Free tier Gemini API provides ample token budget for weekly synthesis.",
        "Offline check-ins sync to cloud once network connectivity resumes."
      ]
    },
    sampleBlueprint: {
      mermaidDiagram: `graph LR
  subgraph ClientLayer["🖥️ Frontend Client"]
    UI["PWA React App\n(Vite + Tailwind)"]
    ServiceWorker["Offline Sync\nService Worker"]
  end

  subgraph Gateway["🚪 API Gateway"]
    API["FastAPI App\n(Uvicorn / Docker)"]
    Auth["JWT + OAuth2\nSecurity Guard"]
  end

  subgraph Intelligence["🧠 AI Reasoning"]
    Gemma["Gemma / Gemini\nCoaching Agent"]
    PromptEngine["Behavioral Science\nPrompt Builder"]
  end

  subgraph Storage["🗄️ Persistence & Cache"]
    DB[("PostgreSQL\nHabits & Logs")]
    Cache[("Redis\nStreaks & Sessions")]
  end

  subgraph Background["⚙️ Async Tasks"]
    Worker["Celery / RQ\nNotification Worker"]
    Push["Web Push\nNotification Service"]
  end

  UI --> Auth
  Auth --> API
  UI -.-> ServiceWorker
  ServiceWorker --> API
  API --> DB
  API --> Cache
  API --> PromptEngine
  PromptEngine --> Gemma
  Worker --> DB
  Worker --> Gemma
  Worker --> Push
  Push -.-> UI`,
      fileTree: [
        {
          path: "README.md",
          type: "file",
          description: "Production documentation with quickstart and architecture",
          content: `# HabitForge AI 🧠
> Intelligent Habit Coach powered by Gemma 3 & FastAPI.

## ✨ Features
- 🚀 **Offline-first PWA**: Log habits anywhere, anytime.
- 🤖 **Empathetic AI Coach**: Synthesizes weekly progress into actionable psychological advice.
- ⚡ **Zero-Latency Streaks**: Redis-backed atomic streak calculation.
- 🔒 **Privacy-Preserving**: Your personal reflections are encrypted in Postgres.

## 🛠️ Quickstart
\`\`\`bash
# 1. Clone repository
git clone https://github.com/your-username/habitforge-ai.git
cd habitforge-ai

# 2. Setup backend
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 3. Setup frontend
cd ../frontend
npm install
npm run dev
\`\`\`
`
        },
        {
          path: "backend/requirements.txt",
          type: "file",
          description: "Python backend dependencies",
          content: `fastapi>=0.111.0
uvicorn[standard]>=0.30.0
pydantic>=2.7.0
sqlalchemy>=2.0.30
asyncpg>=0.29.0
redis>=5.0.4
google-genai>=0.1.1
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
httpx>=0.27.0
pytest>=8.2.0`
        },
        {
          path: "backend/app/main.py",
          type: "file",
          description: "FastAPI server entrypoint and route handlers",
          content: `from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os

app = FastAPI(
    title="HabitForge AI API",
    version="1.0.0",
    description="Intelligent coaching and habit management API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class HabitCreate(BaseModel):
    title: str
    target_days_per_week: int = 7
    category: str = "health"

class CheckInRequest(BaseModel):
    habit_id: str
    completed: bool
    mood_rating: Optional[int] = 5
    note: Optional[str] = None

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}

@app.post("/api/v1/habits/check-in")
async def log_check_in(payload: CheckInRequest):
    # Atomic streak increment & emotional feedback
    return {
        "status": "recorded",
        "habit_id": payload.habit_id,
        "current_streak": 14,
        "coaching_tip": "Consistency builds identity. 14 days in a row is in the top 5% of all users!"
    }
`
        },
        {
          path: "backend/app/coach.py",
          type: "file",
          description: "Gemma AI coaching synthesis engine",
          content: `from google import genai
import os

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY", ""))

async def synthesize_weekly_feedback(user_name: str, habit_history: list) -> str:
    prompt = f"""
    You are an empathetic, world-class behavioral scientist and habit coach.
    Analyze the user's weekly check-in record for {user_name}:
    {habit_history}

    Provide:
    1. A genuine 1-sentence celebration of what went well.
    2. A pinpoint observation of any friction patterns.
    3. Exactly ONE micro-action for the upcoming week.
    Keep tone warm, concise, and energizing.
    """
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )
    return response.text
`
        },
        {
          path: "frontend/package.json",
          type: "file",
          description: "Frontend Vite + React package manifest",
          content: `{
  "name": "habitforge-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "lucide-react": "^0.383.0",
    "canvas-confetti": "^1.9.3"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.2.11"
  }
}`
        },
        {
          path: "frontend/src/App.jsx",
          type: "file",
          description: "Main habit tracking interface with interactive cards",
          content: `import React, { useState } from 'react';

export default function HabitApp() {
  const [habits, setHabits] = useState([
    { id: '1', title: 'Deep Work (2 Hours)', streak: 12, completedToday: true },
    { id: '2', title: 'Hydration (3L)', streak: 8, completedToday: false },
    { id: '3', title: 'Evening Walk / Reset', streak: 21, completedToday: false }
  ]);

  const toggleHabit = (id) => {
    setHabits(prev => prev.map(h => {
      if (h.id === id) {
        return {
          ...h,
          completedToday: !h.completedToday,
          streak: !h.completedToday ? h.streak + 1 : h.streak - 1
        };
      }
      return h;
    }));
  };

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1>🔥 HabitForge AI</h1>
      <p style={{ color: '#888' }}>Your personal streak velocity is peaking this week.</p>
      <div style={{ display: 'grid', gap: 12, marginTop: 24 }}>
        {habits.map(h => (
          <div key={h.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: 16, borderRadius: 12, border: '1px solid #333', background: '#111', color: '#fff'
          }}>
            <div>
              <div style={{ fontWeight: 600 }}>{h.title}</div>
              <div style={{ fontSize: 13, color: '#f59e0b' }}>🔥 {h.streak} day streak</div>
            </div>
            <button
              onClick={() => toggleHabit(h.id)}
              style={{
                padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: h.completedToday ? '#10b981' : '#3b82f6', color: '#fff', fontWeight: 600
              }}
            >
              {h.completedToday ? '✓ Done' : 'Complete'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}`
        },
        {
          path: "docker-compose.yml",
          type: "file",
          description: "Complete local development container stack",
          content: `version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/habitforge
      - REDIS_URL=redis://redis:6379/0
      - GEMINI_API_KEY=\${GEMINI_API_KEY}
    depends_on:
      - db
      - redis

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=habitforge
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:`
        }
      ],
      techStack: {
        frontend: { name: "React (Vite) + Tailwind CSS", reason: "Ultra-fast bundle size, responsive mobile PWA capabilities, and smooth micro-interactions.", alternatives: ["Next.js 14", "SvelteKit"] },
        backend: { name: "FastAPI (Python 3.11)", reason: "Asynchronous I/O performance, native type safety with Pydantic, and direct Python AI ecosystem interop.", alternatives: ["Node.js / Express", "Go Fiber"] },
        database: { name: "PostgreSQL 16 (Neon / Supabase)", reason: "ACID compliance for historical habit streaks, JSONB flexibility for metadata, and rock-solid indexing.", alternatives: ["SQLite / Turso", "MongoDB"] },
        ai: { name: "Google Gemma 3 / Gemini 2.5 Flash", reason: "Exceptional reasoning speed, generous free API tier (15 RPM), and sharp behavioral analysis.", alternatives: ["Ollama (Llama 3.3 70B)", "Mistral 7B"] },
        devops: { name: "Docker Compose + Vercel / Render", reason: "Zero-cost local reproducibility with seamless 1-click cloud deployments.", alternatives: ["Fly.io", "AWS App Runner"] },
        extras: [
          { name: "Redis", purpose: "Atomic streak incrementation and caching active sessions" },
          { name: "Web Push API", purpose: "Delivers behavioral nudge notifications directly to user phones" },
          { name: "canvas-confetti", purpose: "Haptic visual reward celebration on streak milestones" }
        ]
      },
      costBreakdown: {
        freeTier: [
          { service: "Frontend Hosting", provider: "Vercel / Cloudflare Pages", limit: "100 GB bandwidth / mo", monthlyPrice: "$0" },
          { service: "Backend API", provider: "Render Free / Fly.io", limit: "750 compute hours / mo", monthlyPrice: "$0" },
          { service: "Relational Database", provider: "Neon / Supabase", limit: "500 MB storage & pooling", monthlyPrice: "$0" },
          { service: "AI Model Inference", provider: "Google Gemini Free Tier", limit: "15 RPM & 1M tokens/day", monthlyPrice: "$0" },
          { service: "Redis Cache", provider: "Upstash Redis", limit: "10,000 commands / day", monthlyPrice: "$0" }
        ],
        productionTier: [
          { service: "Vercel Pro", provider: "Vercel", monthlyPrice: "$20/mo", notes: "Custom domains, analytics & DDoS SLA" },
          { service: "Managed Postgres", provider: "Neon Pro", monthlyPrice: "$19/mo", notes: "Autoscaling compute & point-in-time recovery" },
          { service: "AI Batch Inference", provider: "Gemini Pay-As-You-Go", monthlyPrice: "~$5-15/mo", notes: "$0.075 per 1M input tokens" },
          { service: "Compute Container", provider: "Render Starter", monthlyPrice: "$7/mo", notes: "No cold starts, persistent CPU" }
        ],
        estimatedMonthlyCost: { mvp: "$0/mo", scale: "$35–50/mo" }
      },
      targetAudience: {
        primaryPersona: {
          title: "The Overwhelmed Self-Improver",
          motivation: "Wants to build healthy daily routines but suffers from motivation dips and all-or-nothing mindset.",
          painPoints: ["Rigid trackers make them feel like failures after missing 1 day", "Lack of personalized adaptation", "Cluttered bloated habit apps"]
        },
        secondaryPersonas: [
          { title: "Neurodivergent / ADHD Adults", description: "Benefits from micro-steps, positive reinforcement, and low executive burden." },
          { title: "Hackathon Competitors & Founders", description: "Tracking sprint recovery, sleep, and deep work blocks during intense periods." }
        ],
        marketSize: "The digital habit tracking and digital wellness market exceeds $3.8B globally, with a 15.2% CAGR."
      },
      githubSearchTerms: ["habit-tracker", "fastapi-react", "ai-coaching", "gemini-api"],
      roadmap: {
        phase1: {
          title: "MVP — Core Loop (Hackathon Sprint)",
          duration: "2-4 hours",
          milestones: [
            "Scaffold Vite React frontend and FastAPI boilerplate",
            "Implement habit creation and toggle check-in state",
            "Integrate Gemini API for instant motivational coaching response",
            "Add animated streak celebration"
          ]
        },
        phase2: {
          title: "Polish & Retention",
          duration: "1 week",
          milestones: [
            "Connect Neon Postgres database with Alembic migrations",
            "Enable PWA service worker for offline logging support",
            "Build weekly trend report card with AI summaries"
          ]
        },
        phase3: {
          title: "Multiplayer & Scale",
          duration: "1 month",
          milestones: [
            "Add accountability buddy invite links",
            "Implement multimodal voice debrief journal",
            "Launch on Product Hunt and Hacker News"
          ]
        }
      },
      resources: [
        { title: "FastAPI Official Documentation", url: "https://fastapi.tiangolo.com/", description: "Comprehensive guide to building async Python APIs", type: "docs" },
        { title: "Google GenAI SDK Quickstart", url: "https://ai.google.dev/gemini-api/docs/quickstart", description: "Official reference for Gemini API and Gemma models", type: "api" },
        { title: "Vite PWA Plugin Guide", url: "https://vite-pwa-org.netlify.app/", description: "Zero-config PWA offline caching and install banners", type: "library" },
        { title: "Neon Serverless Postgres", url: "https://neon.tech/docs/introduction", description: "Instant branching and serverless autoscaling database", type: "docs" }
      ],
      readmeContent: "# HabitForge AI Starter Repo\nCreated by RepoBlueprint AI"
    }
  },
  {
    id: 'oss-navigator',
    label: 'OSS Navigator',
    emoji: '🧭',
    description: 'Open-source contribution guide bot',
    text: `Project: Open-Source Navigator — AI Copilot for New Contributors

The Problem:
New developers are scared to contribute to open-source projects. They don't know where to start, what files to look at, or how to write a good PR.

Solution:
A tool where you paste any GitHub repository URL, and the AI scans the codebase and produces:
1. A beginner-friendly architecture overview ("Here's what each folder does")
2. A "good first issue" recommendation based on the contributor's skill level
3. A step-by-step guide: "Fork → Clone → Setup → Find Issue → Code → PR"
4. Auto-generated PR description template for the chosen issue

Architecture:
- Next.js frontend
- GitHub API to fetch repo info and issues
- Gemma / Gemini to analyze README, folder structure, and generate explanations
- Supabase for user sessions and saved repos
- Edge functions for API calls`
  },
  {
    id: 'devops-cli',
    label: 'DevOps CLI Wizard',
    emoji: '⚙️',
    description: 'AI-powered infrastructure setup CLI',
    text: `Project: DevOps CLI Wizard

Concept:
A command-line tool that helps junior developers and indie hackers set up production-ready cloud infrastructure without needing DevOps expertise.

How It Works:
1. Developer runs: npx devops-wizard init
2. Answers a few questions: "What stack? What cloud? Expected traffic?"
3. AI generates the complete infrastructure-as-code (Terraform / Docker Compose / K8s YAML)
4. Automatically creates GitHub Actions CI/CD pipeline
5. Explains every generated file in plain English

Technical Components:
- Node.js CLI (Commander.js)
- Gemma AI for configuration generation and explanations
- Template engine for Terraform/YAML generation
- GitHub API for Actions workflow creation
- Multiple cloud support: Vercel, AWS, Fly.io, Railway

Target: Junior developers, indie hackers, and startup CTOs who want production infrastructure fast`
  }
];
