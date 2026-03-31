---
slug: /
sidebar_position: 1
---

# Dev Templates

Project templates for the Urbalurba developer platform. Each template provides a working starting point for a specific language or framework, with devcontainer setup, Kubernetes manifests, and GitHub Actions CI/CD.

## What's Here

- **[Architecture](architecture.md)** — Platform architecture diagrams and technical details
- **[Developer Setup Guide](developer-setup-guide.md)** — Step-by-step local development setup
- **[Case Study: Red Cross Norway](case-study-red-cross.md)** — Volunteer developer platform case study
- **[AI Developer Guide](ai-developer/README.md)** — AI-assisted development workflow documentation

## Templates

Browse all templates on the [Templates page](/templates), or see the [template docs](category/templates) for details.

Templates are installed inside the devcontainer using the `dev-template` command.

### App Templates

Installed by `dev-template`. Provides application code, Kubernetes manifests, Dockerfile, and CI/CD pipeline.

| Template | Languages |
|----------|-----------|
| Basic Web Server | TypeScript, Python, Java, C#, Go, PHP |
| Basic React App | React/TypeScript with Designsystemet |

### AI Workflow Templates

Installed by `dev-template-ai` (coming soon). Sets up AI-assisted development workflows.

| Template | Description |
|----------|-------------|
| Plan-Based AI Workflow | Structured development with plans, phases, and validation |
