# Investigate: CI + Deployment Targets as First-Class Template Metadata

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Investigating — three blocking questions need answers (2026-04-15)

**Goal**: Make CI workflow + deployment target first-class fields in `template-info.yaml`, consumed by both documentation generators and actual deployment tooling, so that (a) the implicit `.github/workflows/` convention becomes explicit, (b) Azure and future deployment targets slot in without a schema rewrite, and (c) the template page renders a concrete "builds via X, deploys to Y" line instead of leaving the reader to guess.

**Last Updated**: 2026-04-15

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

## Field shape proposal (assumes Model A)

Add a new top-level block to `template-info.yaml`:

```yaml
deployment:
  target: local-k8s-argocd              # references deployment-targets.json
  ci_platform: github-actions           # must be in the target's supported_ci_platforms list
  workflow_file: .github/workflows/urbalurba-build-and-push.yaml
```

**Three fields**, all required when the block is present. The whole block is optional — stack and overlay templates omit it entirely.

**`target`** (string, required): the deployment target's ID, resolved against `deployment-targets.json` at registry generation time. Validation fails if the ID is unknown. The target's definition carries everything downstream tooling needs — supported CI platforms, required secrets, required prerequisite services, the docs URL, the CI template reference.

**`ci_platform`** (string, required): which CI platform this template uses. Must be one of the target's `supported_ci_platforms`. Today's only value is `github-actions`; future values are `azure-pipelines`, `gitlab-ci`, etc. A single target can support multiple CI platforms — e.g. `azure-aks` supports both `github-actions` and `azure-pipelines`.

**`workflow_file`** (string, required): literal path to the workflow file shipped in the template, relative to the template root. Docs render it; Dependabot finds it at `.github/workflows/` (GitHub Actions case); the registry generator can read its content for a future "show the workflow file" dropdown.

### Multi-CI vs multi-target

A single template could plausibly want to ship **multiple CI files** for multiple targets — one for local-K8s, one for Azure, so the same template works in both environments. Three ways to handle that:

- **Defer**: single `deployment:` block per template. A template that needs multi-target ships as two sibling templates (`python-webserver-local`, `python-webserver-azure`). Simpler schema; more templates.
- **Array**: `deployment:` becomes a list, one entry per supported target. Template authors pick the right one at install time. More schema, fewer templates.
- **Decouple**: one `deployment:` block with target OR `deployment_variants:` as an optional array for multi-target templates. Opt-in complexity.

**Recommendation: defer.** Start with a single block. If the multi-target need surfaces, evolve to the array shape in a backwards-compatible way (a single block is interpreted as an array of length 1).

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
      "id": "azure-aks",
      "name": "Azure Kubernetes Service",
      "description": "Build image, push to ACR, deploy to AKS via azure/k8s-deploy",
      "category": "cloud",
      "supported_ci_platforms": ["github-actions", "azure-pipelines"],
      "ci_templates": {
        "github-actions": "ci-templates/github-actions/azure-aks.yaml",
        "azure-pipelines": "ci-templates/azure-pipelines/aks.yaml"
      },
      "required_secrets": ["AZURE_CLIENT_ID", "AZURE_TENANT_ID", "AZURE_SUBSCRIPTION_ID"],
      "required_services": [],
      "setup_command": "dct configure azure",
      "setup_docs_url": "...",
      "architecture_diagram_role": "cloud-k8s"
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

### 3. Architecture section — target-specific deploy diagrams

This is where it gets interesting. Today `build-architecture-mermaid.ts` hardcodes the deploy flowchart: `GitHub Actions → ArgoCD → K8s`. With the target in the model, the deploy flowchart + sequence diagram become **target-specific** — a different pair for local-K8s, a different pair for Azure AKS, etc. The architecture model from `PLAN-architecture-diagram-display` is already extensible; adding "target-specific Deployment section" is a data-driven change in `buildArchitectureModel` that picks which diagrams to emit based on `entry.deployment.target`.

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

## Open questions

### Q1 — Which model runs the deploy? (A / B / C)

Decided on user input. My recommendation is **Model A** — smallest new surface, preserves today's local-K8s UX, leverages existing cloud-deploy actions. Model C becomes right when the target catalog grows past ~5 entries. Model B is probably wrong because it recreates the problem it's meant to solve.

### Q2 — Who owns `deployment-targets.json`?

Decided on user input. My recommendation is **Option 1 (UIS)** as the long-term home, **Option 3 (TMP)** as an acceptable start if the cross-project coordination isn't ready.

### Q3 — Is there a concrete Azure deployment in flight, or is "Azure" the canonical example of "a second target"?

This determines whether the downstream plan needs to actually ship an Azure target (and all the real-world Azure-specific details that come with it — OIDC auth, service principal management, ACR push, `azure/k8s-deploy` configuration) or whether we ship just the `local-k8s-argocd` target and use Azure only as the motivating example.

If Azure is imminent → the plan has a second phase that ships a working Azure target (real CI template, real setup docs, real smoke-test template).
If Azure is hypothetical → the plan ships the schema, the registry, and the first target (`local-k8s-argocd`), and leaves the second target for a follow-up.

### Q4 — Should the CI template library be per-target or per-(target × CI-platform)?

The registry schema shown above has `ci_templates` as a map keyed by CI platform. That means **one CI template per (target × CI-platform) pair**. If `azure-aks` supports both `github-actions` and `azure-pipelines`, we maintain two CI templates for it. That's the right call if both CI platforms are real users of the target; it's over-engineered if only one is.

Start with `github-actions` only. Add `azure-pipelines` support when a real template needs it. Same deferral principle as the multi-target question.

### Q5 — Does `required_services` from the target interact with `requires:` on the template?

Today a template declares what **UIS services** it consumes via `requires:` (postgresql, redis, etc.). The deployment target's `required_services` field above is different — it declares what **target-preparation services** have to exist (like ArgoCD itself, for local-K8s). These should probably be surfaced separately in the Environment card so the reader understands "this template needs PostgreSQL (runs in the cluster) AND ArgoCD (prepares the deploy path)".

Worth confirming the two concepts stay distinct, not merged.

### Q6 — Where do the CI templates actually live if UIS owns them?

If UIS owns `deployment-targets.json`, UIS also owns the CI template library referenced by `ci_templates[]`. TMP vendors both — the registry JSON and the CI template files. The installer copies a CI template into a new template's `.github/workflows/` at scaffolding time. Worth confirming this shape before UIS is asked to host files it doesn't today.

### Q7 — Does the validator check the shipped workflow file's contents?

Option A: validator only checks the file exists at the declared `workflow_file` path. Simple.
Option B: validator parses the YAML and confirms it looks like a GitHub Actions workflow (has `jobs:`, has an `on:` trigger, names a registry push action). Stronger guarantees, more maintenance.

Recommendation: **Option A for now.** Option B belongs in a separate "CI lint" tool if we ever need it.

---

## Tentative decisions (pending user confirmation)

- [ ] **Model**: A (CI runs the deploy)
- [ ] **Owner**: UIS long-term; TMP as acceptable starting point
- [ ] **First target**: `local-k8s-argocd` (mirrors today's behavior)
- [ ] **Multi-target per template**: deferred; single `deployment:` block
- [ ] **CI platform**: `github-actions` only at first
- [ ] **Validator**: hard errors for unknown target / wrong ci_platform / missing workflow file; warnings for missing `deployment:` block on app templates
- [ ] **Rendering touchpoints**: Getting Started card row + Environment card row + Architecture deploy diagrams driven by target

---

## Next steps

- [ ] User answers Q1 (model), Q2 (ownership), Q3 (Azure timing) — the three blocking decisions
- [ ] User reviews Q4–Q7 and either accepts the recommendations or pushes back
- [ ] Draft `PLAN-ci-and-deployment-targets.md` in `backlog/` with concrete phases once the decisions land
- [ ] Likely phases in the downstream plan:
  - Phase 1: Schema + validator + `deployment-targets.json` with the single `local-k8s-argocd` entry
  - Phase 2: Migrate the 8 app templates to declare the block explicitly; byte-identical pipeline output so nothing visible changes
  - Phase 3: Getting Started card new "Deployment target" row
  - Phase 4: Environment card "CI + deployment" row inside "What gets set up"
  - Phase 5: Architecture model consumes the target (deploy diagrams become target-specific)
  - Phase 6: Contributor docs + close-out
  - Phase 7 (conditional on Q3): second target (Azure AKS) — or filed as a separate follow-up plan
- [ ] After the plan ships: coordinate with UIS if Q2 answer is Option 1, to move `deployment-targets.json` to its canonical home
