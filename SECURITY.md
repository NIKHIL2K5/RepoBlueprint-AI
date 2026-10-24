# Security Policy

RepoBlueprint AI takes the security and privacy of our users and contributors seriously. This document outlines our security policies, supported versions, responsible disclosure process, and key architectural security principles.

---

## 🛡️ Supported Versions

We provide security patches and updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| `main` (Latest) | :white_check_mark: |
| `< 1.0.0`       | :white_check_mark: |

---

## 🔒 Architectural Privacy & Security Model

RepoBlueprint AI is intentionally engineered with a client-first, zero-telemetry architecture:

### 1. API Key Protection
- **No Intermediary Servers**: RepoBlueprint AI operates completely client-side in your browser. There is no custom backend database or intermediate relay capturing your keys or prompts.
- **Local Storage Only**: If you choose to configure a Google Gemini API key, it is saved exclusively in your browser's `window.localStorage` and is only transmitted directly to Google's official endpoints (`https://generativelanguage.googleapis.com`).
- **No Telemetry or Tracking**: No third-party tracking scripts, keyloggers, or external analytics run on user inputs.

### 2. 100% Offline & Private Local Engine (Ollama)
- When using the Ollama engine, all prompts, canvas sketches, and voice transcripts are sent via a local Vite proxy directly to `http://localhost:11434`.
- **Zero Cloud Egress**: In this mode, no prompt data or visual media leaves your machine, making it safe for proprietary enterprise blueprints and confidential ideas.

### 3. Client-Side Code & Zip Generation
- Starter repository `.zip` files are packaged directly in your browser using `JSZip` and `file-saver`.
- File paths within generated ZIP archives are strictly sanitized to prevent path traversal (`../`) vulnerabilities.

### 4. Diagram & Script Injection Defenses
- Dynamic architecture diagrams rendered via Mermaid.js are constrained by secure sandboxing configurations to prevent cross-site scripting (XSS) via graph labels.

---

## 🚨 Reporting a Vulnerability

If you discover a potential security vulnerability within RepoBlueprint AI, please **do not** disclose it in a public GitHub issue.

Instead, please report it responsibly:

1. **Email**: Send an email to the repository maintainers or contact through GitHub private security advisories.
2. **Details to Include**:
   - A clear description of the vulnerability.
   - Exact steps or proof-of-concept (PoC) to reproduce the issue.
   - Potential impact and affected components.
   - Any suggested mitigations or patches.

### Response Timeline
- **Initial Response**: We will acknowledge receipt of your vulnerability report within **48 hours**.
- **Status Updates**: We will provide regular updates regarding the progress of investigation and fixes.
- **Resolution**: Once verified, we will develop and release a patch as quickly as possible. We will coordinate public disclosure after the fix is deployed.

---

## 🔐 Security Best Practices for Users & Developers

- **Never Commit Secrets**: Do not commit `.env` files, API keys, or private tokens to Git. RepoBlueprint AI has `.gitignore` pre-configured to avoid accidental commits.
- **Keep Dependencies Updated**: Regularly run `npm audit` to check for known vulnerabilities in upstream packages.
- **Revoke Compromised Keys**: If you suspect your Gemini API key was exposed, immediately revoke and regenerate it via [Google AI Studio](https://aistudio.google.com/app/apikey).

Thank you for helping keep RepoBlueprint AI safe and secure! 🛡️
