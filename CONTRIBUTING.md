# Contributing to RepoBlueprint AI

Thank you for your interest in contributing to **RepoBlueprint AI**! 🚀  
We welcome all kinds of contributions — bug fixes, new architecture stencils, localization improvements, UI polish, performance optimizations, and documentation updates.

Please take a few moments to review these guidelines before getting started.

---

## 📑 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Contributing Code](#contributing-code)
- [Development Setup](#development-setup)
- [Project Architecture & Tech Stack](#project-architecture--tech-stack)
- [Coding Guidelines & Standards](#coding-guidelines--standards)
- [Commit Message Conventions](#commit-message-conventions)
- [Pull Request Process](#pull-request-process)

---

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md). Please treat all members with respect and kindness.

---

## How Can I Contribute?

### Reporting Bugs

Before creating a new bug report, search the existing GitHub Issues to see if the problem has already been reported.

If you find a new bug, please open an issue including:
- **Title**: Clear and descriptive summary.
- **Environment**: Your OS, browser name/version, Node.js version.
- **Steps to Reproduce**: Detailed steps to recreate the issue.
- **Expected vs. Actual Behavior**: What you expected to happen vs. what actually happened.
- **Screenshots / Console Errors**: Relevant error logs or UI captures.

### Suggesting Features

We welcome ideas for new features, additional whiteboard stencils, or new model providers! When submitting a feature suggestion, please describe:
1. The problem or gap the feature addresses.
2. The proposed solution or user experience.
3. Any technical trade-offs or alternatives considered.

### Contributing Code

1. Fork the repository on GitHub.
2. Clone your fork locally.
3. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/my-cool-feature
   ```
4. Follow the setup instructions below to test your changes locally.
5. Push your branch and submit a Pull Request.

---

## Development Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- *(Optional)* [Ollama](https://ollama.com/) if testing offline local models

### 2. Install Dependencies

```bash
# Navigate to the project root
cd RepoBlueprint-AI/RepoBlueprint-AI

# Install packages
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

The app will start at `http://localhost:5173`.

### 4. Running the Linter

We use [Oxlint](https://oxc.rs/) for ultra-fast, zero-configuration linting:

```bash
npm run lint
```

Ensure all lint checks pass without errors before opening a PR.

### 5. Building for Production

To verify the production bundle builds cleanly:

```bash
npm run build
npm run preview
```

---

## Project Architecture & Tech Stack

RepoBlueprint AI is a client-side React 19 application built with Vite:

- **Frontend Core**: React 19, Vanilla CSS with custom properties (`src/styles/globals.css`).
- **Diagramming**: `mermaid` dynamic vector rendering.
- **File Bundler**: `jszip` and `file-saver` for client-side repo `.zip` generation with zero server dependencies.
- **Multimodal AI**: `@google/genai` SDK for Google Gemini / Gemma, and local reverse proxy for Ollama (`/ollama -> http://localhost:11434`).
- **Voice Engine**: Browser native Web Audio API (`AudioContext`, `AnalyserNode`) and SpeechSynthesis / SpeechRecognition.

### Key File Map

| Path | Purpose |
|---|---|
| `src/App.jsx` | Main state machine orchestrating stages (`setup` → `input` → `alignment` → `blueprint`) |
| `src/components/InputStage.jsx` | User input tabs: Napkin Canvas, Voice dictation, Photo upload, Text |
| `src/components/WhiteboardCanvas.jsx` | Interactive canvas engine with drawing tools and architecture stencils |
| `src/components/AlignmentPhase.jsx` | Phase 1 co-founder interview & trade-off decisions |
| `src/components/BlueprintDashboard.jsx` | Phase 2 suite: Mermaid graph, Stack, Cost calculator, GitHub cards, Zip downloader |
| `src/services/gemini.js` | Gemini vision API caller, Ollama local fetcher, and Demo mock generator |
| `src/services/zipper.js` | Bundles real multi-file starter templates into a downloadable zip file |
| `src/services/copilot.js` | Autonomous copilot chat logic and balanced-bracket DOM action runner |

---

## Coding Guidelines & Standards

1. **Design System & Styling**:
   - Use CSS custom properties defined in `src/styles/globals.css` (e.g., `var(--bg)`, `var(--surface)`, `var(--accent)`, `var(--border)`).
   - Avoid hardcoding arbitrary hex colors directly in CSS files.
   - Maintain full visual fidelity in both Light (`Warm Ivory`) and Dark (`Warm Charcoal`) modes.

2. **React Conventions**:
   - Prefer functional components with hooks.
   - Keep state localized to components unless shared across the top-level pipeline in `App.jsx`.
   - Clean up event listeners, intervals, and audio contexts in `useEffect` cleanup functions.

3. **Privacy & Security**:
   - **Never hardcode API keys, secrets, or tokens.**
   - API keys must only be stored client-side in `localStorage` and never transmitted to external logging or telemetry services.

4. **Performance**:
   - Avoid heavy re-renders during canvas sketching or audio recording.
   - Use `requestAnimationFrame` for high-frequency canvas and VU meter updates.

---

## Commit Message Conventions

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <short description>
```

### Common Types:
- `feat`: A new user-facing feature or stencil
- `fix`: A bug fix
- `docs`: Documentation changes (`README.md`, guides)
- `style`: Formatting, CSS tweaks, UI polish with no logic changes
- `refactor`: Code restructuring without adding features or fixing bugs
- `perf`: Performance optimizations
- `test`: Adding or updating tests

### Examples:
- `feat(canvas): add redis cache stencil and arrow snapping`
- `fix(audio): resolve audio context pause on tab change`
- `docs(readme): clarify ollama offline setup instructions`

---

## Pull Request Process

1. **Keep PRs Focused**: Address one bug or feature per pull request.
2. **Verify Code Quality**:
   - Run `npm run lint` and resolve any warnings or errors.
   - Run `npm run build` to confirm the production build completes without issues.
3. **Write a Clear Description**:
   - Summarize what changed and why.
   - Reference any relevant issue numbers (e.g., `Fixes #12`).
   - Include before-and-after screenshots for any UI changes.
4. **Respond to Feedback**: Project maintainers will review your pull request and may suggest tweaks.

Thank you for helping make RepoBlueprint AI the best open-source architecture studio! 🌟
