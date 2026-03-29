# Dev Templates

Project templates for the Urbalurba developer platform. Each template provides a working starting point for a specific language or framework, with devcontainer setup, Kubernetes manifests, and GitHub Actions CI/CD.

This repository is consumed by scripts in [devcontainer-toolbox](https://github.com/helpers-no/devcontainer-toolbox) — developers don't clone this repo directly.

## Repository Structure

```
dev-templates/
├── templates/        # App templates (installed by dev-template.sh)
├── ai-templates/     # AI workflow templates (installed by dev-template-ai.sh)
└── website/docs/     # Documentation (future Docusaurus site)
```

## App Templates

Installed inside the devcontainer by running `dev-template`. The script downloads the latest templates from this repo, shows a menu, and sets up the selected template in your project.

### Backend Templates

| Template | TypeScript | Python | Java | C# | Go | PHP |
|----------|------------|--------|------|----|----|-----|
| **[Basic Web Server](templates/typescript-basic-webserver/README-typescript-basic-webserver.md)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Simple Database Integration** (SQLite) | 🔄 | 🔄 | 🔄 | 🔄 | 🔄 | 🔄 |
| **Database Integration** (PostgreSQL) | 🔄 | 🔄 | 🔄 | 🔄 | 🔄 | 🔄 |
| **Message Queue** (Dapr/RabbitMQ) | 🔄 | 🔄 | 🔄 | 🔄 | 🔄 | 🔄 |
| **Serverless Functions** (Knative) | 🔄 | 🔄 | 🔄 | 🔄 | 🔄 | 🔄 |
| **Object Storage** (MinIO) | 🔄 | 🔄 | 🔄 | 🔄 | 🔄 | 🔄 |
| **Application Logging** | 🔄 | 🔄 | 🔄 | 🔄 | 🔄 | 🔄 |

### Application Templates

| Template | Designsystemet | TypeScript | React | Storybook | NextJs | Strapi CMS |
|----------|----------------|------------|-------|-----------|--------|------------|
| **[Basic React App](templates/designsystemet-basic-react-app/README-designsystemet-basic-react-app.md)** | ✅ | ✅ | ✅ | | | |
| **Basic NextJs App** | 🔄 | 🔄 | 🔄 | 🔄 | 🔄 | |

### Legend

- ✅ Available
- 🔄 Planned

### Template Features

| Template | Features | Description |
|----------|----------|-------------|
| **Basic Web Server** | Web page, Local dev, K8s deploy | Displays template name, current time, and "Hello World". Development setup for local development. Automatic deployment to local Kubernetes cluster. |
| **Simple Database Integration** | SQLite, CRUD, K8s deploy | SQLite database integration with Create, Read, Update, Delete operations. |
| **Database Integration** | PostgreSQL, CRUD, K8s deploy | PostgreSQL database integration using local Kubernetes cluster. |
| **Message Queue** | Dapr, Service-independent, K8s deploy | Dapr integration with RabbitMQ. Service-independent messaging (RabbitMQ, Kafka, Azure Service Bus, etc.) |
| **Serverless Functions** | Knative, Auto-scale, K8s deploy | Knative Functions for serverless execution. Automatic scaling and event-driven architecture. |
| **Object Storage** | MinIO, S3-compatible, K8s deploy | MinIO object storage with S3-compatible API for file operations. |
| **Basic React App** | Designsystemet, React, Vite, K8s deploy | Designsystemet components with React and Vite for development. |

## AI Workflow Templates

Installed inside the devcontainer by running `dev-template-ai` (coming soon). These templates set up AI-assisted development workflows in your project.

| Template | Description |
|----------|-------------|
| **[Plan-Based AI Workflow](ai-templates/plan-based-workflow/)** | Structured AI development with investigation plans, phased implementation, and human-in-the-loop validation. Installs portable docs, CLAUDE.md, and plan folder structure into `docs/ai-developer/`. |

## How Templates Work

### App Templates (`dev-template`)

Each app template includes:
- **Application code** — minimal working app
- **Kubernetes manifests** — deployment and service definitions
- **Dockerfile** — container definition
- **CI/CD** — GitHub Actions workflow for build and deploy

The `dev-template` command (in devcontainer-toolbox) downloads this repo, shows a menu, and copies the selected template into your project. It replaces `{{GITHUB_USERNAME}}` and `{{REPO_NAME}}` placeholders in manifests and workflows.

### AI Workflow Templates (`dev-template-ai`)

Each AI template includes:
- **Portable docs** — workflow, plan structure, git safety, devcontainer guide
- **CLAUDE.md** — project instructions for Claude Code
- **Plan folders** — backlog, active, completed with .gitkeep files
- **Project skeleton** — template for documenting project-specific setup

The `dev-template-ai` command copies the selected template into `docs/ai-developer/` in your project.

## Documentation

Additional documentation is available in `website/docs/`:

| Document | Description |
|----------|-------------|
| [Case Study: Red Cross Norway](website/docs/case-study-red-cross.md) | Volunteer developer platform case study |
| [Architecture](website/docs/architecture.md) | Platform architecture diagrams and technical details |
| [Developer Setup Guide](website/docs/developer-setup-guide.md) | Step-by-step local development setup |
| [AI Developer Guide](website/docs/ai-developer/README.md) | AI-assisted development workflow documentation |

## Contributing

This project uses AI-assisted development with a plan-based workflow. See the [AI Developer Guide](website/docs/ai-developer/README.md) for how to contribute.
