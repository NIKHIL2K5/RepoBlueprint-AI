# 🏆 Hackathon Winning Pitch & Demo Playbook
> **RepoBlueprint AI** · Hacktoberfest Hack Day 2026 (NIAT-KKH × MLH)

---

## 🎤 1. The 90-Second Stage Pitch (Memorize or Reference This)

> **[Hook — 15 seconds]**
> *"Judges, every single person in this room has had that moment: you get an incredible idea, you grab a sheet of paper or whiteboard, you sketch a few boxes and arrows... and then you stall. You spend hours asking: Which tech stack? What will hosting cost? What boilerplate code do I need? Are there existing repos on GitHub doing this already?"*

> **[The Solution — 30 seconds]**
> *"We built **RepoBlueprint AI** — your Autonomous AI Technical Co-Founder. You don't need a prompt engineer. You can literally doodle your napkin architecture right here on our digital canvas, or snap a photo of your whiteboard. 
> Powered by Google's Gemma multimodal vision and local open-source models, RepoBlueprint reads handwriting, traces arrows, conducts a technical alignment interview with you, and hands you a production-ready blueprint in 30 seconds."*

> **[The 4-Part Output — 30 seconds]**
> *"What does it produce?
> 1. An interactive **Mermaid.js System Topology** you can zoom, edit, and export to SVG.
> 2. A **Live Cost Calculator** with a DAU slider from MVP to 100k users so you know your cloud bill before writing a line of code.
> 3. **Live GitHub Intelligence** searching real-world repositories to find your competitive moat.
> 4. And the game changer: a **1-Click Downloadable Starter Repo (.zip)** with real FastAPI, React, Docker Compose, and README boilerplate ready to open in VS Code."*

> **[The Close — 15 seconds]**
> *"Whether you use Google Cloud via Gemini API or run 100% offline and private on your laptop with Ollama, RepoBlueprint turns raw thoughts into shipping code. Thank you, and let's see it live!"*

---

## 🎬 2. The 3-Minute Live Demo Flow (Step-by-Step Clicks)

Follow this exact sequence when presenting to judges:

| Step | Action on Screen | What to Say |
| :--- | :--- | :--- |
| **1. The Launch** | Start on `http://localhost:5173/`. Point to the 3 engines (Gemini, Ollama, Instant Demo). Click **"Launch Instant Demo →"**. | *"Notice our engine flexibility: judges can test live with Google Gemini, 100% offline on-device with Ollama, or our instant sandbox with zero setup."* |
| **2. The Napkin Canvas** | You land on the Input stage. Click the **"✨ Example Napkin"** button. The canvas instantly loads the diagram with Client, API, Gemma AI, and Database boxes connected by arrows. | *"Look at this: here's our napkin whiteboard. A developer sketches their components and arrows. You can draw with pen, drop boxes, or snap a photo of a physical board."* |
| **3. Triggering Analysis** | Click **"🔬 Analyze My Blueprint →"**. The glowing scanning animation runs. | *"Now, Gemma's multimodal vision engine parses the spatial layout, identifying the frontend client, FastAPI backend, and persistent database."* |
| **4. The Alignment Interview** | You arrive at the Alignment screen. Show the detected components, toggle an innovation card, and click a quick option on the clarifying questions. | *"Notice this isn't a dumb prompt wrapper. It acts like a real Technical Co-Founder. It presents what it understood, suggests high-value innovations you can toggle, and asks architectural questions before generating code."* |
| **5. Master Dashboard** | Click **"🚀 Generate Master Architecture Blueprint →"**. The 6-tab dashboard appears with the glowing Mermaid diagram! | *"Boom! Here is the complete Master Architecture Blueprint."* |
| **6. Show the Diagram** | Zoom in with `🔍+ Zoom In`, click `📋 Copy Code`, or `💾 Export SVG`. | *"An interactive system topology rendered in real time, with communication protocols and data flows mapped."* |
| **7. The Cost Calculator** | Click the **"💰 Cost Calculator"** tab. Drag the DAU slider from 5,000 to 50,000 users. Watch the dynamic monthly cost update live! | *"Judges love this: an interactive infrastructure calculator. Drag the slider to see how your compute, database, and AI inference costs scale as you grow."* |
| **8. Live GitHub Search** | Click the **"🔎 Market & GitHub"** tab. Point to the live GitHub repository cards loaded with stars and tags. | *"Live GitHub intelligence discovering existing repositories in this space so you know your competitive advantage."* |
| **9. 1-Click Repo Download** | Click the **"📦 Starter Repo"** tab. Click `frontend/src/App.jsx` in the file tree to show the code, then click **"📥 Download Complete Starter Repo (.zip)"**! | *"And finally, the ultimate payoff: a complete starter repository with Docker Compose, backend API, and React frontend packaged into a .zip. Click download, open in VS Code, and start building."* |

---

## 💡 3. Tough Judge Questions & How to Win Them

### Q1: *"How is this different from asking ChatGPT or Claude for an architecture?"*
> **Your Answer:**
> *"Three key reasons:
> 1. **Multimodal Spatial Understanding**: ChatGPT text cannot take a photo of a whiteboard or a digital napkin doodle and extract the spatial arrow relationships between components.
> 2. **Interactive Architectural Alignment**: ChatGPT gives you one static wall of text. RepoBlueprint conducts a 2-phase co-founder interview to lock down database, auth, and scaling trade-offs before writing code.
> 3. **Actionable Artifacts**: Instead of a snippet in chat, RepoBlueprint generates an interactive visual topology, a live cloud cost calculator, live GitHub market intelligence, and bundles a real multi-file starter repository into a `.zip` file you can run with Docker Compose in 1 click."*

---

### Q2: *"Why did you use Gemma 4 / Gemini and Ollama?"*
> **Your Answer:**
> *"We built this for two specific hackathon tracks:
> 1. **Best Use of Gemma 4 / Gemini**: The multimodal vision capability is indispensable. Gemma's ability to trace hand-drawn arrows and component boxes is what makes the napkin-to-repo loop possible.
> 2. **Best Open-Source AI Project**: Developers building proprietary or confidential systems cannot upload their architectures to external cloud providers. By supporting **local Ollama models (Gemma 3 27B and Llama 3.3)**, RepoBlueprint runs 100% offline on the developer's laptop with zero cloud egress."*

---

### Q3: *"Does the generated starter repo actually work?"*
> **Your Answer:**
> *"Yes! Every generated `.zip` contains:
> - A production `README.md` and MIT License.
> - A `docker-compose.yml` for local container reproducibility.
> - A backend with real routes and Pydantic schemas (e.g. FastAPI / Express).
> - A frontend with real stateful UI components.
> It gives the hacker 3 hours of boilerplate done in 30 seconds so they can focus on their core product logic."*

---

## 📋 4. Final Submission Checklist
- [x] Submission file created: [`submissions/repoblueprint-ai_team-blueprint.md`](file:///c:/Users/satvi/Hacktoberfest-2026-NIAT-KKH/submissions/repoblueprint-ai_team-blueprint.md)
- [x] Both challenge tracks marked: `Best Open-Source AI Project` & `Best Use of Gemma 4`
- [x] Production build tested and verified (`npm run build` succeeds in 2s with 0 errors)
- [x] Zero API keys or secrets in the codebase
- [x] Interactive Napkin Canvas, Cost Calculator, Live GitHub API, and Zip Downloader verified in browser

**Go on stage, follow this script, and win that hackathon! 🚀**
