---
sidebar_position: 1
---

# Contributors

Welcome! Dev Templates is an open-source project and we appreciate contributions of all kinds.

## Ways to Contribute

| Contribution | Description | Start here |
|-------------|-------------|------------|
| **Create a template** | Add a new language or framework template | [Creating a Template](creating-a-template.md) |
| **Fix bugs** | Fix template code, manifests, or CI/CD issues | Check [GitHub Issues](https://github.com/helpers-no/dev-templates/issues) |
| **Improve docs** | Fix errors, add examples, clarify instructions | See [README Structure](readme-structure.md) |
| **File issues** | Report bugs or suggest new templates | Open an issue on GitHub |

## Quick Start

```bash
# 1. Fork and clone the repository
git clone https://github.com/<your-username>/dev-templates.git
cd dev-templates

# 2. Create a feature branch
git checkout -b feature/my-new-template

# 3. Create your template (see guide below)
mkdir templates/my-new-template
# ... add template-info.yaml, app code, README, Dockerfile, manifests

# 4. Validate locally
bash scripts/validate-metadata.sh
bash scripts/validate-docs.sh

# 5. Generate and test
bash scripts/generate-registry.sh
bash scripts/generate-docs-markdown.sh --force
npm run build --prefix website

# 6. Submit a pull request
git push origin feature/my-new-template
```

## Guides

- [Creating a Template](creating-a-template.md) — step-by-step guide for the most common contribution
- [Template Metadata Reference](template-metadata.md) — all template-info.yaml fields explained
- [Naming Conventions](naming-conventions.md) — how to name files, folders, and IDs
- [Scripts Reference](scripts-reference.md) — validation and generation scripts
- [README Structure](readme-structure.md) — standard sections for template READMEs
