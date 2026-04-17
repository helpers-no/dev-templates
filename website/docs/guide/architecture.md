---
sidebar_position: 6
---

# Architecture Overview

:::caution[Under review — 2026-04-17]

This page is being updated to reflect the current platform architecture. Some diagrams and descriptions may be outdated.

:::

The platform is built from three projects — **DCT** (the developer's devcontainer), **UIS** (the infrastructure provisioner), and **TMP** (the template library and this website). Together they give a developer a two-command path from "I picked a template" to "my app is running with a database in a local Kubernetes cluster."

This page shows how the pieces connect.

## Developer Platform Architecture

```mermaid
flowchart TB
    subgraph "Developer's Local Machine (Dev environment)"
        vs[VS Code]
        dc[Devcontainer]
        git[Git Repository]
        browser[Web Browser]
    end

    subgraph "Local Kubernetes Cluster (Test environment)"
        traefik[Traefik Ingress]
        argo[ArgoCD]
        ns[Application]
    end

    subgraph "GitHub"
        repo[Private Repository]
        actions[GitHub Actions]
        ghcr[GitHub Container Registry]
    end

    vs -->|Uses| dc
    dc -->|Push code| git
    git -->|Sync| repo
    repo -->|Trigger| actions
    actions -->|Build & Push| ghcr
    argo -->|Monitor| repo
    argo -->|Deploy to| ns
    ghcr -->|Pull image| argo
    traefik -->|Route to| ns
    browser -->|Access Test deployment| traefik
    browser -->|Access Dev deployment| dc
```

### Key Components

- **VS Code + Devcontainers**: Provides a consistent development environment for application code
- **Rancher Desktop**: Delivers local Kubernetes clusters for developers
- **ArgoCD**: Handles GitOps-based deployment of applications
- **Traefik**: Ingress controller pre-installed in the cluster for routing
- **GitHub Actions**: Automated CI/CD pipelines for building and pushing container images
- **GitHub Container Registry**: Storage for container images
- **provision-host**: Utility container with administrative tools for configuration

## Three-Project Architecture

The developer platform is built from three repositories that work together:

```mermaid
flowchart LR
    subgraph TMP["TMP (dev-templates)"]
        registry[template-registry.json]
        yaml[template-info.yaml]
        cats[template-categories.yaml]
        website[Docusaurus Website]
    end

    subgraph DCT["DCT (devcontainer-toolbox)"]
        devtemplate[dev-template]
        configure[dev-template configure]
        bridge[uis-bridge.sh]
        tools[dev-setup / tool installers]
    end

    subgraph UIS["UIS (urbalurba-infrastructure)"]
        uisdeploy[uis deploy]
        uisconfigure[uis configure]
        uisexpose[uis expose]
        uistemplate[uis template]
        k8s[Kubernetes Cluster]
    end

    yaml --> registry
    cats --> registry
    registry --> website
    registry --> devtemplate
    registry --> uistemplate
    devtemplate -->|installs tools| tools
    configure -->|calls via| bridge
    bridge -->|docker exec| uisconfigure
    bridge -->|docker exec| uisexpose
    uisdeploy -->|Ansible| k8s
    uisconfigure -->|kubectl| k8s
    uisexpose -->|port-forward| k8s
    uistemplate -->|calls| uisdeploy
    uistemplate -->|calls| uisconfigure
```

| Project | Role | What it does |
|---------|------|-------------|
| **TMP** (dev-templates) | Template library | Stores all templates, generates the registry, hosts the Docusaurus website. The glue between DCT and UIS. |
| **DCT** (devcontainer-toolbox) | Developer environment | Runs `dev-template` (browse/install templates), `dev-template configure` (set up services), and tool installers. Runs inside the devcontainer. |
| **UIS** (urbalurba-infrastructure) | Infrastructure platform | Runs `uis deploy` (deploy services to K8s), `uis configure` (create databases/users), `uis expose` (port-forward services), `uis template` (install stack templates). Runs in the provision-host container. |

## Template System Architecture

### Metadata Flow

```mermaid
flowchart TD
    subgraph Source["Source (maintained by hand)"]
        tc1["templates/template-categories.yaml"]
        tc2["ai-templates/template-categories.yaml"]
        tc3["uis-stack-templates/template-categories.yaml"]
        ti1["templates/*/template-info.yaml"]
        ti2["ai-templates/*/template-info.yaml"]
        ti3["uis-stack-templates/*/template-info.yaml"]
    end

    subgraph CI["CI/CD (GitHub Actions)"]
        gen["generate-registry.ts"]
        val["validate-metadata.sh"]
        docs["generate-docs-markdown.sh"]
    end

    subgraph Output["Generated (auto-committed)"]
        reg["template-registry.json"]
        mdx["Template detail pages (MDX)"]
        idx["Category index pages"]
    end

    subgraph Consumers
        docusaurus["Docusaurus Website"]
        dctcli["DCT dev-template"]
        uiscli["UIS uis template"]
    end

    tc1 & tc2 & tc3 --> val
    ti1 & ti2 & ti3 --> val
    val --> gen
    gen --> reg
    reg --> docs
    docs --> mdx & idx
    reg --> docusaurus
    reg --> dctcli
    reg --> uiscli
```

### Two Execution Contexts

Templates run in two different containers depending on their `context`:

```mermaid
flowchart LR
    subgraph dctctx["Devcontainer (context: dct)"]
        dt["dev-template"]
        dtc["dev-template configure"]
        app["App/AI/Doc templates"]
    end

    subgraph uisctx["Provision-host (context: uis)"]
        ut["uis template"]
        uc["uis configure"]
        infra["Infrastructure/Stack templates"]
    end

    subgraph k8sctx["Kubernetes Cluster"]
        svc["PostgreSQL, Redis, etc."]
    end

    dt -->|installs| app
    dtc -->|docker exec via uis-bridge| uc
    ut -->|installs| infra
    uc -->|kubectl| svc
```

| | Devcontainer Templates | UIS Templates |
|---|---|---|
| **Context** | `dct` | `uis` |
| **Folders** | `templates/`, `ai-templates/` | `uis-stack-templates/` |
| **Command** | `dev-template` | `uis template` |
| **Runs in** | Devcontainer (DCT) | Provision-host (UIS) |
| **Has access to** | Project workspace, npm, pip | kubectl, helm, Ansible |
| **Installs** | Files into user's project | Services into K8s cluster |

### Connection Pattern

When an app template needs a database, the connection flows through UIS:

```
DCT devcontainer → uis-bridge.sh → docker exec → UIS provision-host → kubectl → K8s service
```

The developer's app connects to services via `host.docker.internal:<port>`. UIS handles port exposure (kubectl port-forward or NodePort). This works the same whether K8s is local or remote — DCT never connects to K8s directly.

## Infrastructure Setup

```mermaid
flowchart TD
    subgraph Host["Host Machine (macOS, Windows, Linux)"]
        vscode[VSCode]

        subgraph rancher[Rancher Desktop]
            k8s[Kubernetes Cluster]
            provision[provision-host]
        end
    end
```

### Setup Steps

1. **Install Rancher Desktop** — Provides the Kubernetes cluster and container runtime needed for local development
2. **Clone Infrastructure Repository** — One script sets up a kubernetes cluster with tools and services needed to develop and deploy applications. An utilities container `provision-host` for managing the local cluster and providing administrative tools. No code or programs are installed on your local machine, all needed tools are installed in the container. Everyone has the same setup, and the setup is the same on all platforms (macOS, Windows, Linux).

## Kubernetes Manifest Design

The manifests are structured to be automatically parameterized during template setup. The files are in the `manifests/` directory and are used by ArgoCD to deploy the application.

- **deployment.yaml**: Defines the application Deployment and Service
- **kustomization.yaml**: Ties the resources together for ArgoCD

Routing is handled automatically by the platform — when you run `uis argocd register`, it creates a Traefik IngressRoute that routes `<app-name>.localhost` to your application. Repos do not need to include ingress manifests.

## Folder Structure

Each app template follows this structure:

```plaintext
project-repository/
├── app/               # Application code
│   └── main.ext
├── config/            # Init files for service setup (if template has requires)
│   └── init-database.sql
├── manifests/         # Kubernetes manifests for ArgoCD
│   ├── deployment.yaml
│   └── kustomization.yaml
├── .github/workflows/ # CI/CD pipeline
├── Dockerfile         # Container definition
├── template-info.yaml # Template metadata (used by dev-template configure)
└── README.md
```
