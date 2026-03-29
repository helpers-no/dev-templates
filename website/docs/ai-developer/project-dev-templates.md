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
