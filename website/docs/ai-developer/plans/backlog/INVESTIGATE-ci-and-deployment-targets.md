# Investigate: CI + Deployment Targets as First-Class Template Metadata

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Schema decided — plan blocked on Red Cross (Track A) shipping first (2026-04-16)

**Goal**: Make CI workflow + deployment target first-class fields in `template-info.yaml`, consumed by both documentation generators and actual deployment tooling, so that (a) the implicit `.github/workflows/` convention becomes explicit, (b) Azure and future deployment targets slot in without a schema rewrite, and (c) the template page renders a concrete "builds via X, deploys to Y" line instead of leaving the reader to guess.

**Last Updated**: 2026-04-16

**Related**:
- [PLAN-architecture-diagram-display.md](../completed/PLAN-architecture-diagram-display.md) — introduced the `ArchitectureModel` shape that's extensible to new diagram kinds. This investigation adds "deployment target" as a data source the model could consume.
- [INVESTIGATE-template-info-schema.md](../completed/INVESTIGATE-template-info-schema.md) — Backstage harmonisation investigation (now closed). Any field added here should stay consistent with the schema shape that investigation locked in.
- [INVESTIGATE-uis-in-cluster-port.md](./INVESTIGATE-uis-in-cluster-port.md) — parallel UIS-team ask; same question of "UIS as canonical source for platform data".

---

## Background

Every current template ships a GitHub Actions workflow at `.github/workflows/urbalurba-build-and-push.yaml`. The file is part of what the developer gets when they install the template — it's what turns a `git push` into a running pod on the local cluster. But nothing in `template-info.yaml` declares its existence; a developer learns about it by browsing the source or reading the README. The project's current docs-generation pipeline (auto-generated Environment card, Architecture section, Getting Started card) knows nothing about it either.

Two concerns converged to justify this investigation:

1. **The docs gap.** The Environment card documents tools, services, init SQL, and run commands. It does not document "where my code ends up running after I push". The Architecture section's Deployment sub-section shows a flowchart and sequence diagram that hint at the CI path, but the actual workflow file is invisible in the generated docs and the generator assumes `GitHub Actions → ArgoCD → local K8s` for every template.

2. **Azure is coming.** A future template (or a variant of an existing one) needs to deploy to Azure instead of local Kubernetes. Azure deployment is a different CI workflow entirely — different registry (ACR instead of GHCR), different cluster-side mechanism (no ArgoCD watching, direct `azure/k8s-deploy` action), different secrets (AZURE_*), different setup prerequisites. The hardcoded "GitHub Actions → ArgoCD → local K8s" assumption breaks.

**Critical clarification from Round 2 discussion (2026-04-15)**: the user confirmed this is **not just a documentation concern**. The intent is that actual deployment tooling will consume the declared target. That makes the shape of the field, the registry that backs it, and the ownership of that registry all load-bearing decisions rather than cosmetic ones.

---

## Current state

### Per-template CI file layout

Every app template in the catalog (8 templates — typescript, python, csharp, golang, java, php, designsystemet, python-database) ships the same single workflow:

```
templates/<template-id>/.github/workflows/urbalurba-build-and-push.yaml
```

The workflow builds a Docker image and pushes to GHCR. After merge, ArgoCD (deployed by UIS into the local cluster) watches the template's repo and syncs the manifest change. The workflow itself does not "deploy" — it publishes an image and touches a kustomization. ArgoCD is the deployer.

Stack templates (`postgresql-demo`) and overlay templates (`plan-based-workflow`) ship no workflow — they have no consumer app to build.

### What the generator knows

`scripts/generate-registry.ts` passes through every `template-info.yaml` field it's aware of. It does **not** read `.github/workflows/*.yaml`, does not infer anything from the presence of a workflow file, and has no concept of "deployment target". The auto-generated Architecture section's Deployment sub-diagram is hardcoded to show `GitHub Actions → ArgoCD → K8s` for every non-stack app template.

### What the developer sees on a template page today

Nothing. The CI file's existence is implicit. A careful reader might notice "What happens when the developer pushes code" prose in the Architecture Deployment diagram, but the actual file path, the trigger conditions, the target registry, the secrets required — none of it is declared in the template's metadata, rendered on the page, or checked by any validation.

---

## The core question that unblocks everything else

**Who runs the deploy?**

Three models. The answer changes what field `template-info.yaml` needs, what registry backs it, what tooling consumes it, and whether a new project-level concept is needed.

### Model A — CI runs the deploy (closest to today)

GitHub Actions (or Azure Pipelines, etc.) builds the image, pushes it to a registry, and the same workflow triggers whatever target-specific deploy step applies:

- **Local K8s via ArgoCD**: today's flow. Workflow pushes image + touches manifest; ArgoCD syncs. The "deploy" is ArgoCD's pull-based reconciliation, not a step in the workflow.
- **Azure AKS**: workflow uses `azure/k8s-deploy@v5` (or `azure/aks-set-context` + `kubectl apply`), authenticating via OIDC or a service principal stored in GH secrets.
- **AWS EKS**: workflow uses `aws-actions/amazon-ecr-login` + `aws-actions/eks-kubectl-deploy`, authenticating via IAM role.
- **Vercel / Netlify / etc.**: no CI file — the platform hooks directly to git.

**What changes per target**: the CI file's content (different build steps, different deploy actions, different secrets) and the target's preconditions (ArgoCD watching the repo; Azure subscription configured; etc.).

**What template-info.yaml needs**: a pointer to the deployment target (so the installer knows which CI file template to copy + which secrets to prompt for) and the path to the shipped CI file (so docs render it and Dependabot finds it at `.github/workflows/`).

**Pros**: smallest conceptual shift — matches today's local-K8s flow; every supported target just becomes "another CI template". Developer experience is unchanged: `git push` triggers everything.
**Cons**: every new target = a new CI template to author and maintain. The "CI template library" becomes a real artifact we own. A template with `target: azure-aks` only works if somebody has written the Azure CI template.

### Model B — deploy is a separate command, outside CI

CI still builds + pushes the image. Deployment is a separate command the developer runs: `dev-template deploy`, `uis deploy-app`, or similar. That command reads `template-info.yaml`, looks up the target's deploy recipe, runs it directly against the target platform.

**What changes per target**: the deploy tool's per-target implementation (how it talks to ArgoCD / AKS / EKS / Vercel).

**What template-info.yaml needs**: a pointer to the deployment target. CI stays minimal — just build + push.

**Pros**: deploy logic lives outside the template, so a target upgrade doesn't require touching every template's CI file. Local debugging of deploys is easier because there's a deploy command to re-run.
**Cons**: breaks the "`git push` = deploy" UX that local-K8s-ArgoCD currently offers — ArgoCD's watch-and-sync is one of the things that makes the local flow feel magical. Also creates a new per-machine tool (the deploy command) that has to be installed separately. Also: who runs the deploy command in production? CI still has to run it, which means we've re-invented Model A inside Model B.

### Model C — hybrid: CI builds, a separate orchestrator wires targets

CI handles build + push (minimal workflow). A second tool — probably new — handles target-specific orchestration: creating ArgoCD Application CRs, configuring AKS cluster credentials on the runner, etc. The orchestrator runs either inside CI as a later step, or outside CI as a one-time setup when the developer first picks a target.

**What changes per target**: the orchestrator's per-target plugin.

**What template-info.yaml needs**: the deployment target (consumed by the orchestrator), the CI platform (which CI workflow template to use), and the workflow file path (for docs).

**Pros**: cleanest separation of concerns — CI does build, orchestrator does target-specific deploy. The orchestrator can evolve targets independently of CI templates. Good fit if deployment targets become a growing list.
**Cons**: biggest new surface area. Requires designing and shipping an orchestrator. Probably too much for the problem at hand unless the target list is expected to be >3.

### Recommendation on the model question

**Model A** unless there's a concrete reason not to. It preserves today's `git push = deploy` magic for local-K8s, slots Azure in as a new CI template (the Azure deploy step is an existing GitHub Action, not something we have to write), and keeps the new surface area small. The investment is in the **CI template library** — a small set of per-target workflow templates that templates can pick from via the `deployment.target` field.

Model C is the right answer if the long-term catalog of deployment targets is large (5+), if the deploy logic per target is substantial, or if you want to decouple "which CI service runs my build" from "which target gets my deploy". Neither of those is true today, so A wins on simplicity.

Model B is probably wrong because it creates a local-run deploy tool that then has to be re-implemented as a CI step for production deploys — which is just Model A with extra steps.

**Decision pending user input.** See Open Question Q1.

---

## Field shape — DECIDED (2026-04-16)

Add a new top-level **array** to `template-info.yaml`. Plural from day one — Red Cross's Azure Container Apps target lands alongside today's local-K8s target on the same template, so single-block was wrong.

```yaml
deployments:

  # ─────────────────────────────────────────────────────────────
  # 1. Local Kubernetes via ArgoCD (today's default flow)
  # ─────────────────────────────────────────────────────────────
  - target: local-k8s-argocd
    ci_platform: github-actions
    workflow_file: .github/workflows/urbalurba-build-and-push.yaml

  # ─────────────────────────────────────────────────────────────
  # 2. Azure Container Apps (Red Cross — Track A delivery)
  # ─────────────────────────────────────────────────────────────
  - target: azure-container-apps
    ci_platform: azure-pipelines
    workflow_file: azure-pipelines.yml
```

The `ci_platform` per entry reflects whichever CI service actually builds for that target. Red Cross's repo is in Azure DevOps, so their `azure-container-apps` entry uses Azure Pipelines (root-level `azure-pipelines.yml` is the Azure DevOps convention; `.azure-pipelines/<name>.yml` is the multi-pipeline convention if a single repo ships several). The `local-k8s-argocd` entry on the same template still uses GitHub Actions — same template, two different CI platforms, one per deployment.

This is the schema's first real exercise: `ci_platform` does load-bearing work from day one because the very first multi-target template Red Cross asks for spans two CI systems.

**Three fields per entry, all required.** The whole `deployments:` field is optional — stack and overlay templates omit it entirely.

**`target`** (string, required): the deployment target's ID, resolved against `deployment-targets.json` at registry generation time. Validation fails if the ID is unknown. The target's definition carries everything downstream tooling needs — supported CI platforms, required secrets, required prerequisite services, provisioning script path (UIS-owned), per-service mapping, the docs URL.

**`ci_platform`** (string, required): which CI platform builds the image for this entry. Must be one of the target's `supported_ci_platforms`. Today's only value is `github-actions`; future values are `azure-pipelines`, `gitlab-ci`, etc.

**`workflow_file`** (string, required): literal path to the workflow file shipped in the template, relative to the template root. Docs render it; Dependabot finds it; the registry generator can read its content for a future "show the workflow file" dropdown.

### Rules

1. **`deployments:` is always an array.** No singular block, no string-or-object polymorphism. Even templates with one deployment use `[{target: …, ci_platform: …, workflow_file: …}]`.
2. **First entry is the default.** `dev-template configure` with no `--target` flag picks `deployments[0]`. Today every template's first entry is `local-k8s-argocd` → zero behavior change after migration.
3. **Stack and overlay templates: `deployments:` field absent.** No deployment story for them; validator skips the block on these archetypes.
4. **Migration: every existing app template gets an explicit `deployments: [{target: local-k8s-argocd, ...}]` block added.** No implicit defaults — the block is always present on app templates after migration, even though today only one target exists.

### Fields explicitly NOT in `template-info.yaml`

These are per-deployer concerns, supplied at install/deploy time, not by the template author:

- `subscription_id`, `tenant_id`, `resource_group`, `container_app_environment_name` — Red Cross's Azure values aren't yours
- Specific secret values — only the *names* declared by the target's `required_secrets` are template-level; the values are deployer-level
- Custom domain, scaling min/max replicas — runtime tuning
- `region` — almost always a per-deployer decision (data residency, latency); add to schema only when a real template needs to declare a default
- `registry` — derived from the target's CI workflow template; add to schema only if a template needs to override (rare, e.g. private ACR for compliance even on local target)

---

## Registry design — `deployment-targets.json`

Regardless of ownership (see Q2), the registry has roughly this shape:

```json
{
  "version": "1.0.0",
  "generated": "2026-04-15T00:00:00Z",
  "targets": [
    {
      "id": "local-k8s-argocd",
      "name": "Local Kubernetes via ArgoCD",
      "description": "Build image, push to GHCR, ArgoCD syncs from the repo to Rancher Desktop",
      "category": "local",
      "supported_ci_platforms": ["github-actions"],
      "ci_templates": {
        "github-actions": "ci-templates/github-actions/local-k8s-argocd.yaml"
      },
      "required_secrets": [],
      "required_services": ["argocd"],
      "setup_command": "uis deploy argocd",
      "setup_docs_url": "https://uis.sovereignsky.no/docs/deployment/local-k8s-argocd",
      "architecture_diagram_role": "local-argocd"
    },
    {
      "id": "azure-container-apps",
      "name": "Azure Container Apps",
      "description": "Build image, push to ACR (or GHCR), deploy to ACA via az containerapp create. Managed Postgres via Azure Database for PostgreSQL Flexible Server.",
      "category": "cloud",
      "supported_ci_platforms": ["azure-pipelines", "github-actions"],
      "ci_templates": {
        "azure-pipelines": "ci-templates/azure-pipelines/azure-container-apps.yml",
        "github-actions": "ci-templates/github-actions/azure-container-apps.yaml"
      },
      "required_secrets": ["AZURE_CLIENT_ID", "AZURE_TENANT_ID", "AZURE_SUBSCRIPTION_ID"],
      "required_services": [],
      "setup_command": "dev-template configure --target azure-container-apps",
      "setup_docs_url": "...",
      "architecture_diagram_role": "cloud-aca",
      "service_provisioners": {
        "postgresql": "scripts/azure/provision-postgres-flexible-server.sh"
      }
    }
  ]
}
```

**Key relationships**:

- The registry is **vendored into TMP** (the dev-templates repo) just like `dct-tools.json` and `uis-services.json` — single source of truth lives in one project, other projects pull a copy. Which project is the source is Q2.
- A template references a target by ID only. `generate-registry.ts` resolves the ID at build time and stamps a full `resolvedDeploymentTarget` block on the entry, so downstream consumers (component, architecture builder, expected-output generator) don't repeat the lookup.
- `ci_templates` maps each supported CI platform to a file in a new **CI template library** (owned by whichever project owns the deployment-targets registry). The installer reads this when scaffolding a new template.
- `required_secrets` and `required_services` drive validation: the installer can prompt the user up-front for missing secrets, and the Environment card's "What gets set up" sub-section can show "This template needs an ArgoCD instance in your cluster — run `uis deploy argocd`".
- `architecture_diagram_role` lets `build-architecture-mermaid.ts` select a target-specific deploy flowchart + sequence diagram, instead of hardcoding local-K8s + ArgoCD for every template.

---

## Ownership question

Three candidates for who owns `deployment-targets.json`:

### Option 1 — UIS owns it

UIS already has a "things that run beyond the devcontainer" mandate. Local-K8s + ArgoCD is already UIS territory. Extending to Azure AKS / AWS EKS / etc. is a natural broadening: UIS becomes the project that knows how to provision target platforms, whether local or cloud.

**Pros**:
- UIS already ships `services.json` (what can run **in** the cluster); `deployment-targets.json` is the natural companion (what **the** cluster can be).
- Azure AKS, EKS, etc. are "platforms UIS can prepare for you to deploy into" — reasonable conceptual fit.
- Single source of truth: one team owns all of "how do I get something running outside my devcontainer".

**Cons**:
- Stretches UIS's current scope, which has been "local services + local K8s" oriented.
- UIS owners may not want the responsibility of maintaining cloud-target definitions.

### Option 2 — DCT owns it

DCT handles devcontainer setup. Adding "deployment target setup" (installing `az` CLI, configuring kubectl contexts, managing cloud credentials in the devcontainer) fits the "getting the developer's environment ready" mandate.

**Pros**:
- DCT already touches credentials and tool installation.
- Cloud CLIs (`az`, `gcloud`, `aws`) are tools DCT could provision alongside languages.

**Cons**:
- "Deployment target" is really about the cluster / cloud endpoint, not the developer's machine. DCT is developer-side; the target is server-side. Wrong side of the split.
- Would make DCT responsible for two unrelated things (devcontainer + deploy orchestration).

### Option 3 — TMP owns it (this repo)

Keep the registry in dev-templates itself. No cross-project dependency. Starts small.

**Pros**:
- Zero coordination cost. The investigation ships inside this repo, and the first version of the registry is whatever dev-templates needs.
- Easy to evolve during early design — change the schema without needing a release of another project.

**Cons**:
- Wrong project. Dev-templates is the *consumer* of deployment targets, not the authority on them. If UIS ever ships a new cloud target, the information has to round-trip through dev-templates to be usable, which inverts the normal dependency direction.
- Creates a fourth registry in TMP (on top of the vendored `dct-tools.json` and `uis-services.json`) that isn't actually TMP's concern.
- Hard to un-stick later: once downstream tools depend on `tmp/deployment-targets.json`, moving it to UIS is a breaking change.

### Recommendation

**Option 1 — UIS owns `deployment-targets.json`.** It's the only option that makes conceptual sense long-term. The short-term pain is that UIS needs to accept the scope extension and add a new registry to its release pipeline. If that's not palatable today, **Option 3 is an acceptable start** — ship the registry inside dev-templates first, prove the shape, migrate to UIS in a later phase once UIS is ready.

**Decision pending user input.** See Open Question Q2.

---

## What renders on the template page

Once the data is in the registry, multiple rendering opportunities open up:

### 1. Getting Started card — new "Deploys to" row

The Getting Started card (shipped in PR #67) already has `### Prerequisites` and `### Related templates` sub-sections. Add a third: `### Deployment target`, showing the target's name, a one-line description, and a link to the setup docs. Example:

```
### Deployment target

**Local Kubernetes via ArgoCD** — Build image, push to GHCR, ArgoCD syncs from the repo to Rancher Desktop.
[Setup guide ↗](https://uis.sovereignsky.no/docs/deployment/local-k8s-argocd)
```

Minimal new code; same card, new row; driven entirely by the resolved target.

### 2. Environment card — new "CI + deployment" row inside ① What gets set up

Add a single row in the existing `What gets set up` sub-section:

```
① What gets set up
  In your devcontainer:       Python Development Tools
  In your local Kubernetes:   PostgreSQL (my_app_db)
  Schema applied to the DB:   config/init-database.sql
  CI + deployment:            GitHub Actions → Local Kubernetes via ArgoCD
```

Low-friction addition. Uses the existing sub-section renderer in `<TemplateEnvironment>`.

### 3. Architecture section — one Deployment sub-section per entry in `deployments[]`

Today `build-architecture-mermaid.ts` hardcodes the deploy flowchart (`GitHub Actions → ArgoCD → K8s`) and emits a single `### Deployment` sub-section. With multi-deployment templates this breaks visually: a Red Cross template has both `local-k8s-argocd` AND `azure-container-apps`, and each has a different deploy story (different CI, different registry, different runtime, different services).

**Locked structure** for the Architecture card on a multi-deployment template:

```
## Architecture
[intro: "auto-generated… click to enlarge"]

### Local development            ← per-template; same regardless of deploy target
  ▶ Components
  ▶ Flow

### Deployment — local-k8s-argocd ← one section per deployments[] entry
  ▶ Components
  ▶ Flow

### Deployment — azure-container-apps
  ▶ Components
  ▶ Flow
```

**Rules**:

1. **`### Local development` stays a single sub-section.** The local-dev story is "the developer runs the template inside DCT; the app talks to UIS-provisioned services in the local cluster" — that's the same regardless of which prod target the template ships to. One per template.
2. **`### Deployment — <target-id>` is one sub-section per entry in `deployments[]`.** Single-deployment templates show one section (e.g. today's `### Deployment — local-k8s-argocd`). Multi-deployment templates stack them in the order they appear in the array.
3. **Section title format**: `### Deployment — <target.name>` (using the target's human name from `deployment-targets.json`, not its ID). Single-deployment templates still get the explicit suffix — consistency matters more than visual brevity.
4. **Each section gets its own Components + Flow dropdowns.** Per-diagram dropdowns stay collapsed (per `PLAN-architecture-diagram-display`); reader expands the deployment they care about.
5. **Stack and overlay templates: no Deployment sections.** Stacks already use `### Overview`; overlays suppress the Architecture card entirely. Both unaffected.

**What this means for the diagram builder**:

The existing `ArchitectureModel` from `PLAN-architecture-diagram-display` already supports N sections — adding deployment-target sections is data, not new structure. But each new target needs its own per-target diagram builder pair (Components flowchart + Flow sequence diagram). For Track B's plan:

- Refactor today's `buildDeployFlowchart` / `buildDeploySequence` into a per-target dispatch keyed by `target.architecture_diagram_role` (currently hardcoded to local-K8s-ArgoCD; future values: `cloud-aca`, `cloud-aks`, `cloud-eks`, …)
- For Red Cross: write `buildAcaFlowchart` / `buildAcaSequence` showing `Azure DevOps → ACR (or GHCR) → az containerapp create → ACA → Azure Postgres Flexible Server` and the corresponding sequence
- The model's section iteration becomes: `for each entry in deployments[], pick the diagram pair via target.architecture_diagram_role, append a section`

**What this does NOT change**:

- Per-diagram zoom (`mermaid-zoom.ts` client module) — works the same whether there are 4, 6, or 8 diagrams on the page
- The dropdownBlock styling — same CSS class
- The intro sentence below `## Architecture` — same text

### 4. CI file dropdown inside the Architecture card

The Environment card already has an `Expected output` dropdown (shows what `dev-template configure` prints) and a `template-info.yaml` dropdown (shows the raw file). A parallel "**CI workflow**" dropdown in the Architecture card's Deployment sub-section — reading the content of the shipped `workflow_file` — would complete the story. Reader can inspect the exact yaml without opening the source.

---

## Validation

`scripts/validate-metadata.sh` should reject:

1. **`deployment.target` that doesn't exist in `deployment-targets.json`.** Hard error at registry-generation time.
2. **`deployment.ci_platform` that isn't in the target's `supported_ci_platforms` list.** Hard error.
3. **`deployment.workflow_file` pointing at a path that doesn't exist in the template directory.** Hard error — catches typos and broken migrations.
4. **Templates with `requires:` services but no `deployment:` block.** A template that depends on services is (almost) always an app template that needs a deployment target. Warning, not error — there may be legitimate exceptions.
5. **App templates missing the `deployment:` block entirely.** Warning — pushes contributors to be explicit, but allows gradual migration.

Stack and overlay templates correctly omit `deployment:` and the validator skips these checks.

---

## Migration / rollout

The existing 8 app templates already ship `.github/workflows/urbalurba-build-and-push.yaml` for the local-K8s-ArgoCD case. Migration is:

1. Add `deployment-targets.json` (wherever it lives per Q2) with a single entry: `local-k8s-argocd`.
2. For each of the 8 app templates, add the `deployment:` block to `template-info.yaml` with `target: local-k8s-argocd`, `ci_platform: github-actions`, and `workflow_file: .github/workflows/urbalurba-build-and-push.yaml`.
3. Ship the validator + registry generator updates.
4. Ship the rendering updates (Getting Started row; Environment card row; Architecture model consumes target).
5. Document in contributor docs.

Net effect: every existing template page gets a new `Deploys to: Local Kubernetes via ArgoCD` label without any content changing. Azure work starts after this baseline is in place.

**Stack templates (`postgresql-demo`) and overlays (`plan-based-workflow`)** skip the migration — they don't have a `deployment:` block and the schema doesn't require one.

---

## Decisions locked in (2026-04-16)

All seven blocking questions resolved through Round 3 discussion. Drove from "could ship later this year" to "schema needs to be ready before Red Cross goes live next week."

### Q1 — Deploy model: **Model A** (CI runs the deploy) ✅

Smallest new surface. Preserves today's `git push = deploy` UX for local-K8s. Cloud targets become "another CI template" (e.g. `az containerapp create` step in the workflow). No new orchestrator project needed.

### Q2 — Ownership: **UIS owns `deployment-targets.json` AND the per-target provisioning scripts** ✅

Reasoning evolved during discussion:

- Initial framing: split UIS (local) vs DCT (cloud, because `az login` is on the laptop). **Rejected** because UIS already ships scripts for AKS, Ubuntu-VM-K8s in Azure, and Raspberry-Pi K8s. UIS is already the cross-environment platform tool.
- Final split:
  - **DCT** = devcontainer + `az login` + the `dev-template configure` dispatcher. Provides the authenticated shell that UIS scripts execute within.
  - **UIS** = every "platform provisioner" — local-K8s-ArgoCD, AKS, Ubuntu-VM-K8s, RPi-K8s, **Azure Container Apps** (Red Cross). Picks up `az`/`kubectl` credentials from DCT's session.
  - **TMP (this repo)** = vendors UIS's `deployment-targets.json` like it already vendors `dct-tools.json` and `uis-services.json`.

Templates declare `deployment.target: <id>`; `dev-template configure --target <id>` shells into UIS, which dispatches to the right provisioner script. Same UX whether the target is local or cloud.

### Q3 — Azure timing: **imminent — Red Cross next week (Track A)** ✅

Red Cross deploys to Azure Container Apps, not AKS. ACA is its own primitive — no K8s manifests, no ArgoCD; deploy via `az containerapp create`. Different `(target, service)` provisioning per cloud (e.g. `(azure-container-apps, postgresql)` → `az postgres flexible-server create` + connection-string injection via `az containerapp secret set`).

### Track A vs Track B (the rollout strategy this drove)

The Red Cross deadline forces a split:

- **Track A — Red Cross unblock (this week, owned by UIS engineers)**: ship the Azure Container Apps provisioning scripts, wire `dev-template configure --target azure-container-apps` (or env var) for the specific Red Cross template. Hardcoded path. No schema work. Just enough code to deploy.
- **Track B — this investigation's plan (after Red Cross ships)**: take the working scripts as the reference implementation, retrofit the clean schema (`deployments[]` block, validator, registry generator, rendering across all templates), migrate existing 8 app templates explicitly.

This investigation's downstream plan **is Track B**. Track A is the engineers' workstream and lives outside this plan's scope.

### Q4 — CI template library granularity: **per-(target × CI-platform); `github-actions` + `azure-pipelines` at first ship** ✅

Map keyed by CI platform per target. The first ship needs **two** CI platforms because Red Cross's `azure-container-apps` entry runs on Azure Pipelines (their repo is Azure DevOps), while every other template's `local-k8s-argocd` entry runs on GitHub Actions. Update from earlier draft: this is no longer "github-actions only at first" — `azure-pipelines` is needed on day one.

### Q5 — `required_services` (target) vs `requires:` (template): **stay distinct** ✅

Two different concepts; keep them separate in the Environment card. `requires:` says what UIS services the app consumes (postgresql, redis); the target's `required_services` says what target-preparation services have to exist (ArgoCD for local-K8s; nothing for ACA).

### Q6 — Where do CI templates live if UIS owns them: **UIS hosts the CI template files alongside the JSON** ✅

UIS owns both `deployment-targets.json` and the CI template files referenced by `ci_templates[]`. TMP vendors both. Installer copies the chosen CI template into a new template's `.github/workflows/` at scaffolding time.

### Q7 — Validator depth: **Option A — file exists at declared path; that's it** ✅

No YAML parsing of workflow contents. If we ever need stronger CI-shape checks, that's a separate "CI lint" tool.

---

## Locked-in summary

- **Schema**: `deployments:` array of `{target, ci_platform, workflow_file}` objects, three required fields per entry. Always plural, even for templates with one entry. ✅
- **Model**: A (CI runs the deploy). ✅
- **Owner**: UIS owns `deployment-targets.json` + per-target provisioning scripts + CI template library. DCT provides the authenticated shell + `dev-template configure` dispatcher. TMP vendors. ✅
- **First two targets**: `local-k8s-argocd` (today's flow, all 8 app templates) + `azure-container-apps` (Red Cross). ✅
- **Migration**: every existing app template gets an explicit `deployments: [{target: local-k8s-argocd, ...}]` block. No implicit defaults. ✅
- **CI platforms (first ship)**: `github-actions` (for `local-k8s-argocd`) + `azure-pipelines` (for `azure-container-apps` / Red Cross). Two platforms from day one because the very first multi-target template needs both. ✅
- **Validator**: hard errors for unknown target / wrong ci_platform / missing workflow file. Warnings for missing `deployments:` on app templates. ✅
- **Rendering touchpoints**: Getting Started card "Deployment" sub-section + Environment card "CI + deployment" row + Architecture card emits **one `### Deployment — <target.name>` sub-section per entry in `deployments[]`** (each with its own Components + Flow dropdowns). Single-deployment templates still get the explicit `— <target.name>` suffix for consistency. ✅

---

## Next steps

- [x] User answered Q1 (Model A), Q2 (UIS-owns; DCT-dispatches), Q3 (Red Cross next week → Track A)
- [x] User reviewed Q4–Q7 and accepted the recommendations
- [ ] **Track A — Red Cross unblock (engineers, this week)**: ship UIS Azure Container Apps provisioning script + `dev-template configure --target azure-container-apps` dispatch. Outside this investigation's scope; the plan picks up after.
- [ ] **Track B — draft `PLAN-ci-and-deployment-targets.md` in `backlog/`** once Track A has shipped (so the schema is informed by what actually works for Red Cross, not by guesses)
- [ ] Expected phases in Track B's plan:
  - Phase 1: Schema + validator + `deployment-targets.json` with two entries: `local-k8s-argocd` and `azure-container-apps` (the latter pulled from whatever Track A produced)
  - Phase 2: Migrate the 8 app templates to declare `deployments: [{target: local-k8s-argocd, ...}]` explicitly; byte-identical pipeline output
  - Phase 3: Migrate the Red Cross template (or whichever template needs it) to add the second entry `{target: azure-container-apps, ...}`
  - Phase 4: Getting Started card new "Deployment" sub-section listing the array
  - Phase 5: Environment card "CI + deployment" row inside "What gets set up"
  - Phase 6: Architecture model emits one `### Deployment — <target.name>` sub-section per entry in `deployments[]`. Refactor today's hardcoded `buildDeployFlowchart` / `buildDeploySequence` into a per-target dispatch keyed by `target.architecture_diagram_role`. Add new `buildAcaFlowchart` / `buildAcaSequence` for the Azure Container Apps target.
  - Phase 7: Contributor docs + close-out
- [ ] After Track B ships: coordinate with UIS to move `deployment-targets.json` from TMP-vendored to UIS-canonical (per Q2)

---

## Glossary (for future readers)

- **GHCR** = GitHub Container Registry (`ghcr.io`). Where the existing `urbalurba-build-and-push.yaml` pushes images. Free for public repos. Per-cloud alternatives: ACR (Azure), ECR (AWS), GAR (Google).
- **ACA** = Azure Container Apps. Azure's serverless container platform — no K8s manifests, no kubectl. The Red Cross target.
- **AKS** = Azure Kubernetes Service. Different from ACA; full K8s cluster.
- **ArgoCD** = Pull-based GitOps tool that watches a Git repo and syncs changes into a K8s cluster. UIS provisions one in the local cluster for the `local-k8s-argocd` target.
- **GitHub Actions** = GitHub's CI service. Workflows live in `.github/workflows/*.yaml`. Used by all current templates for the `local-k8s-argocd` target.
- **Azure Pipelines / Azure DevOps** = Microsoft's CI service, hosted at `dev.azure.com`. Workflows live in `azure-pipelines.yml` at repo root (or `.azure-pipelines/<name>.yml` for multi-pipeline repos). Red Cross's CI platform — used for the `azure-container-apps` target.
