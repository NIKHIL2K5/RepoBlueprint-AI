# Contribution Quick Reference

Welcome to the **RepoBlueprint AI** contribution guide.

> 💡 **Looking for complete instructions?**  
> For the comprehensive guide on codebase architecture, local development, Oxlint guidelines, and pull request workflows, please see [**CONTRIBUTING.md**](./CONTRIBUTING.md).

---

## ⚡ Quick Start for Contributors

1. **Fork & Clone**:
   ```bash
   git clone https://github.com/<your-username>/RepoBlueprint-AI.git
   cd RepoBlueprint-AI/RepoBlueprint-AI
   ```

2. **Install & Run**:
   ```bash
   npm install
   npm run dev
   ```

3. **Verify Lint & Build**:
   ```bash
   npm run lint
   npm run build
   ```

---

## 📋 Contributor Checklist

Before submitting a pull request, please ensure:

- [ ] Code strictly follows our [Code of Conduct](./CODE_OF_CONDUCT.md).
- [ ] No API keys, secrets, or sensitive tokens are committed.
- [ ] `npm run lint` passes cleanly with Oxlint.
- [ ] `npm run build` succeeds without bundle or syntax errors.
- [ ] UI changes maintain visual consistency across both **Light** and **Dark** editorial themes.
- [ ] Commit messages follow the [Conventional Commits](https://www.conventionalcommits.org/) format (e.g. `feat(scope): message`).

---

For detailed architectural notes, service breakdown, and guidelines, visit [CONTRIBUTING.md](./CONTRIBUTING.md).
