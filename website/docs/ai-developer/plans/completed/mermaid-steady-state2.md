# Steady-state flowchart v2 — Developer outside DCT + browser

> **Status: Shipped (2026-04-12)** — Design for the Local development flowchart. Approved during [INVESTIGATE-architecture-diagram-v2.md](INVESTIGATE-architecture-diagram-v2.md) and implemented in `scripts/lib/build-architecture-mermaid.ts` via `buildLocalDevFlowchart(entry)`. Preserved here as a historical design reference — the code is the source of truth; this file captures the author's original intent.
>
> Builds on v1 from mermaid-steady-state.md. Developer moved outside DCT as an external actor. Browser added to close the feedback loop.

## Local development setup (E1: python-basic-webserver-database)

```mermaid
flowchart LR
    dev(["Developer"])
    browser["Web Browser"]

    subgraph dct["DCT devcontainer"]
        app["my-app"]
        env[".env"]
        tmpl["template-info.yaml"]
        cfg["dev-template configure"]
    end

    subgraph uis_group["UIS container"]
        uis["uis CLI"]
    end

    subgraph k8s["Local Kubernetes Cluster"]
        svc[("PostgreSQL<br/>my_app_db")]
        sec["K8s Secret<br/>my-app-db"]
    end

    dev -->|runs| cfg
    dev -->|uv run python app/app.py| app
    tmpl -->|read by| cfg
    cfg -->|sends config to| uis
    uis -->|creates + port-forward| svc
    uis -->|creates| sec
    uis -->|writes| env
    env --> app
    app -->|host.docker.internal:35432| uis
    app -.->|port 3000| browser
```

## Configure flow (E1: python-basic-webserver-database)

Sequence diagram showing the local development setup — what happens
when the developer runs `dev-template configure` and then starts the app.

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant DCT as DCT devcontainer
    participant UIS as UIS provision-host
    participant K8s as Local Kubernetes cluster
    participant DB as PostgreSQL
    Dev->>DCT: dev-template configure
    DCT->>UIS: request provisioning
    alt PostgreSQL not deployed
        UIS->>K8s: deploy PostgreSQL
    end
    UIS->>K8s: create namespace
    UIS->>DB: create database my_app_db + user
    UIS->>DB: run init-*.sql seed files
    UIS->>K8s: create K8s Secret (my-app-db)
    UIS->>UIS: kubectl port-forward 35432
    UIS-->>DCT: write .env (host.docker.internal:35432)
    Dev->>DCT: uv run python app/app.py
    DCT->>UIS: connect via host.docker.internal:35432
    UIS->>DB: forward connection
    Note over Dev,DCT: App now accessible at localhost:3000 via VS Code port forwarding
```
