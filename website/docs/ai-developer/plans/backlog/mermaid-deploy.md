# Deploy flowchart — for manual editing

> Edit this file to get the diagram right, then hand it back so I can
> update the builder to match.

## CI/CD deployment (E1: python-basic-webserver-database)

```mermaid
flowchart LR
    dev(["Developer"])
    browser["Web Browser"]

    subgraph dct["DCT devcontainer"]
        src["source code"]
    end

    subgraph gh["GitHub"]
        repo["repo"]
        actions["GitHub Actions"]
        ghcr["Container Registry"]
    end

    subgraph k8s["Local Kubernetes Cluster"]
        traefik["Traefik Ingress"]
        argo["ArgoCD"]
        pod["my-app pod"]
        sec["K8s Secret<br/>my-app-db"]
        svc[("PostgreSQL<br/>my_app_db")]
    end

    dev -->|git push| src
    src -->|push| repo
    repo -->|trigger| actions
    actions -->|build + push image| ghcr
    argo -->|monitors| repo
    ghcr -->|image pull| argo
    argo -->|deploys| pod
    sec -->|DATABASE_URL| pod
    pod -->|default.svc.cluster.local:5432| svc
    traefik -->|routes to| pod
    browser -->|my-app.localhost| traefik
    dev --> browser
```

## Deploy flow (E1: python-basic-webserver-database)

Sequence diagram showing what happens when the developer pushes code
and ArgoCD picks it up.

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant DCT as DCT devcontainer
    participant GH as GitHub
    participant Actions as GitHub Actions
    participant GHCR as Container Registry
    participant Argo as ArgoCD
    participant K8s as Local Kubernetes cluster
    participant DB as PostgreSQL
    Dev->>DCT: git push
    DCT->>GH: push to repo
    GH->>Actions: trigger workflow
    Actions->>Actions: build container image
    Actions->>GHCR: push image
    Argo->>GH: detects manifest change
    Argo->>GHCR: pull image
    Argo->>K8s: deploy my-app pod
    K8s->>K8s: mount K8s Secret (DATABASE_URL)
    K8s->>DB: pod connects via default.svc.cluster.local:5432
    Note over Dev,K8s: App now accessible at my-app.localhost via Traefik
```
