# Working Inside the DevContainer

All projects use the **DevContainer Toolbox (DCT)** for development. The AI must run all commands inside the devcontainer, never on the host machine.

---

## The Rule

**ALL commands that install packages, run code, or execute tools MUST run inside the devcontainer.**

Do NOT run these on the host machine:
- Package managers (npm, pip, cargo, etc.)
- Build tools and compilers
- Test runners
- Application servers
- Any project-specific commands

---

## Key Paths Inside the Container

```
/opt/devcontainer-toolbox/           # DCT installation root — READ ONLY, never edit
├── additions/                        # Tool install scripts
│   ├── install-*.sh                  # Run directly to install a tool
│   ├── config-*.sh                   # Configuration scripts
│   ├── service-*.sh                  # Background service managers
│   └── lib/                          # Shared libraries
└── manage/
    └── tools.json                    # Machine-readable inventory of all available tools

/workspace/                           # Mounted project directory (always this path)
├── .devcontainer/                    # Container configuration
├── .devcontainer.extend/             # Project tool/service config (committed to git)
│   ├── enabled-tools.conf            # Tools to auto-install on container creation
│   ├── enabled-services.conf         # Services to auto-start
│   └── project-installs.sh           # Custom project setup (npm install, etc.)
└── .devcontainer.secrets/            # Local-only secrets (gitignored)
    └── env-vars/                     # Environment variables and API keys
```

---

## Getting Help

Run `dev-help` anywhere inside the container to see all available commands and the toolbox version:

```bash
dev-help
```

---

## Universal Commands

These commands are always available inside the container:

| Command | Purpose |
|---------|---------|
| `dev-help` | Show all available commands and version info |
| `dev-setup` | Interactive menu — install tools, manage services |
| `dev-env` | Show installed tools and environment info |
| `dev-tools` | Output machine-readable tool inventory (JSON) |
| `dev-services` | Manage background services (start/stop/status/logs) |
| `dev-check` | Configure and validate Git identity and credentials |
| `dev-sync` | Update toolbox scripts without rebuilding container |
| `dev-update` | Update devcontainer-toolbox to latest version |
| `dev-template` | Create project files from templates |
| `dev-log` | Display the container startup log |

---

## Available Tools

The file `/opt/devcontainer-toolbox/manage/tools.json` contains a machine-readable inventory of all tools available for installation. It includes metadata for each tool: id, name, description, category, and a check command to verify installation.

The install scripts live in `/opt/devcontainer-toolbox/additions/`. To work with a tool:

```bash
# See what's available
cat /opt/devcontainer-toolbox/manage/tools.json

# Install a tool (run the script directly)
/opt/devcontainer-toolbox/additions/install-dev-python.sh

# Get help and options for a tool
/opt/devcontainer-toolbox/additions/install-dev-python.sh --help

# Uninstall a tool
/opt/devcontainer-toolbox/additions/install-dev-python.sh --uninstall
```

Or use the interactive menu:

```bash
dev-setup
```

---

## NEVER Edit DCT Files

**NEVER edit files inside `/opt/devcontainer-toolbox/`.** That directory is maintained by the DevContainer Toolbox project, not by individual projects.

If something needs fixing or you need a new feature, register an issue:
https://github.com/helpers-no/devcontainer-toolbox/issues

---

## Pre-installed Tools

Every DCT container includes:

- Python 3.12, Node.js 22 LTS
- Docker CLI, GitHub CLI
- Git, curl, wget, zip/unzip
- Standard Unix tools (bash, grep, sed, awk, etc.)
- Supervisord for background services

Additional tools are installed per project via `.devcontainer.extend/enabled-tools.conf`.

---

## Accessing the Container from the Host

When the AI runs on the host machine (e.g., Claude Code outside VS Code), use `docker exec` to run commands inside the container.

### Find the container

```bash
docker ps --format '{{.Names}}\t{{.Image}}' | grep devcontainer-toolbox
```

### Run commands

```bash
docker exec <container-name> bash -c "cd /workspace && <command>"
```

The project's `project-*.md` file will specify the container name or discovery command for this specific project.

---

## Project Customization

### Shared with team (committed to git)

`.devcontainer.extend/enabled-tools.conf` — list tool IDs to auto-install:
```
dev-python
dev-golang
tool-kubernetes
```

`.devcontainer.extend/project-installs.sh` — custom setup script:
```bash
cd /workspace && npm install
```

### Local only (gitignored)

`.devcontainer.secrets/env-vars/` — API keys and credentials:
```bash
echo "your-api-key" > .devcontainer.secrets/env-vars/api-key
```

These are automatically available as environment variables inside the container.
