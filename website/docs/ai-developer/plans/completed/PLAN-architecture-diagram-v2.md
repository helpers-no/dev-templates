# Feature: Architecture Diagram v2 — Two-Diagram Split

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Completed

**Completed**: 2026-04-12 — all phases shipped. Builder rewritten to emit two diagrams per template (local dev + deploy), 9 unit tests pass, registry + docs regenerated, Docusaurus build succeeds, visual review confirmed.

**Goal**: Replace the v1 monolithic architecture diagram (single flowchart + single sequence) with two focused diagrams per template: **Local development** (how a developer sets up and runs the template) and **Deployment** (how code flows from git push to running pod). Each diagram has a flowchart + sequence pair. ArgoCD setup is documented as a third diagram type in `mermaid-setup-argocd.md` but **suppressed for v2** until UIS implements the registration command.

**Last Updated**: 2026-04-12

**Investigation**: [INVESTIGATE-architecture-diagram-v2.md](./INVESTIGATE-architecture-diagram-v2.md) — full decision record, archetype data mapping, page layout decisions.

**Supersedes**: [PLAN-template-architecture-diagram.md](./PLAN-template-architecture-diagram.md) (v1, shipped 2026-04-12). The v1 builder (`scripts/lib/build-architecture-mermaid.ts`) was rewritten in place.

---

## Dependencies

**Prerequisites** (all satisfied as of 2026-04-12):

1. ✅ `PLAN-template-info-schema.md` shipped — the schema refactor delivers `quickstart.run`, `params.app_name` on all templates, `maintainers`, `prerequisites`, `links[]`, and kills `summary`. The v2 builder depends on `quickstart.run` and `params.app_name` being present on every relevant template.
2. ✅ v1 architecture diagram builder shipped and committed — this plan rewrites the same module, not a new one.

**Blocks**: Nothing downstream depends on v2 specifically. A future Backstage export generator would read the same registry fields regardless of which diagram version is active.

**Priority**: Medium. v1 is working. v2 is a visual quality improvement.

---

## Environment conventions

All shell commands run inside the devcontainer. Exec pattern: `docker exec <container> bash -c 'cd /workspace && <cmd>'`

---

## Overview

### Two diagrams per template (non-overlay)

| Diagram | Purpose | Paired sequence |
|---|---|---|
| **Local development** | How the developer sets up and runs the template locally: Developer runs `dev-template configure`, UIS provisions database + secret + port-forward, app connects via host.docker.internal, browser shows result on port 3000 | Configure flow sequence |
| **Deployment** | What happens when the developer pushes code: GitHub Actions builds image, ArgoCD deploys pod, Traefik routes traffic to `<app>.localhost` | Deploy flow sequence |
| **ArgoCD setup** *(suppressed)* | Planned third diagram. Implementation deferred until UIS ships the `uis argocd register` command. Draft stays in [mermaid-setup-argocd.md](mermaid-setup-argocd.md) as a design reference. |

### Per-archetype rendering

| Archetype | Local dev | Deployment |
|---|---|---|
| **E1** app + services + manifest | Full (all nodes) | Full (all nodes) |
| **E2** app + manifest, no services | **Skipped** — just `dev → app → browser`, not worth rendering | Full deploy diagram minus secret/PostgreSQL |
| **E3** stack + services | Different shape: `dev → uis → k8s` (deploy stack + create db) | Not applicable — stacks are deployed, not deployers |
| **E4** overlay | None | None |

### Page layout (decided in investigation, locked in schema plan)

```
S1  <TemplateHeader />           ← name, description, links[], maintainers
S2  Abstract                     ← 2–3 sentence overview
S3  <TemplateEnvironment />      ← tools, services, setup, run
S4  ## Prerequisites             ← linked checklist
S5  ## Architecture              ← this plan's output
     ### Local development       ← flowchart + sequence
     ### Deployment              ← flowchart + sequence
S7  ## Related Templates
S6  README content               ← optional free text (last)
```

### Registry field shape (locked)

One composed field — the builder emits the entire `## Architecture` section as a single MDX string:

```ts
interface ArchitectureResult {
  mdx: string | null;  // null for overlay templates
}
```

All conditional logic (sub-heading suppression for E2, stack-template special shape, overlay skip) lives in TypeScript. The bash emitter stays a dumb pipe — `jq -r` + `echo`, unchanged from v1.

---

## Phase 1: Rewrite the builder module — DONE

Replace `scripts/lib/build-architecture-mermaid.ts` with a new implementation that emits the two-diagram shape.

### Tasks

- [x] 1.1 Study the approved mermaid drafts:
  - [mermaid-steady-state2.md](mermaid-steady-state2.md) — local dev flowchart + configure sequence for E1 (approved)
  - [mermaid-deploy.md](mermaid-deploy.md) — deploy flowchart + deploy sequence for E1 (approved)
  - Use these as the source of truth for node labels, edge labels, and flow ordering

- [x] 1.2 Rewrite `buildArchitectureMdx(entry)` to compose the new shape. The main function calls five internal builders and returns one composed string. Output:
  ```
  ## Architecture

  ### Local development                    (skipped for E2)

  ```mermaid
  <local dev flowchart>
  ```

  ```mermaid
  <configure sequence>
  ```

  ### Deployment                            (always present for app templates)

  ```mermaid
  <deploy flowchart>
  ```

  ```mermaid
  <deploy sequence>
  ```
  ```

- [x] 1.3 Implement `buildLocalDevFlowchart(entry)`:
  - Overlay → return null (caller handles)
  - Stack template → delegate to `buildStackFlowchart(entry)` (different shape entirely)
  - E2 (no services) → return null (caller suppresses the `### Local development` sub-heading)
  - E1 (services + manifest) → emit the full local-dev shape from mermaid-steady-state2.md:
    - `dev(["Developer"])` and `browser["Web Browser"]` outside all subgraphs
    - `subgraph dct["DCT devcontainer"]` containing `app`, `env`, `tmpl["template-info.yaml"]`, `cfg["dev-template configure"]`
    - `subgraph uis_group["UIS container"]` containing `uis["uis CLI"]`
    - `subgraph k8s["Local Kubernetes Cluster"]` containing `svc[(...)]` and `sec[...]`
    - Edges: `dev -->|runs| cfg`, `dev -->|<quickstart.run>| app`, `tmpl -->|read by| cfg`, `cfg -->|sends config to| uis`, `uis -->|creates + port-forward| svc`, `uis -->|creates| sec`, `uis -->|writes| env`, `env --> app`, `app -->|host.docker.internal:<exposePort>| uis`, `app -.->|port <containerPort>| browser`
  - Derive labels from `params.app_name`, `resolvedServices[0].name/database/exposePort`, `manifest.secretName/containerPort`, `quickstart.run`

- [x] 1.4 Implement `buildLocalDevSequence(entry)` — returns null for overlay, stack (handled by buildStackSequence), and E2 (no services). Otherwise emit the configure-flow sequence from the approved draft:
  - Participants: `Dev as Developer`, `DCT as DCT devcontainer`, `UIS as UIS provision-host`, `K8s as Local Kubernetes cluster`, `DB as <svc.name>`
  - `Dev->>DCT: dev-template configure`
  - `alt <svc.name> not deployed` / `UIS->>K8s: deploy <svc.name>` / `end`
  - `UIS->>K8s: create namespace`
  - `UIS->>DB: create database <svc.database> + user`
  - If `svc.initFilePath`: `UIS->>DB: run init-*.sql seed files`
  - If manifest: `UIS->>K8s: create K8s Secret (<manifest.secretName>)`
  - `UIS->>UIS: kubectl port-forward <svc.exposePort>`
  - `UIS-->>DCT: write .env (host.docker.internal:<svc.exposePort>)`
  - `Dev->>DCT: <quickstart.run>`
  - `DCT->>UIS: connect via host.docker.internal:<svc.exposePort>`
  - `UIS->>DB: forward connection`
  - Trailing `Note over Dev,DCT: App now accessible at localhost:<manifest.containerPort> via VS Code port forwarding`

- [x] 1.5 Implement `buildDeployFlowchart(entry)`:
  - Overlay → return null
  - Stack template → return null (stacks don't have a deploy flow — they ARE the deployment target)
  - App templates (E1 and E2) → emit the deploy shape from mermaid-deploy.md:
    - `dev(["Developer"])` and `browser["Web Browser"]` outside all subgraphs
    - `subgraph dct["DCT devcontainer"]` containing `src["source code"]`
    - `subgraph gh["GitHub"]` containing `repo`, `actions`, `ghcr`
    - `subgraph k8s["Local Kubernetes Cluster"]` containing `traefik`, `argo`, `pod`, and (when services) `sec` + `svc`
    - Edges: `dev -->|git push| src`, `src -->|push| repo`, `repo -->|trigger| actions`, `actions -->|build + push image| ghcr`, `argo -->|monitors| repo`, `ghcr -->|image pull| argo`, `argo -->|deploys| pod`, `traefik -->|routes to| pod`, `browser -->|<appHostname>.localhost| traefik`, `dev --> browser`
    - When services: add `sec -->|<manifest.envVar>| pod` and `pod -->|<namespace>.svc.cluster.local:5432| svc`
  - **Hostname derivation**: use `params.app_name` → `entry.id` fallback (URL-safe, not `entry.name` which has spaces). Every template has `params.app_name` after the schema plan, so the fallback is effectively dead code.

- [x] 1.6 Implement `buildDeploySequence(entry)` — returns null for overlay and stack. Otherwise emit the deploy-flow sequence from the approved draft:
  - Participants: `Dev as Developer`, `DCT as DCT devcontainer`, `GH as GitHub`, `Actions as GitHub Actions`, `GHCR as Container Registry`, `Argo as ArgoCD`, `K8s as Local Kubernetes cluster`, and (when services) `DB as <svc.name>`
  - `Dev->>DCT: git push`
  - `DCT->>GH: push to repo`
  - `GH->>Actions: trigger workflow`
  - `Actions->>Actions: build container image`
  - `Actions->>GHCR: push image`
  - `Argo->>GH: detects manifest change`
  - `Argo->>GHCR: pull image`
  - `Argo->>K8s: deploy <params.app_name> pod`
  - When services: `K8s->>K8s: mount K8s Secret (<manifest.envVar>)` and `K8s->>DB: pod connects via <namespace>.svc.cluster.local:5432`
  - Trailing `Note over Dev,K8s: App now accessible at <appHostname>.localhost via Traefik`

- [x] 1.7 Keep and update `buildStackFlowchart(entry)` and `buildStackSequence(entry)`:
  - Stack templates (E3) still get one flowchart + one sequence (not two)
  - The composed output uses a single `### Overview` sub-heading instead of splitting into Local development + Deployment
  - Contents unchanged from v1 (already approved for postgresql-demo)

- [x] 1.8 Error handling:
  - Multi-service templates (>1 resolvedService): throw clear error (v1 limitation carries forward)
  - Missing `quickstart.run` on an app with services: throw clear error pointing at the missing field
  - Missing `params.app_name`: throw clear error (should not happen after schema plan, but guard anyway)

- [x] 1.9 Determinism: iterate arrays, not object keys. Same rule as v1. Tests assert this.

### Validation

```bash
docker exec <container> bash -c 'cd /workspace && npx tsx scripts/generate-registry.ts'
```

Inspect the `architectureMdx` field for all four canonical archetypes:

```bash
for id in python-basic-webserver-database python-basic-webserver postgresql-demo plan-based-workflow; do
  echo "=== $id ==="
  jq -r ".templates[] | select(.id==\"$id\") | .architectureMdx // \"<null>\"" website/src/data/template-registry.json
done
```

Expected:
- `python-basic-webserver-database` → full local dev + full deploy (both sub-headings)
- `python-basic-webserver` → deploy only (no `### Local development` sub-heading)
- `postgresql-demo` → stack shape (single `### Overview` sub-heading)
- `plan-based-workflow` → `null`

User spot-checks one of each and confirms before moving to Phase 2.

---

## Phase 2: Rewrite unit tests — DONE

Replace the existing test file with assertions for the new two-diagram shape.

### Tasks

- [x] 2.1 Update inline fixtures in `scripts/test/build-architecture-mermaid.test.ts`:
  - E1 fixture: keep as-is (params, manifest, services, quickstart.run) — already shaped correctly
  - E2 fixture: ensure `params.app_name` is set (schema plan added this to all templates, but tests use inline fixtures not real yaml)
  - E3 fixture: unchanged
  - E4 fixture: unchanged

- [x] 2.2 E1 test — assert both diagrams present:
  - Section skeleton: `## Architecture`, `### Local development`, `### Deployment`
  - Two flowchart fences and two sequence fences
  - Local dev flowchart contains: `dev(["Developer"])`, `browser["Web Browser"]`, `subgraph dct`, `tmpl["template-info.yaml"]`, `cfg["dev-template configure"]`, `subgraph uis_group`, `uis["uis CLI"]`, `svc[("PostgreSQL<br/>my_app_db")]`, `sec["K8s Secret<br/>my-app-db"]`, `dev -->|runs| cfg`, `dev -->|uv run python app/app.py| app`, `tmpl -->|read by| cfg`, `cfg -->|sends config to| uis`, `uis -->|creates + port-forward| svc`, `app -->|host.docker.internal:35432| uis`, `app -.->|port 3000| browser`
  - Deploy flowchart contains: `src["source code"]`, `subgraph gh`, `traefik["Traefik Ingress"]`, `argo["ArgoCD"]`, `pod["my-app pod"]`, `sec -->|DATABASE_URL| pod`, `browser -->|my-app.localhost| traefik`, `pod -->|default.svc.cluster.local:5432| svc`
  - Configure sequence contains: `participant DB as PostgreSQL`, `alt PostgreSQL not deployed`, `UIS->>DB: create database my_app_db + user`, `UIS->>DB: run init-*.sql seed files`, `Dev->>DCT: uv run python app/app.py`
  - Deploy sequence contains: `Argo->>K8s: deploy my-app pod`, `K8s->>DB: pod connects via default.svc.cluster.local:5432`, `my-app.localhost`
  - Must NOT contain: `uis template install`, stack-only labels

- [x] 2.3 E2 test — assert local dev diagram SUPPRESSED, deploy diagram present:
  - `## Architecture` heading present
  - `### Deployment` sub-heading present
  - `### Local development` sub-heading **absent**
  - Only one flowchart + one sequence (the deploy pair)
  - Deploy flowchart does NOT contain secret or service nodes (no services)
  - Deploy sequence does NOT have the `DB` participant

- [x] 2.4 E3 test — assert stack shape:
  - `## Architecture` heading present
  - Single `### Overview` sub-heading (not split into Local dev/Deployment)
  - Flowchart is the stack shape (uis, consumers, no DCT subgraph, no GitHub subgraph)
  - Sequence uses `uis template install postgresql-demo`

- [x] 2.5 E4 test — unchanged: `buildArchitectureMdx` returns `{ mdx: null }`

- [x] 2.6 Determinism test — unchanged: build E1 twice, assert byte-identical output

- [x] 2.7 Error tests:
  - Missing `quickstart.run` on E1 → throws with clear error
  - Missing `params.app_name` on E1 → throws with clear error
  - Multi-service E1 → throws with clear error

### Validation

```bash
docker exec <container> bash -c 'cd /workspace && npx tsx --test scripts/test/build-architecture-mermaid.test.ts'
```

All tests pass. User confirms before moving to Phase 3.

---

## Phase 3: Integration and build — DONE

The generator and emitter are unchanged from v1 — they just consume whatever `architectureMdx` string the builder produces. Phase 3 is a regression check.

### Tasks

- [x] 3.1 Regenerate everything:
  ```bash
  docker exec <container> bash -c 'cd /workspace && npx tsx scripts/generate-registry.ts && bash scripts/generate-docs-markdown.sh --force'
  ```

- [x] 3.2 Run all validators:
  ```bash
  bash scripts/validate-metadata.sh
  bash scripts/validate-docs.sh
  ```

- [x] 3.3 Run the full Docusaurus build:
  ```bash
  cd website && npm run build
  ```

- [x] 3.4 Inspect one regenerated MDX file (`python-basic-webserver-database.mdx`):
  - Confirm `## Architecture` section has two `###` sub-headings
  - Confirm both flowchart and sequence mermaid blocks render in each sub-section
  - Confirm no artifacts from the v1 shape remain

### Validation

Build succeeds, all validators pass, spot-checked MDX looks correct.

---

## Phase 4: Visual review in dev server

Hand off to user — they walk through every template page in the running dev server and confirm visual quality.

### Tasks

- [ ] 4.1 User starts the dev server inside the devcontainer:
  ```bash
  docker exec -it <container> bash -c 'cd /workspace/website && npm run start -- --host 0.0.0.0'
  ```

- [ ] 4.2 User visits all 10 template pages and reports issues. Focus areas:
  - **E1** (`python-basic-webserver-database`) — both diagrams render correctly, labels match reality
  - **E2** (`python-basic-webserver`) — only deploy diagram renders, no `### Local development` sub-heading visible
  - **E3** (`postgresql-demo`) — stack shape renders with `### Overview` sub-heading
  - **E4** (`plan-based-workflow`) — no `## Architecture` section at all
  - Dark vs light mode readability
  - Mobile viewport (horizontal scroll is acceptable for flowcharts)
  - Subgraph-to-node edges (the primary Mermaid rendering risk from v1 — both `dev` and `app` are explicit nodes now so this should be a non-issue)

- [ ] 4.3 Iterate on any issues by adjusting the builder in Phase 1's module. Regenerate and re-check.

### Validation

User confirms all 10 template pages render correctly.

---

## Phase 5: Contributor docs update

### Tasks

- [ ] 5.1 Update `website/docs/ai-developer/project-dev-templates.md` — the "Auto-generated documentation sections" section currently describes the v1 single-diagram output. Update to reflect v2's two-diagram structure and the per-archetype rules (E1 both, E2 deploy only, E3 stack, E4 null).

- [ ] 5.2 Move `INVESTIGATE-architecture-diagram-v2.md` from `backlog/` to `completed/` and update its status header. Update any relative links to investigations that stay in `backlog/` (use `../backlog/` prefix — same lesson as the schema plan).

- [ ] 5.3 Move this plan (`PLAN-architecture-diagram-v2.md`) from `backlog/` to `completed/` and update its status header.

- [ ] 5.4 Run `bash scripts/generate-plan-indexes.sh` and commit the regenerated indexes along with the move.

### Validation

`validate-docs.sh` passes with no broken links. Plan indexes reflect the moves.

---

## Acceptance Criteria

- [ ] `scripts/lib/build-architecture-mermaid.ts` emits the new two-diagram shape
- [ ] `buildArchitectureMdx(entry)` signature and return type unchanged (`{ mdx: string | null }`)
- [ ] E1 templates render both `### Local development` and `### Deployment` sub-sections, each with flowchart + sequence
- [ ] E2 templates render only `### Deployment`
- [ ] E3 templates render a single `### Overview` sub-section (stack shape)
- [ ] E4 overlay templates render no `## Architecture` section
- [ ] All unit tests pass (including new assertions for the two-diagram shape)
- [ ] `bash scripts/validate-metadata.sh` and `bash scripts/validate-docs.sh` pass
- [ ] `cd website && npm run build` succeeds
- [ ] Visual review of all 10 templates confirms correct rendering
- [ ] `project-dev-templates.md` updated with v2 description
- [ ] This plan and the v2 investigation moved to `completed/` with status updates and regenerated indexes

---

## Implementation Notes

- **The bash emit step in `generate-docs-markdown.sh` does not change.** It reads `architectureMdx` via `jq -r`, emits it verbatim with `printf '\n%s\n'`, and the conditional `if [[ -n "$local_arch_mdx" ]]` handles overlay suppression. No bash changes needed.
- **The registry entry shape does not change.** Still one `architectureMdx: string | null` field. TypeScript composes everything.
- **Subgraph-to-node edges**: v2 diagrams are designed so every edge source is an explicit node (dev, app, cfg, src, tmpl, uis, argo, ghcr, etc.) — never a subgraph id. This avoids the v1 rendering issue where `dct --> repo` silently dropped the subgraph.
- **Hostname derivation**: `<appHostname>.localhost` comes from `params.app_name` with fallback to `entry.id` (URL-safe). Schema plan ensured `params.app_name` is set on every app template, so the fallback is defensive only.
- **Stack template sub-heading**: `### Overview` instead of splitting into Local dev / Deployment. Stacks don't have a "local dev" story (they ARE the infrastructure) and don't have a "deployment" story (they're deployed by UIS, not GitHub Actions). One combined diagram + sequence is the right fit.
- **ArgoCD setup diagram is deferred.** The design lives in `mermaid-setup-argocd.md` for reference. When UIS ships the registration command, add it as a third sub-section (or a bridge between Local development and Deployment). Not in scope for this plan.
- **Multi-service templates throw** — v1 limitation carries forward. None of the current 10 templates have multiple services.
- **Test runner**: `npx tsx --test scripts/test/build-architecture-mermaid.test.ts` — same pattern as v1.

---

## Files to Modify

- `scripts/lib/build-architecture-mermaid.ts` — rewrite (v1 replaced)
- `scripts/test/build-architecture-mermaid.test.ts` — rewrite test assertions
- `website/docs/ai-developer/project-dev-templates.md` — Phase 5 doc update
- `website/docs/ai-developer/plans/backlog/INVESTIGATE-architecture-diagram-v2.md` → move to `completed/`
- `website/docs/ai-developer/plans/backlog/PLAN-architecture-diagram-v2.md` → move to `completed/`
- `website/docs/ai-developer/plans/backlog/index.md` — auto-regenerated
- `website/docs/ai-developer/plans/completed/index.md` — auto-regenerated

Automatically regenerated (do not edit by hand):
- `website/src/data/template-registry.json` — new `architectureMdx` string shape
- `website/docs/templates/**/*.mdx` — 9 non-overlay pages get the new section
