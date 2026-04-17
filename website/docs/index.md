---
slug: /
sidebar_position: 1
---

# Dev Templates

Project templates for the Urbalurba developer platform. Each template provides a working starting point for a specific language or framework, with devcontainer setup, Kubernetes manifests, and GitHub Actions CI/CD.

## What's Here

- **[Developer Setup Guide](guide/developer-setup-guide.md)** — Step-by-step local development setup
- **[Architecture](guide/architecture.md)** — Platform architecture diagrams and technical details
- **[Eir's Walkthrough](guide/eir-rescue-comms-walkthrough.md)** — From idea to Red Cross production — a volunteer developer's journey
- **[Case Study: Red Cross Norway](guide/case-study-red-cross.md)** — Volunteer developer platform case study
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
