# Project: Dev Templates

Project templates for the Urbalurba developer platform. Each template provides a working starting point for a specific language/framework, with devcontainer setup, Kubernetes manifests, and GitHub Actions CI/CD.

---

## Devcontainer

This project runs in a DCT devcontainer based on `ghcr.io/helpers-no/devcontainer-toolbox`.

### Finding the container

The container name changes on rebuild. Find it dynamically:

```bash
docker ps --format '{{.Names}}\t{{.Image}}' | grep devcontainer-toolbox
```

### Running commands from the host

```bash
docker exec <container-name> bash -c "cd /workspace && <command>"
```

### Workspace path

Inside the container: `/workspace/`

---

## Project Structure

```
dev-templates/
├── templates/                 # Project templates by language
│   ├── typescript-basic-webserver/
│   ├── python-basic-webserver/
│   ├── csharp-basic-webserver/
│   ├── golang-basic-webserver/
│   ├── java-basic-webserver/
│   ├── php-basic-webserver/
│   └── designsystemet-basic-react-app/
├── website/                   # Documentation site
│   └── docs/
│       └── ai-developer/      # AI developer docs (you are here)
│           └── plans/         # Implementation plans
└── README.md                  # Project overview and template catalog
```

---

## How Templates Work

Each template in `templates/` is a complete, runnable project that a developer copies to start a new application. Templates include:

- **Application code** — minimal working app (`app/`)
- **Kubernetes manifests** — deployment and service definitions (`manifests/`)
- **Dockerfile** — container definition
- **CI/CD** — GitHub Actions workflow for build and deploy
- **README** — setup and usage instructions

Templates are installed into new projects via the `dev-template` command inside the devcontainer.

---

## Auto-generated documentation sections

Each template's documentation page under `website/docs/templates/**` is generated at build time from `template-info.yaml`, vendored DCT/UIS registries, and the template's README. Two sections in particular are fully auto-generated and should **not** be hand-edited:

### Environment card (`<TemplateEnvironment />`)

Rendered by the React component at `website/src/components/TemplateEnvironment/index.tsx`. Shows the resolved tools, services, configure steps, run commands, and init files. Data is pre-resolved by `scripts/generate-registry.ts` and passed as JSON props.

### Architecture section (`## Architecture`)

Added by `scripts/lib/build-architecture-mermaid.ts`. Composes the complete `## Architecture` MDX block — **two diagrams per non-stack template**, each with a flowchart + a paired sequence diagram — during registry generation. The output is stored as a single `architectureMdx` string on each registry entry, and `scripts/generate-docs-markdown.sh` pastes it verbatim into the MDX page with a one-line `jq` read.

**The two diagrams:**

- **Local development** (`### Local development`) — How a developer sets up and runs the template locally. Developer runs `dev-template configure`, UIS provisions database + secret + port-forward, app connects via `host.docker.internal`, browser shows the result. Paired with a configure-flow sequence diagram.
- **Deployment** (`### Deployment`) — What happens when the developer pushes code. GitHub Actions builds the image, ArgoCD deploys the pod, Traefik routes traffic to `<app>.localhost`. Paired with a deploy-flow sequence diagram.

An **ArgoCD setup diagram** is documented in `plans/backlog/mermaid-setup-argocd.md` as a design reference but is currently SUPPRESSED until UIS ships the registration command. When UIS adds the command, add it as a third `### ArgoCD setup` sub-section.

**Four archetypes are handled:**

- **App + services + manifest** (e.g. `python-basic-webserver-database`) — both diagrams rendered in full
- **App + manifest, no services** (e.g. `python-basic-webserver`) — **Local development skipped** (would be a trivial dev → app → browser diagram); only `### Deployment` rendered
- **Stack template** (e.g. `postgresql-demo`) — single `### Overview` sub-section (stacks don't have separate local-dev/deploy stories)
- **Overlay template** (e.g. `plan-based-workflow`) — entire section suppressed; `architectureMdx` is `null`

**To change the diagrams**, edit `scripts/lib/build-architecture-mermaid.ts` and its unit tests at `scripts/test/build-architecture-mermaid.test.ts`, then re-run:

```bash
npx tsx scripts/generate-registry.ts
bash scripts/generate-docs-markdown.sh --force
```

Visual style matches the canonical diagrams in `website/docs/architecture.md` — plain text labels, no emojis, default Mermaid theming. **Design rule**: every edge source is an explicit node (never a subgraph id), to avoid the Mermaid rendering bug where subgraph-id edge sources could silently drop subgraphs.

**Current limitations**: multi-service templates throw at build time (only single-service templates are supported for now); the stack "consumer" node is a hardcoded generic label rather than being derived from cross-template data.

---

## Available Templates

| Template | Language/Framework | Status |
|----------|-------------------|--------|
| `typescript-basic-webserver` | TypeScript/Node.js | Available |
| `python-basic-webserver` | Python | Available |
| `csharp-basic-webserver` | C# | Available |
| `golang-basic-webserver` | Go | Available |
| `java-basic-webserver` | Java | Available |
| `php-basic-webserver` | PHP | Available |
| `designsystemet-basic-react-app` | React/TypeScript | Available |
