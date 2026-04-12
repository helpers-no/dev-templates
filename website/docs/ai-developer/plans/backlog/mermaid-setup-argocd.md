# ArgoCD setup flowchart — for manual editing

> This is the bridge between the local-dev diagram and the deploy diagram.
> Before ArgoCD can monitor the repo and deploy the app, UIS must register
> the repo with ArgoCD. This command is not yet implemented in UIS but the
> diagram documents the planned flow.
>
> Edit this file to get the diagram right, then hand it back so I can
> update the builder to match.

## ArgoCD registration (E1: python-basic-webserver-database)

```mermaid
flowchart LR
    dev(["Developer"])

    subgraph dct["DCT devcontainer"]
        cfg_argo["uis argocd register"]
    end

    subgraph uis_group["UIS container"]
        uis["uis CLI"]
    end

    subgraph gh["GitHub"]
        repo["repo"]
    end

    subgraph k8s["Local Kubernetes Cluster"]
        argo["ArgoCD"]
    end

    dev -->|runs| cfg_argo
    cfg_argo -->|sends request to| uis
    uis -->|creates ArgoCD Application CR| argo
    uis -->|registers repo with| argo
    argo -->|monitors| repo
```

## ArgoCD setup flow (E1: python-basic-webserver-database)

Sequence diagram for the ArgoCD registration — mirrors the database
configure flow but sets up deployment instead of provisioning.
Command names are placeholders until UIS implements this.

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant DCT as DCT devcontainer
    participant UIS as UIS provision-host
    participant K8s as Local Kubernetes cluster
    participant Argo as ArgoCD
    participant GH as GitHub
    Dev->>DCT: uis argocd register
    DCT->>UIS: request ArgoCD setup
    alt ArgoCD not deployed
        UIS->>K8s: deploy ArgoCD
    end
    UIS->>Argo: create Application CR (my-app)
    UIS->>Argo: configure repo URL
    Argo->>GH: monitors repo for changes
    UIS-->>DCT: registration complete
```
