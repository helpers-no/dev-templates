# Investigate: Architecture Diagram v2 — Three-Diagram Split

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Completed

**Completed**: 2026-04-12 — downstream plan [PLAN-architecture-diagram-v2.md](./PLAN-architecture-diagram-v2.md) shipped.

**Goal**: Redesign the per-template architecture diagrams from a single monolithic flowchart into three focused diagrams (local development, ArgoCD setup, CI/CD deployment), each paired with a sequence diagram. Determine how to auto-generate all six diagrams from existing template-info.yaml and registry data, and how to place them on the Docusaurus template page.

**Last Updated**: 2026-04-12

**Predecessor**: [INVESTIGATE-template-architecture-diagram.md](../backlog/INVESTIGATE-template-architecture-diagram.md) — the original investigation designed around a single diagram. Superseded by this investigation after Phase 4 visual review revealed the monolithic diagram was too noisy and conflated three distinct workflows.

**Working drafts**: Hand-edited Mermaid files used during the visual review:
- [mermaid-steady-state2.md](../backlog/mermaid-steady-state2.md) — local development flowchart + configure sequence (approved)
- [mermaid-deploy.md](../backlog/mermaid-deploy.md) — CI/CD deployment flowchart + deploy sequence (awaiting review)
- [mermaid-setup-argocd.md](../backlog/mermaid-setup-argocd.md) — ArgoCD registration flowchart + setup sequence (draft — refine when UIS implements the command)

---

## Background

The v1 builder (`scripts/lib/build-architecture-mermaid.ts`, committed in `b6fcf09`) generates a single flowchart and a single sequence diagram per template. During Phase 4 visual review, the user identified several problems:

1. **The monolithic flowchart conflated three stories** — provisioning (DCT → UIS → K8s), local runtime (app → UIS → PostgreSQL), and CI/CD deployment (git push → GitHub Actions → ArgoCD → K8s). One diagram trying to show all three was noisy and hard to read.
2. **The Developer actor was misplaced** — initially inside the DCT subgraph, but the developer also interacts with the browser (outside DCT). Developer should be an external actor.
3. **Node labels were misleading** — "provision-host" sounds like a program; "UIS container" with "uis CLI" inside is more accurate. Similarly, `template-info.yaml` and `dev-template configure` deserve explicit nodes rather than being hidden in edge labels.
4. **Missing actors** — the Web Browser (both for local dev via VS Code port forwarding and for deployed app via Traefik ingress) was absent. The K8s Secret's role in the deployed pod was not shown.
5. **ArgoCD setup is a distinct workflow** — registering the repo with ArgoCD is neither "local dev" nor "deploy"; it's a one-time bridge step that enables deployment. It deserves its own diagram, especially since the UIS command for it doesn't exist yet.

The three-diagram split emerged from iterating on these issues during the visual review.

---

## The Three Diagrams

### 1. Local Development Setup

**What it shows**: How a developer sets up and runs the template locally for the first time.

**Actors**: Developer (outside), DCT devcontainer, UIS container, Local Kubernetes Cluster

**Key nodes inside DCT**: app, .env, template-info.yaml, dev-template configure

**Flow**: Developer runs configure → reads template-info.yaml → UIS provisions database + secret + port-forward → writes .env → developer starts app → app connects to database via UIS tunnel → browser shows result on port 3000

**Paired sequence diagram**: Configure flow (approved — shows the `alt PostgreSQL not deployed` conditional, init SQL, port-forward, .env write, and runtime connection chain)

**Approved draft**: [mermaid-steady-state2.md](../backlog/mermaid-steady-state2.md)

### 2. ArgoCD Registration (Planned)

**What it shows**: The one-time setup that connects GitHub to ArgoCD so that pushes trigger deployments.

**Actors**: Developer (outside), DCT devcontainer, UIS container, GitHub, Local Kubernetes Cluster (ArgoCD)

**Flow**: Developer runs `uis argocd register` → UIS deploys ArgoCD if needed → UIS creates Application CR → ArgoCD starts monitoring the repo

**Paired sequence diagram**: ArgoCD setup flow (draft — command names are placeholders)

**Status**: Draft. The UIS command (`uis argocd register` or equivalent) does not exist yet. The diagram documents the planned flow and will be refined when implementing. Until then, this diagram should either be rendered with dashed styling / a "planned" annotation, or suppressed entirely.

**Draft**: [mermaid-setup-argocd.md](../backlog/mermaid-setup-argocd.md)

### 3. CI/CD Deployment

**What it shows**: What happens after ArgoCD is registered — the push-to-production cycle.

**Actors**: Developer (outside), DCT devcontainer, GitHub (repo + Actions + GHCR), Local Kubernetes Cluster (Traefik + ArgoCD + pod + secret + PostgreSQL), Web Browser

**Flow**: Developer pushes code → GitHub Actions builds image → GHCR stores it → ArgoCD detects change → pulls image → deploys pod → pod mounts secret (DATABASE_URL) → pod connects to PostgreSQL → Traefik routes traffic → developer sees result at my-app.localhost

**Paired sequence diagram**: Deploy flow (awaiting review)

**Draft**: [mermaid-deploy.md](../backlog/mermaid-deploy.md)

---

## Questions to Answer

### Q1. Can all three diagrams be auto-generated from existing data?

Map each diagram element to its data source:

#### Local development diagram

| Element | Data source | Available? |
|---|---|---|
| `app["my-app"]` | `params.app_name` → `entry.name` → `entry.id` | ✅ |
| `env[".env"]` | present when `manifest` + `resolvedServices.length > 0` | ✅ |
| `tmpl["template-info.yaml"]` | static — every template has one | ✅ |
| `cfg["dev-template configure"]` | present when `resolvedServices.length > 0` | ✅ |
| `svc[("PostgreSQL<br/>my_app_db")]` | `resolvedServices[0].name` + `.database` | ✅ |
| `sec["K8s Secret<br/>my-app-db"]` | `manifest.secretName` | ✅ |
| `uis["uis CLI"]` | present when `resolvedServices.length > 0` | ✅ |
| `dev -->|uv run python app/app.py| app` | `quickstart.run` | ✅ |
| `app -->|host.docker.internal:35432| uis` | `resolvedServices[0].exposePort` | ✅ |
| `app -.->|port 3000| browser` | `manifest.containerPort` | ✅ |

**Verdict**: ✅ All data available.

#### Deploy diagram

| Element | Data source | Available? |
|---|---|---|
| `src["source code"]` | static | ✅ |
| `repo["repo"]`, `actions["GitHub Actions"]`, `ghcr["Container Registry"]` | static for all app templates | ✅ |
| `traefik["Traefik Ingress"]` | static — pre-installed in every cluster | ✅ |
| `argo["ArgoCD"]` | static for app templates with manifest | ✅ |
| `pod["my-app pod"]` | `params.app_name` → `entry.name` → `entry.id` | ✅ |
| `sec["K8s Secret<br/>my-app-db"]` | `manifest.secretName` | ✅ (only when services) |
| `svc[("PostgreSQL<br/>my_app_db")]` | `resolvedServices[0].name` + `.database` | ✅ (only when services) |
| `sec -->|DATABASE_URL| pod` | `manifest.envVar` | ✅ |
| `browser -->|my-app.localhost| traefik` | `params.app_name` → `entry.name` → `entry.id` | ✅ |
| `pod -->|default.svc.cluster.local:5432| svc` | `resolvedServices[0].namespace` | ✅ (only when services) |

**Verdict**: ✅ All data available. Templates without services skip the secret + PostgreSQL nodes but still show the ArgoCD → pod chain.

#### ArgoCD setup diagram

| Element | Data source | Available? |
|---|---|---|
| `cfg_argo["uis argocd register"]` | **command does not exist yet** | ❌ |
| `argo["ArgoCD"]`, `repo["repo"]` | static | ✅ |
| UIS → ArgoCD edges | **flow not yet defined** | ❌ |

**Verdict**: ❌ Cannot auto-generate yet. The UIS command and its exact flow are undefined. Options for handling this are discussed in Q4.

### Q2. How should diagrams vary per archetype?

| Archetype | Local dev | ArgoCD setup | Deploy |
|---|---|---|---|
| **E1** app + services + manifest | Full diagram (all nodes) | Draft/dashed | Full diagram (all nodes) |
| **E2** app + manifest, no services | Minimal — just `dev → app → browser` inside DCT. No UIS, no K8s, no configure. Worth rendering? | Draft/dashed | Full deploy diagram minus secret + PostgreSQL (no service to connect to) |
| **E3** stack | Different shape: `dev → uis → k8s` (deploy service + create db). No app, no browser. | Not applicable (stacks don't deploy via ArgoCD) | Not applicable |
| **E4** overlay | None | None | None |

**Open question**: Should E2 get a local-dev diagram at all? It would show `dev runs app, sees browser` — three nodes, two edges. The Environment card already conveys this in text. **Recommendation**: skip the local-dev diagram for E2; render only the deploy diagram.

### Q3. How should diagrams be placed on the Docusaurus template page?

Updated page layout reflecting both the diagram investigation and the schema investigation decisions (INVESTIGATE-template-info-schema.md). Sections ordered by user decision on 2026-04-12:

```
S1  <TemplateHeader />           ← name, description, links[], maintainers (with GitHub avatars)
S2  Abstract                     ← 2–3 sentence overview from template-info.yaml
S3  <TemplateEnvironment />      ← tools, services, configure, run (quickstart.setup + run)
S4  Prerequisites                ← optional checklist from template-info.yaml prerequisites[]
S5  ## Architecture              ← diagrams (this investigation)
S7  ## Related Templates         ← links to related templates
S6  README content               ← optional free text (last — supplementary, not primary)
```

Key decisions:
- **README moves to the very end** — yaml-driven sections are the primary content, README is supplementary
- **Architecture sits directly above Related Templates** — the last structured section before the free-text README
- **No Quick Start duplication** — the Environment card (S3) already renders quickstart.setup + quickstart.run. No separate Quick Start section needed.

Within S5, one `## Architecture` section with two sub-headings:

```
## Architecture
### Local development
  flowchart + sequence
### Deployment
  flowchart + sequence
```

**Decision**: This layout is locked. Decided 2026-04-12.

### Q4. How should the ArgoCD setup diagram be handled?

Options:

#### Option 4A: Suppress entirely until the UIS command is implemented

Pros: only shows what works.
Cons: the deploy diagram assumes ArgoCD is set up without showing how.

#### Option 4B: Render with dashed styling and a "(planned)" label

Pros: tells the full story; sets expectations.
Cons: documents something that doesn't work yet; could confuse readers.

#### Option 4C: Include as a third sub-heading under `## Architecture` with a note

```
### ArgoCD setup (planned)
> This step is not yet automated. The diagram shows the planned flow.
```

Pros: explicit about status; doesn't pretend it works.
Cons: three sub-headings; renders a planned diagram alongside working ones.

**Recommendation**: Option 4A for now — suppress the ArgoCD setup diagram. The deploy diagram is still meaningful without it (it shows what happens AFTER ArgoCD is registered, regardless of how the registration happened). When UIS ships the command, we add the diagram. The draft stays in `mermaid-setup-argocd.md` as a design reference.

### Q5. What should the `architectureMdx` field shape become?

The v1 builder emits a single `architectureMdx: string | null` field. With two (or three) diagrams, options:

#### Option 5A: Keep one composed field

The builder composes the entire `## Architecture` section with all sub-headings and mermaid blocks into one string. Bash emitter stays a dumb pipe.

Pros: no change to the emit pattern; all logic in TypeScript.
Cons: large string in the registry JSON; harder to test individual diagrams.

#### Option 5B: Multiple fields

```ts
architectureLocalDev: string | null;   // flowchart + sequence
architectureDeploy: string | null;     // flowchart + sequence
architectureArgoSetup: string | null;  // deferred
```

Pros: testable individually; bash can emit each conditionally.
Cons: more registry fields; bash needs conditional logic per field.

**Recommendation**: Option 5A — keep one composed field. Matches the TypeScript-first preference (all conditional logic in TS). The bash emitter doesn't change. Individual builder functions (`buildLocalDevFlowchart`, `buildDeployFlowchart`, etc.) remain exported for unit testing.

### Q6. How does this interact with the sequence diagram naming?

The v1 builder had `### Steady-state` and `### Configure flow`. With the new split:

| v1 name | v2 name | Content |
|---|---|---|
| `### Steady-state` | `### Local development` | Local dev flowchart |
| `### Configure flow` | (inline under Local development) | Configure sequence |
| (new) | `### Deployment` | Deploy flowchart |
| (new) | (inline under Deployment) | Deploy sequence |

Each sub-heading contains its flowchart followed by its sequence diagram. No separate sub-headings for flowchart vs sequence within each section.

---

## Decisions

All decided 2026-04-12:

- [x] **Q2: E2 skips local-dev diagram** — only gets the deploy diagram. Three nodes / two edges isn't worth rendering.
- [x] **Q3: Page layout locked** — S1→S2→S3→S4→S5→S7→S6. Architecture (S5) sits between Prerequisites and Related Templates. README is last.
- [x] **Q4: ArgoCD setup diagram suppressed** — until UIS implements the command. Draft stays in `mermaid-setup-argocd.md`.
- [x] **Q5: One composed `architectureMdx` field** — all conditional logic in TypeScript. Bash emitter stays a dumb pipe.
- [x] **Q6: Headings confirmed** — `## Architecture` with `### Local development` and `### Deployment` sub-headings. Both appear in Docusaurus right-side TOC for direct navigation.

---

## Next Steps

- [ ] User reviews this investigation and answers the 5 open questions
- [ ] User finalises the deploy diagram draft in `mermaid-deploy.md`
- [ ] Update `PLAN-template-architecture-diagram.md` (or create a new plan) based on the chosen options
- [ ] Rewrite `scripts/lib/build-architecture-mermaid.ts` to emit the new three-diagram shape
- [ ] Update unit tests for the new structure
- [ ] Regenerate registry + docs, rebuild, visual review round 2
